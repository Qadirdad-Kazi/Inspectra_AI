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
        title: 'Store screenshots could not be loaded',
        description:
          'We could not pull screenshot URLs from this listing scrape. That usually means a marketing/website URL was audited, the store page blocked the fetch, or the listing truly has no frames. This is a data-collection gap — not a creative review of your real screenshots.',
        severity: 'critical',
        category: 'screenshots',
        remediation:
          'Re-run with the official Play / App Store / Microsoft Store product URL. If frames still missing, open the listing in a browser to confirm screenshots exist, then retry.',
      }, 40);
      return {
        moduleId: 'screenshots',
        label: 'Screenshots',
        score: clampScore(score),
        weight: this.weight,
        findings,
        metrics: { count: 0, scrapeFailed: true },
        summary: 'Screenshot review skipped — listing scrape returned zero frame URLs.',
      };
    }

    if (listing.screenshotUrls.length < 3) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['shot', 'few', listing.storeId]),
        title: 'Insufficient screenshot coverage',
        description: `Only ${listing.screenshotUrls.length} screenshot(s) detected on the listing. Stores typically show 5–8 strong frames.`,
        severity: 'medium',
        category: 'screenshots',
        remediation:
          'Add more store screenshots that show core value in the first three frames.',
      }, 12);
    }

    const observations = await observeScreenshots(listing.screenshotUrls);
    const visionEnabled = observations.some((o) => o.source === 'vision-llm');
    if (!visionEnabled) {
      findings.push({
        fingerprint: fingerprint(['shot', 'vision-off', listing.storeId]),
        title: 'AI vision not enabled for creative review',
        description:
          'Screenshot URLs were found, but no LLM vision provider is configured. Quality notes below are heuristic only — not a model looking at the images.',
        severity: 'info',
        category: 'screenshots',
        remediation:
          'Set OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY on the API (AI_PROVIDER=auto) and re-run for vision-backed observations.',
      });
    }

    const avgQuality =
      observations.reduce((s, o) => s + o.qualityScore, 0) /
      Math.max(1, observations.length);

    if (visionEnabled && avgQuality < 55) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['shot', 'quality', listing.storeId]),
        title: 'Screenshot creative quality concerns',
        description: `Average observational quality score ${Math.round(avgQuality)}/100 from vision review.`,
        severity: 'medium',
        category: 'screenshots',
        remediation:
          'Improve first-frame clarity: larger text, less clutter, one benefit per screenshot.',
      }, 10);
    }

    for (const obs of observations) {
      if (obs.source !== 'vision-llm') continue;
      for (const risk of obs.risks.slice(0, 2)) {
        findings.push({
          fingerprint: fingerprint(['shot', 'risk', listing.storeId, risk]),
          title: `Screenshot observation: ${risk}`,
          description: obs.observations.slice(0, 2).join(' '),
          severity: 'info',
          category: 'screenshots',
          location: obs.target,
          metadata: { source: obs.source },
          remediation: 'Review that frame on the live listing and tighten copy/layout if the observation holds.',
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
        visionEnabled,
      },
      insights: { observations },
      summary: visionEnabled
        ? `Screenshot module ${clampScore(score)}/100 (${observations.length} vision-reviewed).`
        : `Screenshot module ${clampScore(score)}/100 (${listing.screenshotUrls.length} URLs; vision disabled).`,
    };
  },
};
