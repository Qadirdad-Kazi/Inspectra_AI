import type { ModuleResult, StoreContext, StoreModule } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../../providers/helpers.js';

const NEGATIVE = [
  'crash', 'bug', 'broken', 'slow', 'ads', 'scam', 'refund', 'worst', 'hate', 'freeze',
  'login', 'paywall', 'spam', 'virus',
];
const POSITIVE = [
  'love', 'great', 'amazing', 'useful', 'best', 'fast', 'easy', 'helpful', 'perfect',
];

export const reviewsModule: StoreModule = {
  id: 'reviews',
  label: 'Review intelligence',
  weight: 0.18,
  analyze(ctx: StoreContext): ModuleResult {
    const { listing, reviews } = ctx;
    const findings: ModuleResult['findings'] = [];
    let score = 100;

    if (reviews.length === 0) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['rev', 'empty', listing.storeId]),
        title: 'No review corpus available',
        description:
          'Public review feed unavailable for this store/provider — intelligence limited to aggregate rating.',
        severity: 'info',
        category: 'reviews',
      }, 5);

      if ((listing.rating ?? 0) > 0 && (listing.rating ?? 0) < 4) {
        score = deduct(score, findings, {
          fingerprint: fingerprint(['rev', 'agg', listing.storeId]),
          title: 'Aggregate rating below 4.0',
          description: `Store rating ${listing.rating} with ${listing.ratingCount ?? 'n/a'} ratings.`,
          severity: 'medium',
          category: 'reviews',
        }, 10);
      }

      return {
        moduleId: 'reviews',
        label: 'Review intelligence',
        score: clampScore(score),
        weight: this.weight,
        findings,
        metrics: {
          sampleSize: 0,
          aggregateRating: listing.rating ?? null,
          ratingCount: listing.ratingCount ?? null,
        },
        summary: `Review intelligence ${clampScore(score)}/100 (aggregate-only).`,
      };
    }

    const avg =
      reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length);
    const low = reviews.filter((r) => r.rating <= 2);
    const themeCounts: Record<string, number> = {};
    for (const r of reviews) {
      const text = `${r.title ?? ''} ${r.text}`.toLowerCase();
      for (const word of NEGATIVE) {
        if (text.includes(word)) themeCounts[word] = (themeCounts[word] ?? 0) + 1;
      }
    }
    const topThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (avg < 3.5) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['rev', 'avg', listing.storeId]),
        title: 'Sampled review average is low',
        description: `Average of ${reviews.length} sampled reviews is ${avg.toFixed(2)}.`,
        severity: 'high',
        category: 'reviews',
      }, 15);
    }

    if (low.length / reviews.length > 0.35) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['rev', 'lowshare', listing.storeId]),
        title: 'High share of 1–2 star reviews in sample',
        description: `${low.length}/${reviews.length} sampled reviews are ≤2 stars.`,
        severity: 'medium',
        category: 'reviews',
      }, 10);
    }

    for (const [theme, count] of topThemes.slice(0, 3)) {
      findings.push({
        fingerprint: fingerprint(['rev', 'theme', listing.storeId, theme]),
        title: `Recurring review theme: "${theme}"`,
        description: `Appeared in ${count} sampled review(s). Observational only — no fix suggestions in this phase.`,
        severity: 'info',
        category: 'reviews',
      });
    }

    const positiveHits = reviews.filter((r) =>
      POSITIVE.some((w) => `${r.title ?? ''} ${r.text}`.toLowerCase().includes(w)),
    ).length;

    return {
      moduleId: 'reviews',
      label: 'Review intelligence',
      score: clampScore(score),
      weight: this.weight,
      findings,
      metrics: {
        sampleSize: reviews.length,
        sampleAverage: Number(avg.toFixed(2)),
        lowStarShare: Number((low.length / reviews.length).toFixed(2)),
        positiveMentions: positiveHits,
        aggregateRating: listing.rating ?? null,
      },
      insights: { topNegativeThemes: topThemes },
      summary: `Review intelligence ${clampScore(score)}/100 across ${reviews.length} samples.`,
    };
  },
};
