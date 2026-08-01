export type ReportFormat = 'json' | 'html' | 'csv' | 'sarif' | 'pdf';

export type EffortBand = 'xs' | 's' | 'm' | 'l' | 'xl';

export type CategoryScore = {
  id: string;
  label: string;
  score: number;
  weight: number;
  contribution?: number;
};

export type ReportRecommendation = {
  id?: string;
  priority: string;
  title: string;
  summary: string;
  businessImpact?: {
    level: string;
    explanation: string;
    estimatedBenefit?: string;
  };
  technicalImpact?: {
    level: string;
    explanation: string;
    effort?: EffortBand | string;
  };
  actions?: string[];
  effort?: EffortBand | string;
  agentId?: string;
};

export type ReportFinding = {
  fingerprint: string;
  title: string;
  severity: string;
  category: string;
  description?: string;
  location?: string;
  remediation?: string;
};

export type ReportBuilderInput = {
  title?: string;
  organizationName?: string;
  target: {
    label: string;
    type?: string;
    identifier?: string;
    url?: string;
    platform?: string;
  };
  auditId: string;
  overallScore: number;
  formula?: string;
  categoryScores: CategoryScore[];
  executiveSummary?: string;
  recommendations?: ReportRecommendation[];
  findings?: ReportFinding[];
  highlights?: string[];
  risks?: string[];
  generatedBy?: string;
  extras?: Record<string, unknown>;
};

export type ProfessionalReport = {
  schemaVersion: 'inspectra.report.v1';
  title: string;
  generatedAt: string;
  organizationName?: string;
  target: ReportBuilderInput['target'];
  auditId: string;
  executiveSummary: string;
  overallScore: number;
  formula?: string;
  categoryScores: CategoryScore[];
  recommendations: Array<
    ReportRecommendation & {
      effortEstimate: EffortBand | string;
      effortHoursHint: string;
    }
  >;
  effortSummary: {
    totalItems: number;
    byEffort: Record<string, number>;
    estimatedHoursRange: string;
  };
  findingsSummary: {
    total: number;
    bySeverity: Record<string, number>;
    top: ReportFinding[];
  };
  highlights: string[];
  risks: string[];
  generatedBy: string;
  extras?: Record<string, unknown>;
};

export type ExportResult = {
  format: ReportFormat;
  contentType: string;
  filename: string;
  body: string | Buffer;
  byteSize: number;
};
