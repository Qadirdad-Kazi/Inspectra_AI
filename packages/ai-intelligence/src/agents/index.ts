import type { AgentId, AgentResult, IntelligenceInput } from '../types/index.js';
import { getActivePrompt } from '../prompts/registry.js';
import { modelForAgent } from '../models/index.js';
import {
  type AgentContext,
  baseResult,
  findingsForCategories,
  fromFindings,
  makeRec,
  maybeEnrichAgent,
  scoreFor,
} from './helpers.js';

export type SpecialistAgent = {
  id: AgentId;
  label: string;
  /** Whether this agent applies to a given audit kind */
  appliesTo: (kind: IntelligenceInput['kind']) => boolean;
  run: (ctx: AgentContext) => Promise<AgentResult>;
};

function effortFromSeverity(
  s: string,
): 'xs' | 's' | 'm' | 'l' | 'xl' {
  if (s === 'critical' || s === 'high') return 'l';
  if (s === 'medium') return 'm';
  return 's';
}

export const executiveAgent: SpecialistAgent = {
  id: 'executive',
  label: 'Executive summary',
  appliesTo: () => true,
  async run(ctx) {
    const model = modelForAgent('executive', ctx.selection);
    const prompt = getActivePrompt('executive');
    const weak = [...ctx.input.scores.breakdown].sort((a, b) => a.score - b.score).slice(0, 3);
    const critical = ctx.input.findings.filter(
      (f) => f.severity === 'critical' || f.severity === 'high',
    ).length;

    const recs = [
      makeRec({
        agentId: 'executive',
        priority: critical > 0 ? 'high' : ctx.input.scores.overall < 70 ? 'medium' : 'info',
        title: 'Leadership briefing priorities',
        summary: `Overall score ${ctx.input.scores.overall}/100 with ${ctx.input.findings.length} findings (${critical} high/critical). Weakest areas: ${weak.map((w) => `${w.label} ${w.score}`).join(', ') || 'n/a'}.`,
        business: {
          level: critical > 0 ? 'high' : 'medium',
          explanation:
            'Leadership needs a clear sequence of investments that reduce risk and unlock growth.',
          estimatedBenefit:
            'Faster alignment on what to fund next quarter; fewer surprise regressions.',
        },
        technical: {
          level: 'medium',
          explanation: 'Use specialist agent outputs to staff engineering and content workstreams.',
          effort: 's',
        },
        actions: [
          'Review prioritized recommendations from specialist agents',
          'Assign owners to high/critical items within one sprint',
          'Re-audit after changes to measure score deltas',
        ],
        confidence: 0.85,
        model,
        promptVersion: prompt.id,
        tags: ['executive'],
      }),
    ];

    const heuristic = baseResult(
      'executive',
      'Executive summary',
      recs,
      model,
      `Executive posture for ${ctx.input.target.label}: ${ctx.input.scores.overall}/100.`,
    );

    return maybeEnrichAgent({
      ctx,
      agentId: 'executive',
      heuristic,
      userPayload: { weak, criticalCount: critical },
    });
  },
};

function domainAgent(opts: {
  id: AgentId;
  label: string;
  categories: string[];
  scoreIds: string[];
  appliesTo: SpecialistAgent['appliesTo'];
  businessBenefit: string;
}): SpecialistAgent {
  return {
    id: opts.id,
    label: opts.label,
    appliesTo: opts.appliesTo,
    async run(ctx) {
      const model = modelForAgent(opts.id, ctx.selection);
      const prompt = getActivePrompt(opts.id);
      const findings = findingsForCategories(ctx.input.findings, opts.categories);
      const score = scoreFor(ctx.input, opts.scoreIds);

      const recs = fromFindings({
        agentId: opts.id,
        findings,
        model,
        promptVersion: prompt.id,
        businessBenefit: opts.businessBenefit,
        mapTechnical: (f) => ({
          level: f.severity,
          explanation: f.remediation || `Technical work required in ${f.category}.`,
          effort: effortFromSeverity(f.severity),
        }),
      });

      if (score != null && score < 75 && recs.length === 0) {
        recs.push(
          makeRec({
            agentId: opts.id,
            priority: score < 50 ? 'high' : 'medium',
            title: `Improve ${opts.label.toLowerCase()} score (${score}/100)`,
            summary: `${opts.label} is below target. Deepen coverage and remediate top signals.`,
            business: {
              level: score < 50 ? 'high' : 'medium',
              explanation: opts.businessBenefit,
              estimatedBenefit: opts.businessBenefit,
            },
            technical: {
              level: 'medium',
              explanation: `Raise ${opts.label} module score through targeted fixes.`,
              effort: 'm',
            },
            actions: [`Prioritize the lowest-scoring checks in ${opts.label}`],
            model,
            promptVersion: prompt.id,
          }),
        );
      }

      const heuristic = baseResult(
        opts.id,
        opts.label,
        recs,
        model,
        recs.length
          ? `${opts.label}: ${recs.length} prioritized recommendation(s).`
          : `${opts.label}: no material issues detected.`,
      );
      heuristic.metrics = { score: score ?? null, findingCount: findings.length };

      return maybeEnrichAgent({
        ctx,
        agentId: opts.id,
        heuristic,
        userPayload: { findings: findings.slice(0, 12), score },
      });
    },
  };
}

export const seoAgent = domainAgent({
  id: 'seo',
  label: 'SEO',
  categories: ['seo'],
  scoreIds: ['seo'],
  appliesTo: (k) => k === 'website',
  businessBenefit: 'Better organic discoverability and qualified traffic.',
});

export const performanceAgent = domainAgent({
  id: 'performance',
  label: 'Performance',
  categories: ['performance'],
  scoreIds: ['performance'],
  appliesTo: (k) => k === 'website',
  businessBenefit: 'Faster experiences improve conversion and reduce bounce.',
});

export const accessibilityAgent = domainAgent({
  id: 'accessibility',
  label: 'Accessibility',
  categories: ['accessibility', 'a11y'],
  scoreIds: ['accessibility'],
  appliesTo: (k) => k === 'website',
  businessBenefit: 'Broader reach, lower legal risk, better usability for all users.',
});

export const securityAgent = domainAgent({
  id: 'security',
  label: 'Security',
  categories: ['security'],
  scoreIds: ['security'],
  appliesTo: (k) => k === 'website',
  businessBenefit: 'Reduced breach/compliance risk and stronger customer trust.',
});

export const uxAgent: SpecialistAgent = {
  id: 'ux',
  label: 'UX',
  appliesTo: () => true,
  async run(ctx) {
    const model = modelForAgent('ux', ctx.selection);
    const prompt = getActivePrompt('ux');
    const findings = findingsForCategories(ctx.input.findings, [
      'accessibility',
      'best_practices',
      'screenshots',
      'aso',
      'ux',
    ]);
    const recs = fromFindings({
      agentId: 'ux',
      findings,
      model,
      promptVersion: prompt.id,
      businessBenefit: 'Reduced friction and higher task completion / store conversion.',
      mapTechnical: (f) => ({
        level: f.severity,
        explanation: 'UX/content or front-end change likely required.',
        effort: effortFromSeverity(f.severity),
      }),
      limit: 4,
    });

    if (ctx.input.scores.overall < 80 && recs.length === 0) {
      recs.push(
        makeRec({
          agentId: 'ux',
          priority: 'medium',
          title: 'Run a focused UX pass on weakest modules',
          summary:
            'Overall score suggests friction remains. Pair analytics with listing/page creative review.',
          business: {
            level: 'medium',
            explanation: 'Unresolved UX debt suppresses conversion and retention.',
            estimatedBenefit: 'Clearer journeys and fewer abandoned sessions/installs.',
          },
          technical: {
            level: 'medium',
            explanation: 'Coordinate design + engineering on top friction points.',
            effort: 'm',
          },
          actions: [
            'Map top user journeys against failing checks',
            'Validate with session replay or store review themes',
          ],
          model,
          promptVersion: prompt.id,
        }),
      );
    }

    const heuristic = baseResult(
      'ux',
      'UX',
      recs,
      model,
      `UX agent produced ${recs.length} recommendation(s).`,
    );
    return maybeEnrichAgent({
      ctx,
      agentId: 'ux',
      heuristic,
      userPayload: { findings: findings.slice(0, 10), extras: ctx.input.extras },
    });
  },
};

export const brandingAgent: SpecialistAgent = {
  id: 'branding',
  label: 'Branding',
  appliesTo: (k) => k === 'store',
  async run(ctx) {
    const model = modelForAgent('branding', ctx.selection);
    const prompt = getActivePrompt('branding');
    const findings = findingsForCategories(ctx.input.findings, [
      'icon',
      'metadata',
      'branding',
    ]);
    const recs = fromFindings({
      agentId: 'branding',
      findings,
      model,
      promptVersion: prompt.id,
      businessBenefit: 'Stronger shelf presence and brand recognition at install time.',
      mapTechnical: (f) => ({
        level: f.severity,
        explanation: 'Creative/metadata updates in the store console.',
        effort: effortFromSeverity(f.severity),
      }),
    });

    const heuristic = baseResult(
      'branding',
      'Branding',
      recs,
      model,
      recs.length
        ? `Branding gaps identified (${recs.length}).`
        : 'Branding signals look coherent.',
    );
    return maybeEnrichAgent({
      ctx,
      agentId: 'branding',
      heuristic,
      userPayload: {
        findings: findings.slice(0, 10),
        listing: ctx.input.extras?.listing ?? null,
      },
    });
  },
};

export const reviewsAgent: SpecialistAgent = {
  id: 'reviews',
  label: 'Review intelligence',
  appliesTo: (k) => k === 'store',
  async run(ctx) {
    const model = modelForAgent('reviews', ctx.selection);
    const prompt = getActivePrompt('reviews');
    const findings = findingsForCategories(ctx.input.findings, ['reviews']);
    const recs = fromFindings({
      agentId: 'reviews',
      findings,
      model,
      promptVersion: prompt.id,
      businessBenefit: 'Higher ratings and fewer churn triggers from unresolved complaints.',
      mapTechnical: (f) => ({
        level: f.severity,
        explanation: 'May require product, support, or store-response work.',
        effort: effortFromSeverity(f.severity),
      }),
    });

    const heuristic = baseResult(
      'reviews',
      'Review intelligence',
      recs,
      model,
      `Review intelligence: ${recs.length} theme(s).`,
    );
    return maybeEnrichAgent({
      ctx,
      agentId: 'reviews',
      heuristic,
      userPayload: {
        findings: findings.slice(0, 12),
        reviewsExtra: ctx.input.extras?.reviews ?? null,
      },
    });
  },
};

export const competitorsAgent: SpecialistAgent = {
  id: 'competitors',
  label: 'Competitor analysis',
  appliesTo: (k) => k === 'store',
  async run(ctx) {
    const model = modelForAgent('competitors', ctx.selection);
    const prompt = getActivePrompt('competitors');
    const findings = findingsForCategories(ctx.input.findings, ['competitors']);
    const recs = fromFindings({
      agentId: 'competitors',
      findings,
      model,
      promptVersion: prompt.id,
      businessBenefit: 'Close competitive gaps that suppress install share.',
      mapTechnical: (f) => ({
        level: f.severity,
        explanation: 'ASO/creative and possibly product parity work.',
        effort: effortFromSeverity(f.severity),
      }),
    });

    if (!recs.length) {
      recs.push(
        makeRec({
          agentId: 'competitors',
          priority: 'info',
          title: 'Keep a living competitor set',
          summary:
            'Supply competitor store IDs on each audit to unlock comparative ASO and rating intelligence.',
          business: {
            level: 'low',
            explanation: 'Without peers, relative market position stays opaque.',
            estimatedBenefit: 'Clearer roadmap bets against category leaders.',
          },
          technical: {
            level: 'info',
            explanation: 'Configuration-only: pass competitorIds in audit config.',
            effort: 'xs',
          },
          actions: ['Add 2–5 peer store IDs on the next audit'],
          model,
          promptVersion: prompt.id,
        }),
      );
    }

    const heuristic = baseResult(
      'competitors',
      'Competitor analysis',
      recs,
      model,
      `Competitor agent: ${recs.length} recommendation(s).`,
    );
    return maybeEnrichAgent({
      ctx,
      agentId: 'competitors',
      heuristic,
      userPayload: {
        findings: findings.slice(0, 10),
        competitors: ctx.input.extras?.competitors ?? null,
      },
    });
  },
};

export const reportWriterAgent: SpecialistAgent = {
  id: 'report_writer',
  label: 'Report writer',
  appliesTo: () => true,
  async run(ctx) {
    // Report writer is invoked separately by orchestrator with peer results.
    const model = modelForAgent('report_writer', ctx.selection);
    return baseResult(
      'report_writer',
      'Report writer',
      [],
      model,
      'Report writer synthesizes peer agent outputs.',
    );
  },
};

export const AGENT_REGISTRY: SpecialistAgent[] = [
  executiveAgent,
  seoAgent,
  performanceAgent,
  accessibilityAgent,
  securityAgent,
  uxAgent,
  brandingAgent,
  reviewsAgent,
  competitorsAgent,
  reportWriterAgent,
];

export function agentsForKind(
  kind: IntelligenceInput['kind'],
  selected?: AgentId[],
): SpecialistAgent[] {
  const set = selected?.length ? new Set(selected) : null;
  return AGENT_REGISTRY.filter((a) => a.id !== 'report_writer')
    .filter((a) => a.appliesTo(kind))
    .filter((a) => (set ? set.has(a.id) : true));
}
