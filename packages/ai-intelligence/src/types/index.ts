export type AuditKind = 'website' | 'store';

export type AgentId =
  | 'executive'
  | 'seo'
  | 'performance'
  | 'accessibility'
  | 'security'
  | 'ux'
  | 'branding'
  | 'reviews'
  | 'competitors'
  | 'report_writer';

export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Priority = ImpactLevel;

export type FindingRef = {
  fingerprint: string;
  title: string;
  description: string;
  severity: ImpactLevel;
  category: string;
  location?: string;
  remediation?: string;
};

export type ScoreSlice = {
  id: string;
  label: string;
  score: number;
  weight: number;
};

export type Recommendation = {
  id: string;
  agentId: AgentId;
  priority: Priority;
  title: string;
  summary: string;
  businessImpact: {
    level: ImpactLevel;
    explanation: string;
    /** Qualitative benefit if addressed (conversion, trust, risk reduction). */
    estimatedBenefit: string;
  };
  technicalImpact: {
    level: ImpactLevel;
    explanation: string;
    /** Rough effort band for engineering. */
    effort: 'xs' | 's' | 'm' | 'l' | 'xl';
  };
  actions: string[];
  relatedFindings: string[];
  confidence: number;
  promptVersion: string;
  model: string;
  tags?: string[];
};

export type AgentResult = {
  agentId: AgentId;
  label: string;
  summary: string;
  recommendations: Recommendation[];
  promptVersion: string;
  model: string;
  generatedBy: 'heuristic' | 'llm' | 'hybrid';
  metrics?: Record<string, number | string | boolean | null>;
};

export type MemoryKind =
  | 'insight'
  | 'preference'
  | 'prior_recommendation'
  | 'finding_pattern'
  | 'asset_context';

export type MemoryEntry = {
  id?: string;
  organizationId: string;
  assetId?: string | null;
  auditId?: string | null;
  key: string;
  kind: MemoryKind;
  content: Record<string, unknown>;
  promptVersion?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
};

export type AiMemoryStore = {
  list(input: {
    organizationId: string;
    assetId?: string;
    kinds?: MemoryKind[];
    limit?: number;
  }): Promise<MemoryEntry[]>;
  put(entry: Omit<MemoryEntry, 'id' | 'createdAt'> & { id?: string }): Promise<MemoryEntry>;
};

export type ModelSelectionConfig = {
  /** Default chat model */
  defaultModel?: string;
  /** Per-agent overrides */
  agentModels?: Partial<Record<AgentId, string>>;
  temperature?: number;
  maxTokens?: number;
  provider?: 'openai' | 'openrouter' | 'gemini' | 'none';
};

export type IntelligenceInput = {
  kind: AuditKind;
  organizationId: string;
  assetId: string;
  auditId: string;
  target: {
    label: string;
    url?: string;
    platform?: string;
  };
  scores: {
    overall: number;
    breakdown: ScoreSlice[];
    formula?: string;
  };
  findings: FindingRef[];
  /** Optional extras: listing, reviews, crawl, storeReport, engines/modules */
  extras?: Record<string, unknown>;
  memory?: AiMemoryStore;
  modelConfig?: ModelSelectionConfig;
  /** Subset of agents; defaults by audit kind */
  agents?: AgentId[];
  /** Allow LLM enrichment when API key present (default true) */
  enableLlm?: boolean;
  onProgress?: (event: {
    stage: string;
    message: string;
    progress?: number;
  }) => void | Promise<void>;
};

export type IntelligenceOutput = {
  executiveSummary: string;
  recommendations: Recommendation[];
  agents: AgentResult[];
  memoryWritten: Array<{ key: string; kind: MemoryKind }>;
  modelSelection: {
    provider: string;
    defaultModel: string;
    agentModels: Partial<Record<AgentId, string>>;
    llmUsed: boolean;
  };
  promptVersions: Record<string, string>;
  generatedBy: 'heuristic' | 'llm' | 'hybrid';
  /** Legacy-compatible slim report for existing UI cards */
  legacyReport: {
    title: string;
    executiveSummary: string;
    recommendations: Array<{ priority: string; title: string; detail: string }>;
    generatedBy: 'template' | 'llm';
  };
};
