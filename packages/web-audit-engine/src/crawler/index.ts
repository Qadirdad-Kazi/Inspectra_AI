import type { CrawledPage, CrawlResult, WebsiteAuditOptions } from '../types/index.js';
import { assertPublicHttpUrl, isPublicHttpUrl } from '../ssrf.js';

type Robots = { isAllowed: (url: string, ua: string) => boolean | undefined };

/** Minimal robots.txt allow check — avoids flaky CJS interop with robots-parser. */
function parseRobots(robotsTxt: string): Robots {
  const lines = robotsTxt.split(/\r?\n/);
  const disallows: string[] = [];
  let inStar = false;
  for (const raw of lines) {
    const line = raw.split('#')[0]?.trim() ?? '';
    if (!line) continue;
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (/^user-agent$/i.test(key ?? '')) {
      inStar = value === '*';
      continue;
    }
    if (inStar && /^disallow$/i.test(key ?? '')) {
      if (value) disallows.push(value);
    }
  }
  return {
    isAllowed(url: string) {
      try {
        const path = new URL(url).pathname;
        for (const rule of disallows) {
          if (rule === '/') return false;
          if (path.startsWith(rule)) return false;
        }
        return true;
      } catch {
        return true;
      }
    },
  };
}

const DEFAULT_UA =
  'InspectraBot/1.0 (+https://inspectra.ai/bot; responsible crawl; contact: audits@inspectra.ai)';

function normalizeUrl(raw: string): URL {
  return new URL(assertPublicHttpUrl(raw));
}

function sameOrigin(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.host === b.host;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(
  url: string,
  userAgent: string,
): Promise<CrawledPage | { error: string }> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(20000),
    });

    // Manual redirect follow with SSRF re-check (max 5 hops)
    let current = res;
    let finalUrl = url;
    for (let hop = 0; hop < 5 && current.status >= 300 && current.status < 400; hop++) {
      const loc = current.headers.get('location');
      if (!loc) break;
      const next = new URL(loc, finalUrl).toString();
      if (!isPublicHttpUrl(next)) {
        return { error: `Blocked redirect to non-public URL` };
      }
      finalUrl = next;
      current = await fetch(finalUrl, {
        redirect: 'manual',
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(20000),
      });
    }

    const ttfbMs = Date.now() - started;
    const contentType = current.headers.get('content-type') ?? '';
    const buf = Buffer.from(await current.arrayBuffer());
    const headers: Record<string, string> = {};
    current.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const html = contentType.includes('text/html') ? buf.toString('utf8') : '';
    return {
      url: finalUrl,
      status: current.status,
      contentType,
      headers,
      html,
      bytes: buf.length,
      ttfbMs,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'fetch failed' };
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const re = /<a\s+[^>]*href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const abs = new URL(match[1]!, baseUrl);
      abs.hash = '';
      if (abs.protocol === 'http:' || abs.protocol === 'https:') {
        links.push(abs.toString());
      }
    } catch {
      /* ignore bad urls */
    }
  }
  return links;
}

export async function crawlWebsite(
  options: Pick<
    WebsiteAuditOptions,
    'url' | 'maxPages' | 'maxDepth' | 'requestDelayMs' | 'userAgent' | 'respectRobotsTxt' | 'onProgress'
  >,
): Promise<CrawlResult> {
  const start = normalizeUrl(options.url);
  const maxPages = options.maxPages ?? 20;
  const maxDepth = options.maxDepth ?? 2;
  const delay = options.requestDelayMs ?? 350;
  const userAgent = options.userAgent ?? DEFAULT_UA;
  const respectRobots = options.respectRobotsTxt ?? true;
  const startedAt = Date.now();

  let robots: Robots | undefined;
  let robotsTxt: string | undefined;
  const blockedByRobots: string[] = [];

  if (respectRobots) {
    try {
      const robotsUrl = new URL('/robots.txt', start.origin).toString();
      const res = await fetch(robotsUrl, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        robotsTxt = await res.text();
        robots = parseRobots(robotsTxt);
      }
    } catch {
      /* treat as allow-all when robots unreachable */
    }
  }

  const queue: Array<{ url: string; depth: number }> = [{ url: start.toString(), depth: 0 }];
  const seen = new Set<string>();
  const pages: CrawledPage[] = [];
  const errors: Array<{ url: string; message: string }> = [];

  await options.onProgress?.({
    stage: 'crawl',
    message: `Starting crawl of ${start.toString()}`,
    progress: 0.05,
  });

  while (queue.length > 0 && pages.length < maxPages) {
    const next = queue.shift()!;
    if (seen.has(next.url)) continue;
    seen.add(next.url);

    const target = new URL(next.url);
    if (!sameOrigin(start, target)) continue;

    if (robots && robots.isAllowed(next.url, userAgent) === false) {
      blockedByRobots.push(next.url);
      continue;
    }

    if (delay > 0 && pages.length > 0) await sleep(delay);

    const result = await fetchPage(next.url, userAgent);
    if ('error' in result) {
      errors.push({ url: next.url, message: result.error });
      continue;
    }

    pages.push(result);
    await options.onProgress?.({
      stage: 'crawl',
      message: `Fetched ${result.url} (${result.status})`,
      progress: Math.min(0.45, 0.05 + (pages.length / maxPages) * 0.4),
    });

    if (next.depth >= maxDepth || !result.html) continue;

    for (const link of extractLinks(result.html, result.url)) {
      if (!seen.has(link) && sameOrigin(start, new URL(link))) {
        queue.push({ url: link, depth: next.depth + 1 });
      }
    }
  }

  return {
    startUrl: start.toString(),
    origin: start.origin,
    pages,
    blockedByRobots,
    errors,
    robotsTxt,
    durationMs: Date.now() - startedAt,
  };
}
