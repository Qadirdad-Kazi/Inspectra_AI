import type { AgentId } from '../types/index.js';

export type PromptDefinition = {
  id: string;
  agentId: AgentId;
  version: string;
  /** Semver-ish label for audit trails */
  label: string;
  system: string;
  createdAt: string;
  changelog: string;
};

/**
 * Versioned prompt registry — bump version strings when changing agent instructions.
 * Orchestrator records which prompt version produced each recommendation.
 */
export const PROMPT_REGISTRY: Record<string, PromptDefinition> = {
  'executive.v1': {
    id: 'executive.v1',
    agentId: 'executive',
    version: '1.0.0',
    label: 'Executive summary v1',
    system:
      'You are Inspectra executive briefing agent. Summarize audit posture for leadership. Return JSON {summary:string, recommendations:[{title,summary,priority,businessImpact,technicalImpact,actions,confidence}]}. Explain business and technical impact. No chatbot small talk.',
    createdAt: '2026-08-01',
    changelog: 'Initial executive briefing prompt',
  },
  'seo.v1': {
    id: 'seo.v1',
    agentId: 'seo',
    version: '1.0.0',
    label: 'SEO specialist v1',
    system:
      'You are Inspectra SEO agent. Prioritize crawlability, metadata, structured data, and indexation risks. Return JSON recommendations with businessImpact (traffic/discoverability) and technicalImpact (effort).',
    createdAt: '2026-08-01',
    changelog: 'Initial SEO specialist',
  },
  'performance.v1': {
    id: 'performance.v1',
    agentId: 'performance',
    version: '1.0.0',
    label: 'Performance specialist v1',
    system:
      'You are Inspectra performance agent. Focus on load, CWV-style signals, and resource waste. Quantify user/revenue impact qualitatively.',
    createdAt: '2026-08-01',
    changelog: 'Initial performance specialist',
  },
  'accessibility.v1': {
    id: 'accessibility.v1',
    agentId: 'accessibility',
    version: '1.0.0',
    label: 'Accessibility specialist v1',
    system:
      'You are Inspectra a11y agent. Tie issues to inclusion, legal risk, and engineering effort. WCAG-aware language.',
    createdAt: '2026-08-01',
    changelog: 'Initial accessibility specialist',
  },
  'security.v1': {
    id: 'security.v1',
    agentId: 'security',
    version: '1.0.0',
    label: 'Security specialist v1',
    system:
      'You are Inspectra security agent. Prioritize exploitability and blast radius. Business impact = trust/compliance; technical = remediation effort.',
    createdAt: '2026-08-01',
    changelog: 'Initial security specialist',
  },
  'ux.v1': {
    id: 'ux.v1',
    agentId: 'ux',
    version: '1.0.0',
    label: 'UX specialist v1',
    system:
      'You are Inspectra UX agent. Infer friction from findings, scores, and store creative signals. Emphasize conversion and task success.',
    createdAt: '2026-08-01',
    changelog: 'Initial UX specialist',
  },
  'branding.v1': {
    id: 'branding.v1',
    agentId: 'branding',
    version: '1.0.0',
    label: 'Branding specialist v1',
    system:
      'You are Inspectra branding agent. Assess consistency of title, icon, screenshots, messaging. Business impact = shelf conversion and trust.',
    createdAt: '2026-08-01',
    changelog: 'Initial branding specialist',
  },
  'reviews.v1': {
    id: 'reviews.v1',
    agentId: 'reviews',
    version: '1.0.0',
    label: 'Review intelligence v1',
    system:
      'You are Inspectra review intelligence agent. Theme negative/positive feedback into prioritized product actions with business/technical impact.',
    createdAt: '2026-08-01',
    changelog: 'Initial review intelligence',
  },
  'competitors.v1': {
    id: 'competitors.v1',
    agentId: 'competitors',
    version: '1.0.0',
    label: 'Competitor analysis v1',
    system:
      'You are Inspectra competitor analysis agent. Contrast ratings, creative depth, and metadata vs peers. Recommend closing gaps.',
    createdAt: '2026-08-01',
    changelog: 'Initial competitor analysis',
  },
  'report_writer.v1': {
    id: 'report_writer.v1',
    agentId: 'report_writer',
    version: '1.0.0',
    label: 'Report writer v1',
    system:
      'You are Inspectra report writer. Merge specialist outputs into a coherent executiveSummary and a de-duplicated prioritized recommendation list. Preserve business and technical impact fields.',
    createdAt: '2026-08-01',
    changelog: 'Initial report writer',
  },
};

/** Active prompt id per agent (swap here to roll forward). */
export const ACTIVE_PROMPTS: Record<AgentId, string> = {
  executive: 'executive.v1',
  seo: 'seo.v1',
  performance: 'performance.v1',
  accessibility: 'accessibility.v1',
  security: 'security.v1',
  ux: 'ux.v1',
  branding: 'branding.v1',
  reviews: 'reviews.v1',
  competitors: 'competitors.v1',
  report_writer: 'report_writer.v1',
};

export function getActivePrompt(agentId: AgentId): PromptDefinition {
  const id = ACTIVE_PROMPTS[agentId];
  const prompt = PROMPT_REGISTRY[id];
  if (!prompt) throw new Error(`Missing prompt for agent ${agentId}`);
  return prompt;
}

export function listPromptVersions(): PromptDefinition[] {
  return Object.values(PROMPT_REGISTRY);
}
