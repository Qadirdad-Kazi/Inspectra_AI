import type { CrawlResult, EngineResult } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../helpers.js';

export function runPerformanceEngine(crawl: CrawlResult): EngineResult {
  const findings: EngineResult['findings'] = [];
  let score = 100;
  const page = crawl.pages[0];
  if (!page) {
    return {
      engineId: 'performance',
      label: 'Performance',
      score: 0,
      weight: 0.2,
      findings: [],
      metrics: {},
      summary: 'No pages for performance analysis.',
    };
  }

  const kb = page.bytes / 1024;
  if (page.ttfbMs > 800) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['perf', 'ttfb', page.url]),
      title: 'Slow server response (TTFB)',
      description: `Time to first byte was ${page.ttfbMs}ms (target < 800ms).`,
      severity: page.ttfbMs > 1500 ? 'high' : 'medium',
      category: 'performance',
      location: page.url,
      remediation: 'Enable caching/CDN, optimize origin compute, and compress responses.',
    }, page.ttfbMs > 1500 ? 20 : 10);
  }

  if (kb > 1500) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['perf', 'weight', page.url]),
      title: 'Large HTML document',
      description: `Primary document is ${kb.toFixed(0)} KiB (soft budget ~1500 KiB HTML).`,
      severity: 'medium',
      category: 'performance',
      location: page.url,
      remediation: 'Reduce SSR payload, defer non-critical HTML, and paginate heavy content.',
    }, 12);
  }

  const encoding = page.headers['content-encoding'] ?? '';
  if (!/gzip|br|deflate/i.test(encoding) && page.bytes > 1500) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['perf', 'compression', page.url]),
      title: 'Response not compressed',
      description: 'No Content-Encoding gzip/br detected for a non-trivial payload.',
      severity: 'medium',
      category: 'performance',
      location: page.url,
      remediation: 'Enable Brotli or gzip at the CDN/origin.',
    }, 10);
  }

  const cache = page.headers['cache-control'] ?? '';
  if (!cache) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['perf', 'cache', page.url]),
      title: 'Missing Cache-Control header',
      description: 'Caching headers help repeat visits and CDN edge hits.',
      severity: 'low',
      category: 'performance',
      location: page.url,
      remediation: 'Set Cache-Control for static assets and appropriate HTML policies.',
    }, 6);
  }

  const scriptCount = (page.html.match(/<script\b/gi) ?? []).length;
  if (scriptCount > 20) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['perf', 'scripts', page.url]),
      title: 'High script tag count',
      description: `Detected ${scriptCount} <script> tags on the primary page.`,
      severity: 'low',
      category: 'performance',
      location: page.url,
      remediation: 'Bundle/defer scripts and remove unused third-party tags.',
    }, 8);
  }

  const avgTtfb =
    crawl.pages.reduce((sum, p) => sum + p.ttfbMs, 0) / Math.max(1, crawl.pages.length);

  return {
    engineId: 'performance',
    label: 'Performance',
    score: clampScore(score),
    weight: 0.2,
    findings,
    metrics: {
      ttfbMs: page.ttfbMs,
      documentKiB: Number(kb.toFixed(1)),
      scriptTags: scriptCount,
      avgTtfbMs: Math.round(avgTtfb),
      pagesSampled: crawl.pages.length,
    },
    summary: `Performance score ${clampScore(score)}/100 (TTFB ${page.ttfbMs}ms).`,
  };
}
