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
      const err = observation.error ?? 'no LLM vision provider configured';
      const looksUnconfigured = /LLM unavailable|not configured/i.test(err);
      findings.push({
        fingerprint: fingerprint(['icon', 'vision-off', listing.storeId]),
        title: looksUnconfigured
          ? 'AI vision not enabled for icon review'
          : 'AI vision call failed for icon',
        description: looksUnconfigured
          ? 'Icon URL resolved, but no LLM vision provider is configured on the API. Scores are heuristic only.'
          : `Icon URL resolved, but vision analysis failed (${err}). Scores are heuristic only.`,
        severity: 'info',
        category: 'icon',
        remediation: looksUnconfigured
          ? 'On the Render API service set OPENROUTER_API_KEY (or GEMINI/OPENAI), AI_DEFAULT_PROVIDER=auto (or openrouter), and ensure AI_PROVIDER is not stub. Re-deploy, then re-run.'
          : 'Check Render API logs for [store-vision] errors, verify model + credits, then re-run.',
      });
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
