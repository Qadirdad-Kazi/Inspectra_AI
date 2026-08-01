import type { ModuleResult, StoreContext, StoreModule } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../../providers/helpers.js';

export const metadataModule: StoreModule = {
  id: 'metadata',
  label: 'Metadata',
  weight: 0.18,
  analyze(ctx: StoreContext): ModuleResult {
    const { listing } = ctx;
    const findings: ModuleResult['findings'] = [];
    let score = 100;

    if (!listing.title || listing.title.length < 2) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['meta', 'title', listing.storeId]),
        title: 'Missing app title',
        description: 'Store listing has no usable title.',
        severity: 'critical',
        category: 'metadata',
      }, 30);
    } else if (listing.title.length > 30 && listing.platform === 'google_play') {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['meta', 'title-long', listing.storeId]),
        title: 'Title may truncate on Google Play',
        description: `Title is ${listing.title.length} characters (Play often truncates ~30).`,
        severity: 'low',
        category: 'metadata',
      }, 4);
    }

    if (!listing.developer || listing.developer === 'Unknown developer' || listing.developer === 'Unknown publisher') {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['meta', 'dev', listing.storeId]),
        title: 'Developer / publisher name unresolved',
        description: 'Could not extract a clear developer identity from the listing.',
        severity: 'medium',
        category: 'metadata',
      }, 10);
    }

    if (!listing.description || listing.description.length < 80) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['meta', 'desc', listing.storeId]),
        title: 'Description too short or missing',
        description: 'Full description should explain value proposition and features.',
        severity: 'high',
        category: 'metadata',
      }, 15);
    }

    if (!listing.category && !(listing.categories?.length)) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['meta', 'category', listing.storeId]),
        title: 'Category missing',
        description: 'Primary category helps discovery and ASO relevance.',
        severity: 'medium',
        category: 'metadata',
      }, 8);
    }

    if (!listing.iconUrl) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['meta', 'icon', listing.storeId]),
        title: 'Icon URL missing',
        description: 'Listing icon could not be resolved for analysis.',
        severity: 'high',
        category: 'metadata',
      }, 12);
    }

    if (listing.screenshotUrls.length === 0) {
      // Finding owned by screenshots module — avoid duplicate Priority Actions noise
      score = clampScore(score - 15);
    }

    if (!listing.privacyPolicyUrl && listing.platform !== 'microsoft_store') {
      // privacy often not in public APIs — info only when absent from known fields
      score = deduct(score, findings, {
        fingerprint: fingerprint(['meta', 'privacy', listing.storeId]),
        title: 'Privacy policy URL not detected',
        description: 'Could not find a privacy policy link in extracted metadata.',
        severity: 'info',
        category: 'metadata',
      }, 2);
    }

    return {
      moduleId: 'metadata',
      label: 'Metadata',
      score: clampScore(score),
      weight: this.weight,
      findings,
      metrics: {
        titleLength: listing.title.length,
        descriptionLength: listing.description.length,
        screenshotCount: listing.screenshotUrls.length,
        hasIcon: Boolean(listing.iconUrl),
        hasCategory: Boolean(listing.category || listing.categories?.length),
        platform: listing.platform,
      },
      summary: `Metadata completeness score ${clampScore(score)}/100.`,
    };
  },
};
