import { crawlWebsite } from './crawler/index.js';
import { runSeoEngine } from './engines/seo/index.js';
import { runPerformanceEngine } from './engines/performance/index.js';
import { runAccessibilityEngine } from './engines/accessibility/index.js';
import { runSecurityEngine } from './engines/security/index.js';
import { runBestPracticesEngine } from './engines/best-practices/index.js';
import { computeScores } from './scoring/index.js';
import { buildAiReport, maybeEnrichWithLlm } from './report/index.js';
import type { EngineId, EngineResult, WebsiteAuditOptions, WebsiteAuditOutput } from './types/index.js';

const ALL_ENGINES: EngineId[] = [
  'seo',
  'performance',
  'accessibility',
  'security',
  'best_practices',
];

export async function runWebsiteAudit(
  options: WebsiteAuditOptions,
): Promise<WebsiteAuditOutput> {
  const selected = new Set(options.engines?.length ? options.engines : ALL_ENGINES);

  const crawl = await crawlWebsite(options);
  if (crawl.pages.length === 0) {
    throw new Error(
      `Crawl returned no pages for ${options.url}. ${crawl.errors[0]?.message ?? ''}`.trim(),
    );
  }

  await options.onProgress?.({
    stage: 'engines',
    message: 'Running modular audit engines',
    progress: 0.5,
  });

  const engines: EngineResult[] = [];
  const runners: Array<[EngineId, () => EngineResult]> = [
    ['seo', () => runSeoEngine(crawl)],
    ['performance', () => runPerformanceEngine(crawl)],
    ['accessibility', () => runAccessibilityEngine(crawl)],
    ['security', () => runSecurityEngine(crawl)],
    ['best_practices', () => runBestPracticesEngine(crawl)],
  ];

  for (const [id, run] of runners) {
    if (!selected.has(id)) continue;
    await options.onProgress?.({
      stage: id,
      message: `Running ${id} engine`,
      progress: 0.55 + engines.length * 0.07,
    });
    engines.push(run());
  }

  const scores = computeScores(engines);
  const findings = engines.flatMap((e) => e.findings);

  await options.onProgress?.({
    stage: 'report',
    message: 'Generating AI recommendations',
    progress: 0.92,
  });

  let aiReport = buildAiReport({
    url: crawl.startUrl,
    scores,
    engines,
    findings,
  });
  aiReport = await maybeEnrichWithLlm(aiReport, {
    url: crawl.startUrl,
    scores,
    findings,
  });

  await options.onProgress?.({
    stage: 'complete',
    message: 'Website audit complete',
    progress: 1,
  });

  return { crawl, engines, scores, findings, aiReport };
}

export * from './types/index.js';
export { crawlWebsite } from './crawler/index.js';
export { computeScores } from './scoring/index.js';
export { buildAiReport } from './report/index.js';
export { assertPublicHttpUrl, isPublicHttpUrl } from './ssrf.js';
