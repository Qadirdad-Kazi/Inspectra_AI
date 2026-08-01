import type { ModuleResult, StoreContext, StoreModule } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../../providers/helpers.js';
import { observeScreenshots } from '../../vision/index.js';

export const screenshotsModule: StoreModule = {
  id: 'screenshots',
  label: 'Screenshots',
  weight: 0.17,
  async analyze(ctx: StoreContext): Promise<ModuleResult> {
    const { listing } = ctx;
    const findings: ModuleResult['findings'] = [];
    let score = 100;

    if (listing.screenshotUrls.length === 0) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['shot', 'none', listing.storeId]),
        title: 'No screenshots to review',
        description:
          'Store listing scrape returned zero screenshot URLs. Re-run with a Play / App Store / Microsoft Store product URL (not a marketing website). If the store page clearly has screenshots, the scraper may have been blocked — try again after deploy.',
        severity: 'critical',
        category: 'screenshots',
        remediation:
          'Paste the official store listing URL and re-run the audit. Website audits do not extract store creative frames.',
      }, 40);
      return {
        moduleId: 'screenshots',
        label: 'Screenshots',
        score: clampScore(score),
        weight: this.weight,
        findings,
        metrics: { count: 0 },
        summary: 'Screenshot review skipped — none found.',
      };
    }

    if (listing.screenshotUrls.length < 3) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['shot', 'few', listing.storeId]),
        title: 'Insufficient screenshot coverage',
        description: `Only ${listing.screenshotUrls.length} screenshot(s) detected.`,
        severity: 'medium',
        category: 'screenshots',
      }, 12);
    }

    const observations = await observeScreenshots(listing.screenshotUrls);
    const avgQuality =
      observations.reduce((s, o) => s + o.qualityScore, 0) /
      Math.max(1, observations.length);

    if (avgQuality < 55) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['shot', 'quality', listing.storeId]),
        title: 'Screenshot creative quality concerns',
        description: `Average observational quality score ${Math.round(avgQuality)}/100.`,
        severity: 'medium',
        category: 'screenshots',
      }, 10);
    }

    for (const obs of observations) {
      for (const risk of obs.risks.slice(0, 2)) {
        findings.push({
          fingerprint: fingerprint(['shot', 'risk', listing.storeId, risk]),
          title: `Screenshot observation: ${risk}`,
          description: obs.observations.slice(0, 2).join(' '),
          severity: 'info',
          category: 'screenshots',
          location: obs.target,
          metadata: { source: obs.source },
        });
      }
    }

    return {
      moduleId: 'screenshots',
      label: 'Screenshots',
      score: clampScore(score),
      weight: this.weight,
      findings,
      metrics: {
        count: listing.screenshotUrls.length,
        reviewed: observations.length,
        avgQuality: Math.round(avgQuality),
        visionEnabled: observations.some((o) => o.source === 'vision-llm'),
      },
      insights: { observations },
      summary: `Screenshot module ${clampScore(score)}/100 (${observations.length} reviewed).`,
    };
  },
};
