import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  JobStatus,
  JobType,
  Prisma,
  ReportFormat,
  ReportStatus,
} from '@inspectra/db';
import {
  buildProfessionalReport,
  checksumSha256,
  exportReport,
  type ProfessionalReport,
  type ReportFormat as EngineFormat,
} from '@inspectra/report-engine';
import { PrismaService } from '../../prisma/prisma.service';
import { toPaginationMeta } from '../../common/dto/pagination-query.dto';
import { WorkflowLoggerService } from '../../common/workflow/workflow-logger.service';
import type { CreateReportDto, ListReportsQueryDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowLoggerService,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateReportDto) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: dto.auditId, organizationId },
      include: {
        asset: true,
        findings: { take: 200, orderBy: { severity: 'asc' } },
        organization: true,
      },
    });
    if (!audit) {
      throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit not found' });
    }

    const report = await this.prisma.report.create({
      data: {
        organizationId,
        auditId: audit.id,
        format: dto.format as ReportFormat,
        status: ReportStatus.generating,
        title: dto.title || `Report — ${audit.asset.name}`,
        requestedById: userId,
      },
    });

    const job = await this.prisma.jobRun.create({
      data: {
        organizationId,
        type: JobType.generate_report,
        status: JobStatus.active,
        queueName: 'reports',
        auditId: audit.id,
        reportId: report.id,
        requestedById: userId,
        startedAt: new Date(),
        input: { format: dto.format, title: dto.title } as Prisma.InputJsonValue,
      },
    });

    // Async generate with retries
    setImmediate(() => {
      void this.generate(organizationId, report.id, job.id).catch((err) => {
        this.logger.error(
          `Report generate failed for ${report.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });

    return this.serialize(report);
  }

  private async generate(organizationId: string, reportId: string, jobId: string) {
    await this.workflows.withRetry({
      organizationId,
      workflowType: 'generate_report',
      referenceId: reportId,
      maxAttempts: 3,
      fn: async () => {
        const report = await this.prisma.report.findFirst({
          where: { id: reportId, organizationId },
          include: {
            audit: {
              include: {
                asset: true,
                findings: { take: 200, orderBy: { severity: 'asc' } },
                organization: true,
              },
            },
          },
        });
        if (!report?.audit) throw new Error('Report audit missing');

        const doc = this.buildFromAudit(report.audit, report.title);
        const exported = exportReport(doc, report.format as EngineFormat);
        const storageKey = `reports/${organizationId}/${report.auditId}/${report.id}.${exported.filename.split('.').pop()}`;
        const checksum = checksumSha256(exported.body);

        await this.prisma.reportArtifact.deleteMany({ where: { reportId } });
        await this.prisma.reportArtifact.create({
          data: {
            reportId,
            name: exported.filename,
            contentType: exported.contentType,
            storageKey,
            byteSize: exported.byteSize,
          },
        });

        // Persist export body in an audit event (no object storage yet)
        await this.prisma.auditEvent.create({
          data: {
            auditId: report.auditId,
            type: 'report.export.ready',
            message: `Export ready (${report.format})`,
            payload: {
              reportId,
              format: report.format,
              filename: exported.filename,
              contentType: exported.contentType,
              body: typeof exported.body === 'string' ? exported.body : exported.body.toString('base64'),
              encoding: typeof exported.body === 'string' ? 'utf8' : 'base64',
              document: doc,
            } as Prisma.InputJsonValue,
          },
        });

        await this.prisma.report.update({
          where: { id: reportId },
          data: {
            status: ReportStatus.ready,
            storageKey,
            checksumSha256: checksum,
            byteSize: exported.byteSize,
            readyAt: new Date(),
            errorMessage: null,
          },
        });

        await this.prisma.jobRun.update({
          where: { id: jobId },
          data: {
            status: JobStatus.completed,
            finishedAt: new Date(),
            output: {
              storageKey,
              byteSize: exported.byteSize,
              checksum,
            } as Prisma.InputJsonValue,
          },
        });

        return doc;
      },
    }).catch(async (err) => {
      const message = err instanceof Error ? err.message : 'Report generation failed';
      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.failed,
          errorMessage: message,
        },
      });
      await this.prisma.jobRun.update({
        where: { id: jobId },
        data: {
          status: JobStatus.failed,
          finishedAt: new Date(),
          errorMessage: message,
        },
      });
    });
  }

  buildFromAudit(
    audit: {
      id: string;
      config: unknown;
      asset: { name: string; type: string; identifier: string };
      findings: Array<{
        fingerprint: string;
        title: string;
        severity: string;
        category: string;
        description: string;
        location: string | null;
        remediation: string | null;
      }>;
      organization: { name: string };
    },
    title?: string | null,
  ): ProfessionalReport {
    const config = (audit.config ?? {}) as Record<string, unknown>;
    const scores = (config.scores ?? {}) as {
      overall?: number;
      formula?: string;
      engines?: Array<{ label: string; score: number; weight: number; contribution?: number; engineId?: string }>;
      modules?: Array<{ label: string; score: number; weight: number; contribution?: number; moduleId?: string }>;
    };
    const intel = (config.aiIntelligence ?? {}) as {
      executiveSummary?: string;
      generatedBy?: string;
      recommendations?: Array<Record<string, unknown>>;
    };
    const aiReport = (config.aiReport ?? {}) as {
      executiveSummary?: string;
      recommendations?: Array<{ priority: string; title: string; detail: string }>;
      generatedBy?: string;
    };
    const storeReport = (config.storeReport ?? {}) as {
      executiveSummary?: string;
      highlights?: string[];
      risks?: string[];
    };
    const listing = (config.listing ?? {}) as { title?: string; url?: string };

    const categoryScores = (scores.engines ?? scores.modules ?? []).map((row, i) => ({
      id: String(
        ('engineId' in row && row.engineId) ||
          ('moduleId' in row && (row as { moduleId?: string }).moduleId) ||
          row.label.toLowerCase().replace(/\s+/g, '_') ||
          `c${i}`,
      ),
      label: row.label,
      score: row.score,
      weight: row.weight,
      contribution: row.contribution,
    }));

    const recommendations =
      (intel.recommendations as never) ||
      aiReport.recommendations?.map((r) => ({
        priority: r.priority,
        title: r.title,
        summary: r.detail,
      })) ||
      [];

    return buildProfessionalReport({
      title: title || undefined,
      organizationName: audit.organization.name,
      auditId: audit.id,
      overallScore: scores.overall ?? 0,
      formula: scores.formula,
      categoryScores,
      executiveSummary:
        intel.executiveSummary || aiReport.executiveSummary || storeReport.executiveSummary,
      recommendations,
      findings: audit.findings.map((f) => ({
        fingerprint: f.fingerprint,
        title: f.title,
        severity: f.severity,
        category: f.category,
        description: f.description,
        location: f.location ?? undefined,
        remediation: f.remediation ?? undefined,
      })),
      highlights: storeReport.highlights,
      risks: storeReport.risks,
      generatedBy: intel.generatedBy || aiReport.generatedBy || 'report-engine',
      target: {
        label: listing.title || audit.asset.name,
        type: audit.asset.type,
        identifier: audit.asset.identifier,
        url: listing.url || (audit.asset.type === 'web' ? audit.asset.identifier : undefined),
        platform: config.platform as string | undefined,
      },
      extras: {
        kind: config.kind,
        listing: config.listing ?? null,
      },
    });
  }

  async list(organizationId: string, query: ListReportsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      organizationId,
      ...(query.status ? { status: query.status as ReportStatus } : {}),
      ...(query.auditId ? { auditId: query.auditId } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((r) => this.serialize(r)),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }

  async get(organizationId: string, reportId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, organizationId },
      include: { artifacts: true },
    });
    if (!report) {
      throw new NotFoundException({ code: 'REPORT_NOT_FOUND', message: 'Report not found' });
    }
    return {
      ...this.serialize(report),
      errorMessage: report.errorMessage,
      artifacts: report.artifacts.map((a) => ({
        id: a.id,
        name: a.name,
        contentType: a.contentType,
        byteSize: a.byteSize,
      })),
    };
  }

  async getDownloadUrl(organizationId: string, reportId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, organizationId },
    });
    if (!report) {
      throw new NotFoundException({ code: 'REPORT_NOT_FOUND', message: 'Report not found' });
    }
    if (report.status !== 'ready') {
      throw new BadRequestException({
        code: 'REPORT_NOT_READY',
        message: `Report status is ${report.status}`,
      });
    }
    return {
      reportId,
      url: `/v1/organizations/${organizationId}/reports/${reportId}/content`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      format: report.format,
      storageKey: report.storageKey,
    };
  }

  async getContent(organizationId: string, reportId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, organizationId },
    });
    if (!report) {
      throw new NotFoundException({ code: 'REPORT_NOT_FOUND', message: 'Report not found' });
    }
    if (report.status !== 'ready') {
      throw new BadRequestException({
        code: 'REPORT_NOT_READY',
        message: `Report status is ${report.status}`,
      });
    }

    const event = await this.prisma.auditEvent.findFirst({
      where: {
        auditId: report.auditId,
        type: 'report.export.ready',
      },
      orderBy: { createdAt: 'desc' },
    });
    const payload = (event?.payload ?? {}) as {
      body?: string;
      contentType?: string;
      filename?: string;
      encoding?: string;
      reportId?: string;
    };

    if (!payload.body || payload.reportId !== reportId) {
      // Fallback: rebuild on the fly
      const audit = await this.prisma.audit.findFirst({
        where: { id: report.auditId, organizationId },
        include: {
          asset: true,
          findings: { take: 200, orderBy: { severity: 'asc' } },
          organization: true,
        },
      });
      if (!audit) throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit not found' });
      const doc = this.buildFromAudit(audit, report.title);
      const exported = exportReport(doc, report.format as EngineFormat);
      return {
        contentType: exported.contentType,
        filename: exported.filename,
        body: typeof exported.body === 'string' ? exported.body : exported.body.toString('utf8'),
      };
    }

    return {
      contentType: payload.contentType ?? 'application/octet-stream',
      filename: payload.filename ?? 'report',
      body:
        payload.encoding === 'base64'
          ? Buffer.from(payload.body, 'base64').toString('utf8')
          : payload.body,
    };
  }

  async preview(organizationId: string, auditId: string) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId },
      include: {
        asset: true,
        findings: { take: 200, orderBy: { severity: 'asc' } },
        organization: true,
      },
    });
    if (!audit) {
      throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit not found' });
    }
    return this.buildFromAudit(audit);
  }

  private serialize(report: {
    id: string;
    auditId: string;
    format: string;
    status: string;
    title: string;
    readyAt: Date | null;
    createdAt: Date;
    storageKey?: string | null;
  }) {
    return {
      id: report.id,
      auditId: report.auditId,
      format: report.format,
      status: report.status,
      title: report.title,
      readyAt: report.readyAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      downloadUrl: report.status === 'ready' ? `content` : null,
    };
  }
}
