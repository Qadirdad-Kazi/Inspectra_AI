import type { ModuleResult, StoreContext, StoreModule } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../../providers/helpers.js';

const KEYWORD_STOP = new Set([
  'the', 'and', 'for', 'with', 'your', 'this', 'that', 'from', 'are', 'you', 'app', 'apps',
]);

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !KEYWORD_STOP.has(w));
}

export const asoModule: StoreModule = {
  id: 'aso',
  label: 'ASO',
  weight: 0.2,
  analyze(ctx: StoreContext): ModuleResult {
    const { listing } = ctx;
    const findings: ModuleResult['findings'] = [];
    let score = 100;

    const titleKw = keywords(listing.title);
    const descKw = keywords(listing.description);
    const overlap = titleKw.filter((k) => descKw.includes(k));

    if (titleKw.length < 2) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['aso', 'title-kw', listing.storeId]),
        title: 'Weak keyword presence in title',
        description: 'Titles should include primary searchable keywords without stuffing.',
        severity: 'medium',
        category: 'aso',
      }, 10);
    }

    if (listing.description.length < 300) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['aso', 'desc-len', listing.storeId]),
        title: 'Description under-optimized for ASO',
        description: `Description is ${listing.description.length} chars; richer copy improves keyword coverage.`,
        severity: 'medium',
        category: 'aso',
      }, 8);
    }

    if (overlap.length === 0 && titleKw.length > 0) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['aso', 'align', listing.storeId]),
        title: 'Title/description keyword mismatch',
        description: 'Primary title terms do not reappear early in the description.',
        severity: 'low',
        category: 'aso',
      }, 6);
    }

    if ((listing.rating ?? 0) > 0 && (listing.rating ?? 0) < 3.8) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['aso', 'rating', listing.storeId]),
        title: 'Rating may hurt conversion',
        description: `Average rating ${listing.rating} is below common ASO conversion thresholds (~4.0).`,
        severity: 'high',
        category: 'aso',
      }, 12);
    }

    if ((listing.ratingCount ?? 0) > 0 && (listing.ratingCount ?? 0) < 50) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['aso', 'social-proof', listing.storeId]),
        title: 'Low rating volume',
        description: `Only ${listing.ratingCount} ratings — social proof is limited.`,
        severity: 'low',
        category: 'aso',
      }, 5);
    }

    if (listing.screenshotUrls.length < 4) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['aso', 'screen-count', listing.storeId]),
        title: 'Few screenshots for conversion',
        description: `Found ${listing.screenshotUrls.length} screenshot(s); stores typically reward 5–8 strong frames.`,
        severity: 'medium',
        category: 'aso',
      }, 8);
    }

    const subtitleGap =
      listing.platform === 'app_store' && !(listing.subtitle && listing.subtitle.length > 0);
    if (subtitleGap) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['aso', 'subtitle', listing.storeId]),
        title: 'App Store subtitle unused',
        description: 'Subtitle is a high-value ASO field on iOS when available.',
        severity: 'info',
        category: 'aso',
      }, 3);
    }

    return {
      moduleId: 'aso',
      label: 'ASO',
      score: clampScore(score),
      weight: this.weight,
      findings,
      metrics: {
        titleKeywords: titleKw.length,
        descriptionKeywords: descKw.length,
        titleDescOverlap: overlap.length,
        rating: listing.rating ?? null,
        ratingCount: listing.ratingCount ?? null,
        screenshots: listing.screenshotUrls.length,
      },
      insights: {
        sampleTitleKeywords: titleKw.slice(0, 8),
        sampleOverlap: overlap.slice(0, 8),
      },
      summary: `ASO score ${clampScore(score)}/100 from listing keyword & conversion signals.`,
    };
  },
};
