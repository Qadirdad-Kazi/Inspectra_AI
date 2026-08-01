export type EngineId =
  | 'seo'
  | 'performance'
  | 'accessibility'
  | 'security'
  | 'best_practices';

export type FindingDraft = {
  fingerprint: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: EngineId | string;
  location?: string;
  remediation?: string;
  evidenceRefs?: string[];
  metadata?: Record<string, unknown>;
};

export type CrawledPage = {
  url: string;
  status: number;
  contentType: string;
  html: string;
  headers: Record<string, string>;
  redirectedFrom?: string;
  bytes: number;
  ttfbMs: number;
  fetchedAt: string;
};

export type CrawlResult = {
  startUrl: string;
  origin: string;
  pages: CrawledPage[];
  blockedByRobots: string[];
  errors: Array<{ url: string; message: string }>;
  robotsTxt?: string;
  durationMs: number;
};

export type EngineResult = {
  engineId: EngineId;
  label: string;
  score: number;
  weight: number;
  findings: FindingDraft[];
  metrics: Record<string, number | string | boolean>;
  summary: string;
};

export type ScoreBreakdown = {
  overall: number;
  engines: Array<{
    engineId: EngineId;
    label: string;
    score: number;
    weight: number;
    contribution: number;
  }>;
  formula: string;
};

export type WebsiteAuditOutput = {
  crawl: CrawlResult;
  engines: EngineResult[];
  scores: ScoreBreakdown;
  findings: FindingDraft[];
  aiReport: {
    title: string;
    executiveSummary: string;
    recommendations: Array<{ priority: string; title: string; detail: string }>;
    generatedBy: 'template' | 'llm';
  };
};

export type WebsiteAuditOptions = {
  url: string;
  maxPages?: number;
  maxDepth?: number;
  requestDelayMs?: number;
  userAgent?: string;
  respectRobotsTxt?: boolean;
  engines?: EngineId[];
  onProgress?: (event: {
    stage: string;
    message: string;
    progress?: number;
  }) => void | Promise<void>;
};
