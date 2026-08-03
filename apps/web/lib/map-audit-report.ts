import type { AuditReportModel, ReportFinding, ReportSurface } from '@/components/report/audit-report-view';

type Listing = {
  title?: string;
  developer?: string;
  url?: string;
  rating?: number | null;
  ratingCount?: number | null;
  category?: string | null;
  subtitle?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  iconUrl?: string | null;
  screenshotUrls?: string[];
  downloads?: string | null;
};

type ScoreRow = { label: string; score: number; weight: number; contribution: number };

type FindingLike = {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  remediation?: string | null;
};

type IntelligenceRec = {
  id: string;
  agentId: string;
  priority: string;
  title: string;
  summary: string;
  actions?: string[];
  technicalImpact?: { explanation: string };
};

export type AuditLike = {
  id?: string;
  status?: string;
  asset?: { identifier?: string; type?: string; name?: string };
  scores?: {
    overall?: number;
    engines?: ScoreRow[];
    modules?: ScoreRow[];
  } | null;
  listing?: Listing | null;
  aiReport?: {
    title?: string;
    executiveSummary?: string;
    recommendations?: Array<{ priority: string; title: string; detail: string }>;
  } | null;
  storeReport?: {
    title?: string;
    executiveSummary?: string;
    highlights?: string[];
  } | null;
  aiIntelligence?: {
    executiveSummary?: string;
    recommendations?: IntelligenceRec[];
  } | null;
  findings?: FindingLike[];
};

function surfaceStatus(score: number): ReportSurface['status'] {
  if (score >= 80) return 'strong';
  if (score >= 55) return 'needs_work';
  return 'weak';
}

function priorityToSeverity(p: string): string {
  const v = p.toLowerCase();
  if (v === 'critical' || v === 'p0') return 'critical';
  if (v === 'high' || v === 'p1') return 'high';
  if (v === 'medium' || v === 'p2') return 'medium';
  return 'low';
}

function impactFromPriority(p: string): number {
  const v = p.toLowerCase();
  if (v === 'critical' || v === 'p0') return 10;
  if (v === 'high' || v === 'p1') return 7;
  if (v === 'medium' || v === 'p2') return 4;
  return 2;
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

/** Collapse near-duplicate screenshot/ASO noise into one Priority Action. */
function dedupeFindings(items: ReportFinding[]): ReportFinding[] {
  const out: ReportFinding[] = [];
  let screenshotSlot: ReportFinding | null = null;

  for (const item of items) {
    const key = item.title.toLowerCase();
    const isScreenshotNoise =
      /screenshot/i.test(key) &&
      /(could not be loaded|no store|to review|found|for conversion|detected|missing|zero|scrape)/i.test(
        key + ' ' + item.description,
      );

    if (isScreenshotNoise && !/vision not enabled/i.test(key)) {
      if (
        !screenshotSlot ||
        (SEVERITY_RANK[item.severity.toLowerCase()] ?? 0) >
          (SEVERITY_RANK[screenshotSlot.severity.toLowerCase()] ?? 0)
      ) {
        screenshotSlot = {
          ...item,
          title: 'Store screenshots could not be loaded',
          description:
            item.description ||
            'Listing scrape returned zero screenshot URLs. This is a collection gap, not a creative critique of your real frames.',
          remediation: humanRemediation(item),
        };
      }
      continue;
    }

    out.push({
      ...item,
      remediation: humanRemediation(item),
    });
  }

  if (screenshotSlot) out.unshift(screenshotSlot);
  return out;
}

function humanRemediation(item: ReportFinding): string | null | undefined {
  const rem = item.remediation?.trim();
  if (!rem || /^Investigate and remediate:/i.test(rem)) return undefined;
  const stripped = rem.replace(/^Next step:\s*/i, '').trim();
  const desc = item.description?.trim();
  // Don't repeat the finding body as a "next step"
  if (!stripped || (desc && stripped.replace(/\.$/, '') === desc.replace(/\.$/, ''))) {
    return undefined;
  }
  return stripped;
}

export function mapAuditToReportModel(
  audit: AuditLike,
  findingsFallback: FindingLike[] = [],
): AuditReportModel {
  const running = audit.status
    ? !['succeeded', 'failed', 'cancelled'].includes(audit.status)
    : false;
  const scoreRows = audit.scores?.engines ?? audit.scores?.modules ?? [];
  const findingsSrc = findingsFallback.length ? findingsFallback : audit.findings ?? [];

  const surfaces: ReportSurface[] = scoreRows.map((row, i) => ({
    id: String(i),
    label: row.label,
    status: surfaceStatus(row.score),
    score: row.score,
    note: `Weight ${row.weight} · contribution ${row.contribution}`,
  }));

  const reportFindings: ReportFinding[] = [];
  if (audit.aiIntelligence?.recommendations?.length) {
    for (const r of audit.aiIntelligence.recommendations) {
      reportFindings.push({
        id: r.id,
        title: r.title,
        severity: priorityToSeverity(r.priority),
        category: r.agentId,
        description: r.summary,
        remediation: r.actions?.[0] ?? r.technicalImpact?.explanation,
        impactPoints: impactFromPriority(r.priority),
      });
    }
  } else if (audit.aiReport?.recommendations?.length) {
    for (const [i, r] of audit.aiReport.recommendations.entries()) {
      reportFindings.push({
        id: `ai-${i}`,
        title: r.title,
        severity: priorityToSeverity(r.priority),
        category: 'recommendation',
        description: r.detail,
        remediation: r.detail,
        impactPoints: impactFromPriority(r.priority),
      });
    }
  } else {
    for (const f of findingsSrc) {
      reportFindings.push({
        id: f.id,
        title: f.title,
        severity: f.severity,
        category: f.category,
        description: f.description,
        remediation: f.remediation,
        impactPoints:
          f.severity === 'critical' ? 10 : f.severity === 'high' ? 7 : f.severity === 'medium' ? 4 : 2,
      });
    }
  }

  const strengths: Array<{ title: string; detail: string }> = [];
  for (const h of audit.storeReport?.highlights?.slice(0, 4) ?? []) {
    strengths.push({ title: 'Listing highlight', detail: h });
  }
  for (const s of surfaces.filter((x) => x.status === 'strong').slice(0, 4)) {
    strengths.push({
      title: `${s.label} looks healthy`,
      detail: s.note ?? 'Above the quality bar.',
    });
  }

  const listing = audit.listing;
  const meta = [
    audit.asset?.type,
    listing?.category,
    listing?.rating != null
      ? `Rating ${listing.rating}${listing.ratingCount != null ? ` · ${listing.ratingCount}` : ''}`
      : null,
    listing?.downloads,
  ].filter(Boolean) as string[];

  return {
    title: listing?.title ?? audit.asset?.name ?? audit.asset?.identifier ?? 'Audit report',
    subtitle: audit.storeReport?.title ?? audit.aiReport?.title,
    targetLabel: audit.asset?.identifier,
    statusBadge: audit.status,
    score: audit.scores?.overall ?? null,
    summary:
      audit.aiIntelligence?.executiveSummary ??
      audit.storeReport?.executiveSummary ??
      audit.aiReport?.executiveSummary ??
      null,
    about: listing?.description ?? listing?.shortDescription ?? null,
    surfaces,
    findings: dedupeFindings(reportFindings),
    strengths,
    listing: {
      developer: listing?.developer,
      category: listing?.category,
      url: listing?.url,
      iconUrl: listing?.iconUrl,
      screenshotUrls: listing?.screenshotUrls,
      shortDescription: listing?.subtitle ?? listing?.shortDescription,
      meta,
    },
    running,
  };
}
