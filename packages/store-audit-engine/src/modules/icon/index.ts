import type { ModuleResult, StoreContext, StoreModule } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../../providers/helpers.js';
import { observeIcon } from '../../vision/index.js';

export const iconModule: StoreModule = {
  id: 'icon',
  label: 'Icon',
  weight: 0.12,
  async analyze(ctx: StoreContext): Promise<ModuleResult> {
    const { listing } = ctx;
    const findings: ModuleResult['findings'] = [];
    let score = 100;

    if (!listing.iconUrl) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['icon', 'missing', listing.storeId]),
        title: 'App icon missing',
        description: 'No icon URL available for analysis.',
        severity: 'critical',
        category: 'icon',
      }, 40);
      return {
        moduleId: 'icon',
        label: 'Icon',
        score: clampScore(score),
        weight: this.weight,
        findings,
        metrics: { hasIcon: false },
        summary: 'Icon analysis unavailable.',
      };
    }

    const observation = await observeIcon(listing.iconUrl);
    if (observation.source !== 'vision-llm') {
      const err = observation.error ?? 'vision unavailable';
      const looksUnconfigured = /LLM unavailable|not configured/i.test(err);
      // Customer-facing only — never leak env keys / deploy runbooks into reports.
      if (!looksUnconfigured) {
        findings.push({
          fingerprint: fingerprint(['icon', 'vision-off', listing.storeId]),
          title: 'AI icon review unavailable',
          description:
            'Icon was found, but automated visual review could not complete. Icon scores use listing heuristics only.',
          severity: 'info',
          category: 'icon',
          remediation: 'Re-run the audit later. If this keeps happening, contact support.',
        });
      }
    }

    if (observation.source === 'vision-llm' && observation.qualityScore < 50) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['icon', 'quality', listing.storeId]),
        title: 'Icon observational quality is low',
        description: observation.observations.join(' '),
        severity: 'medium',
        category: 'icon',
        metadata: { source: observation.source },
        remediation: 'Simplify the icon: stronger silhouette, higher contrast, fewer fine details.',
      }, 12);
    }

    if (observation.source === 'vision-llm') {
      for (const risk of observation.risks.slice(0, 3)) {
        findings.push({
          fingerprint: fingerprint(['icon', 'risk', listing.storeId, risk]),
          title: `Icon observation: ${risk}`,
          description: observation.observations[0] ?? risk,
          severity: 'info',
          category: 'icon',
          metadata: { source: observation.source },
          remediation: 'Compare against top peers in your category and tighten recognizability.',
        });
      }
    }

    // Structural heuristic: very long query strings sometimes indicate tiny thumbs
    if (/[=]s\d{2,3}[-]|w\d{2}(-|$)/i.test(listing.iconUrl)) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['icon', 'thumb', listing.storeId]),
        title: 'Icon URL may point to a small thumbnail',
        description: 'Resolved icon URL appears resized; verify full-resolution asset in console.',
        severity: 'low',
        category: 'icon',
      }, 4);
    }

    return {
      moduleId: 'icon',
      label: 'Icon',
      score: clampScore(score),
      weight: this.weight,
      findings,
      metrics: {
        hasIcon: true,
        qualityScore: observation.qualityScore,
        visionEnabled: observation.source === 'vision-llm',
      },
      insights: { observation },
      summary: `Icon module ${clampScore(score)}/100 (${observation.source}).`,
    };
  },
};
