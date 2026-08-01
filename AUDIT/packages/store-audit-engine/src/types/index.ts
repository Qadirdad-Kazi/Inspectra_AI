export type StorePlatform = 'google_play' | 'app_store' | 'microsoft_store';

export type StoreModuleId =
  | 'metadata'
  | 'aso'
  | 'screenshots'
  | 'icon'
  | 'reviews'
  | 'competitors';

export type FindingDraft = {
  fingerprint: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: StoreModuleId | string;
  location?: string;
  remediation?: string;
  evidenceRefs?: string[];
  metadata?: Record<string, unknown>;
};

export type StoreListing = {
  platform: StorePlatform;
  storeId: string;
  url: string;
  title: string;
  subtitle?: string;
  developer: string;
  description: string;
  shortDescription?: string;
  category?: string;
  categories?: string[];
  rating?: number;
  ratingCount?: number;
  installsText?: string;
  price?: string;
  free?: boolean;
  version?: string;
  updatedAt?: string;
  contentRating?: string;
  iconUrl?: string;
  screenshotUrls: string[];
  languages?: string[];
  sizeText?: string;
  permissions?: string[];
  privacyPolicyUrl?: string;
  supportUrl?: string;
  websiteUrl?: string;
  raw?: Record<string, unknown>;
};

export type StoreReview = {
  id: string;
  author?: string;
  rating: number;
  title?: string;
  text: string;
  date?: string;
  helpful?: number;
};

export type CompetitorListing = StoreListing & {
  reviewsSample?: StoreReview[];
};

export type StoreContext = {
  listing: StoreListing;
  reviews: StoreReview[];
  competitors: CompetitorListing[];
};

export type ModuleResult = {
  moduleId: StoreModuleId;
  label: string;
  score: number;
  weight: number;
  findings: FindingDraft[];
  metrics: Record<string, number | string | boolean | null>;
  summary: string;
  insights?: Record<string, unknown>;
};

export type ScoreBreakdown = {
  overall: number;
  modules: Array<{
    moduleId: StoreModuleId;
    label: string;
    score: number;
    weight: number;
    contribution: number;
  }>;
  formula: string;
};

export type StoreAuditReport = {
  title: string;
  executiveSummary: string;
  highlights: string[];
  risks: string[];
  /** Observational only — no AI fix suggestions in this phase. */
  observations: Array<{ area: string; note: string }>;
  generatedBy: 'template' | 'llm';
};

export type StoreAuditOutput = {
  platform: StorePlatform;
  context: StoreContext;
  modules: ModuleResult[];
  scores: ScoreBreakdown;
  findings: FindingDraft[];
  report: StoreAuditReport;
};

export type StoreAuditOptions = {
  platform: StorePlatform;
  /** Package id / App Store id / product id / store URL */
  identifier: string;
  country?: string;
  language?: string;
  competitorIds?: string[];
  modules?: StoreModuleId[];
  maxReviews?: number;
  onProgress?: (event: {
    stage: string;
    message: string;
    progress?: number;
  }) => void | Promise<void>;
};

export type StoreProvider = {
  id: StorePlatform;
  label: string;
  resolveIdentifier(input: string): { storeId: string; url: string };
  fetchListing(input: {
    storeId: string;
    country?: string;
    language?: string;
  }): Promise<StoreListing>;
  fetchReviews(input: {
    storeId: string;
    country?: string;
    language?: string;
    limit: number;
  }): Promise<StoreReview[]>;
};

export type StoreModule = {
  id: StoreModuleId;
  label: string;
  weight: number;
  analyze(ctx: StoreContext): Promise<ModuleResult> | ModuleResult;
};
