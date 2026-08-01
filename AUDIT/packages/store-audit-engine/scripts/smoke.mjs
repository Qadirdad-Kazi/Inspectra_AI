import { runStoreAudit } from '../dist/index.js';

const platform = process.argv[2] || 'app_store';
const identifier = process.argv[3] || '284882215';
const competitors = process.argv.slice(4);

console.log(`Running store audit: ${platform} / ${identifier}`);

const result = await runStoreAudit({
  platform,
  identifier,
  competitorIds: competitors.length ? competitors : undefined,
  maxReviews: 15,
  onProgress: (e) => console.log(`  [${e.stage}] ${e.message}`),
});

console.log('\nOverall:', result.scores.overall);
for (const m of result.scores.modules) {
  console.log(`  ${m.label}: ${m.score} (w=${m.weight})`);
}
console.log('Findings:', result.findings.length);
console.log('Report:', result.report.executiveSummary.slice(0, 240) + '…');
