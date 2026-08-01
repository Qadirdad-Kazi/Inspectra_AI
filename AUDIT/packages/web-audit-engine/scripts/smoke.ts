import { crawlWebsite } from '../src/crawler/index.js';
import { runWebsiteAudit } from '../src/index.js';

void (async () => {
  // Lightweight smoke when run manually: pnpm --filter @inspectra/web-audit-engine exec tsx scripts/smoke.ts
  const result = await runWebsiteAudit({
    url: process.env.SMOKE_URL ?? 'https://example.com',
    maxPages: 3,
    maxDepth: 1,
    requestDelayMs: 200,
  });
  console.log(
    JSON.stringify(
      {
        overall: result.scores.overall,
        pages: result.crawl.pages.length,
        findings: result.findings.length,
        engines: result.engines.map((e) => ({ id: e.engineId, score: e.score })),
      },
      null,
      2,
    ),
  );
  void crawlWebsite;
})();
