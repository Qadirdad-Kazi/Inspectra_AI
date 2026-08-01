import type { ModuleResult, StoreContext, StoreModule } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../../providers/helpers.js';

export const competitorsModule: StoreModule = {
  id: 'competitors',
  label: 'Competitor comparison',
  weight: 0.15,
  analyze(ctx: StoreContext): ModuleResult {
    const { listing, competitors } = ctx;
    const findings: ModuleResult['findings'] = [];
    let score = 100;

    if (competitors.length === 0) {
      return {
        moduleId: 'competitors',
        label: 'Competitor comparison',
        score: 70,
        weight: this.weight,
        findings: [
          {
            fingerprint: fingerprint(['comp', 'none', listing.storeId]),
            title: 'No competitors supplied',
            description:
              'Pass competitorIds in the audit config to unlock comparative ASO/rating analysis.',
            severity: 'info',
            category: 'competitors',
          },
        ],
        metrics: { competitorCount: 0 },
        summary: 'Competitor module idle — provide competitor store IDs to compare.',
      };
    }

    const ratings = competitors
      .map((c) => c.rating)
      .filter((r): r is number => typeof r === 'number');
    const avgComp =
      ratings.reduce((s, r) => s + r, 0) / Math.max(1, ratings.length);
    const myRating = listing.rating ?? 0;

    if (myRating && avgComp && myRating + 0.15 < avgComp) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['comp', 'rating-gap', listing.storeId]),
        title: 'Rating trails competitor set',
        description: `Your rating ${myRating.toFixed(2)} vs competitor average ${avgComp.toFixed(2)}.`,
        severity: 'medium',
        category: 'competitors',
      }, 12);
    }

    const myScreens = listing.screenshotUrls.length;
    const avgScreens =
      competitors.reduce((s, c) => s + c.screenshotUrls.length, 0) /
      Math.max(1, competitors.length);
    if (myScreens + 1 < avgScreens) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['comp', 'screens', listing.storeId]),
        title: 'Fewer screenshots than peers',
        description: `You have ${myScreens}; competitor average is ${avgScreens.toFixed(1)}.`,
        severity: 'low',
        category: 'competitors',
      }, 6);
    }

    const myDesc = listing.description.length;
    const avgDesc =
      competitors.reduce((s, c) => s + c.description.length, 0) /
      Math.max(1, competitors.length);
    if (myDesc + 100 < avgDesc) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['comp', 'desc', listing.storeId]),
        title: 'Shorter description than peers',
        description: `Your description ${myDesc} chars vs peer average ${Math.round(avgDesc)}.`,
        severity: 'low',
        category: 'competitors',
      }, 5);
    }

    const peerTable = competitors.map((c) => ({
      storeId: c.storeId,
      title: c.title,
      rating: c.rating ?? null,
      screenshots: c.screenshotUrls.length,
      descriptionLength: c.description.length,
    }));

    return {
      moduleId: 'competitors',
      label: 'Competitor comparison',
      score: clampScore(score),
      weight: this.weight,
      findings,
      metrics: {
        competitorCount: competitors.length,
        myRating: listing.rating ?? null,
        competitorAvgRating: ratings.length ? Number(avgComp.toFixed(2)) : null,
        myScreenshots: myScreens,
        competitorAvgScreenshots: Number(avgScreens.toFixed(1)),
      },
      insights: { peers: peerTable },
      summary: `Competitor comparison ${clampScore(score)}/100 across ${competitors.length} peer(s).`,
    };
  },
};
