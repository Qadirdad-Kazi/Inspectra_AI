import { Injectable, Logger } from '@nestjs/common';
import {
  AuditStatus,
  FindingSeverity,
  JobStatus,
  JobType,
  ReportFormat,
  ReportStatus,
} from '@inspectra/db';
import {
  runStoreAudit,
  type StoreAuditOutput,
  type StorePlatform,
} from '@inspectra/store-audit-engine';
import { Prisma } from '@inspectra/db';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiIntelligenceService } from '../intelligence/ai-intelligence.service';

const STAGES = [
  { name: 'fetch', position: 1 },
  { name: 'reviews', position: 2 },
  { name: 'competitors', position: 3 },
  { name: 'metadata', position: 4 },
  { name: 'aso', position: 5 },
  { name: 'screenshots', position: 6 },
  { name: 'icon', position: 7 },
  { name: 'reviews_intel', position: 8 },
  { name: 'competitors_intel', position: 9 },
  { name: 'report', position: 10 },
] as const;

const MODULE_STAGE: Record<string, string> = {
  metadata: 'metadata',
  aso: 'aso',
  screenshots: 'screenshots',
  icon: 'icon',
  reviews: 'reviews_intel',
  competitors: 'competitors_intel',
};

@Injectable()
export class StoreAuditRunner {
  private readonly logger = new Logger(StoreAuditRunner.name);
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly intelligence: AiIntelligenceService,
  ) {}

  enqueue(auditId: string): void {
    if (this.running.has(auditId)) return;
    this.running.add(auditId);
    setImmediate(() => {
      void this.execute(auditId).finally(() => this.running.delete(auditId));
    });
  }

  private async execute(auditId: string): Promise<void> {
    const audit = await this.prisma.audit.findUnique({
      where: { id: auditId },
      include: { asset: true },
    });
    if (!audit || audit.status === 'cancelled') return;

    const job = await this.prisma.jobRun.create({
      data: {
        organizationId: audit.organizationId,
        type: JobType.run_audit,
        status: JobStatus.active,
        queueName: 'audits',
        auditId: audit.id,
        requestedById: audit.triggeredById,
        startedAt: new Date(),
        input: audit.config as Prisma.InputJsonValue,
      },
    });

    await this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: AuditStatus.running,
        startedAt: new Date(),
        workflowId: job.id,
      },
    });

    for (const stage of STAGES) {
      await this.prisma.auditStage.upsert({
        where: { auditId_name: { auditId, name: stage.name } },
        create: {
          auditId,
          name: stage.name,
          position: stage.position,
          status: 'pending',
        },
        update: { status: 'pending', errorMessage: null },
      });
    }

    const config = (audit.config ?? {}) as {
      platform?: StorePlatform;
      country?: string;
      language?: string;
      competitorIds?: string[];
      modules?: string[];
      maxReviews?: number;
    };

    const platform = config.platform;
    if (!platform) {
      await this.fail(auditId, job.id, 'Missing store platform in audit config');
      return;
    }

    const identifier = audit.asset.identifier;

    try {
      await this.emit(auditId, 'audit.started', 'Store audit started', {
        platform,
        identifier,
      });

      const markStage = async (
        name: string,
        status: 'running' | 'succeeded' | 'failed',
      ) => {
        await this.prisma.auditStage.update({
          where: { auditId_name: { auditId, name } },
          data: {
            status,
            startedAt: status === 'running' ? new Date() : undefined,
            finishedAt:
              status === 'succeeded' || status === 'failed' ? new Date() : undefined,
          },
        });
      };

      const succeedRunning = async () => {
        await this.prisma.auditStage.updateMany({
          where: { auditId, status: 'running' },
          data: { status: 'succeeded', finishedAt: new Date() },
        });
      };

      await markStage('fetch', 'running');

      const result = await runStoreAudit({
        platform,
        identifier,
        country: config.country,
        language: config.language,
        competitorIds: config.competitorIds,
        modules: config.modules as never,
        maxReviews: config.maxReviews ?? 25,
        onProgress: async (event) => {
          const live = await this.prisma.audit.findUnique({ where: { id: auditId } });
          if (live?.status === 'cancelled') {
            throw new Error('AUDIT_CANCELLED');
          }

          if (event.stage === 'fetch') {
            await this.emit(auditId, 'audit.stage.progress', event.message, {
              progress: event.progress,
            });
          } else if (event.stage === 'reviews') {
            await markStage('fetch', 'succeeded');
            await markStage('reviews', 'running');
            await this.emit(auditId, 'audit.stage.started', event.message, {
              stage: event.stage,
            });
          } else if (event.stage === 'competitors') {
            await markStage('reviews', 'succeeded');
            await markStage('competitors', 'running');
            await this.emit(auditId, 'audit.stage.progress', event.message, {
              progress: event.progress,
            });
          } else if (event.stage === 'modules') {
            await succeedRunning();
          } else if (event.stage in MODULE_STAGE) {
            const stageName = MODULE_STAGE[event.stage]!;
            await succeedRunning();
            await markStage(stageName, 'running');
            await this.emit(auditId, 'audit.stage.started', event.message, {
              stage: event.stage,
            });
          } else if (event.stage === 'complete') {
            await succeedRunning();
            await markStage('report', 'running');
          }
        },
      });

      await this.persistResults(auditId, audit.organizationId, result);
      await markStage('report', 'succeeded');

      const finishedAt = new Date();
      const durationMinutes = Number(
        (
          (finishedAt.getTime() - (audit.startedAt?.getTime() ?? finishedAt.getTime())) /
          60000
        ).toFixed(2),
      );

      const scoresForUi = {
        ...result.scores,
        // Alias for shared audit detail UI (website uses `engines`)
        engines: result.scores.modules.map((m) => ({
          label: m.label,
          score: m.score,
          weight: m.weight,
          contribution: m.contribution,
        })),
      };

      await this.prisma.audit.update({
        where: { id: auditId },
        data: {
          status: AuditStatus.succeeded,
          finishedAt,
          durationMinutes,
          config: {
            ...(audit.config as object),
            scores: scoresForUi,
            listing: {
              title: result.context.listing.title,
              developer: result.context.listing.developer,
              url: result.context.listing.url,
              rating: result.context.listing.rating ?? null,
              ratingCount: result.context.listing.ratingCount ?? null,
              category: result.context.listing.category ?? null,
              subtitle: result.context.listing.subtitle ?? null,
              shortDescription: result.context.listing.shortDescription ?? null,
              description: result.context.listing.description?.slice(0, 4000) ?? null,
              iconUrl: result.context.listing.iconUrl ?? null,
              screenshotUrls: result.context.listing.screenshotUrls.slice(0, 12),
              screenshotCount: result.context.listing.screenshotUrls.length,
              downloads: result.context.listing.installsText ?? null,
            },
            storeReport: result.report,
          } as Prisma.InputJsonValue,
        },
      });

      await this.prisma.jobRun.update({
        where: { id: job.id },
        data: {
          status: JobStatus.completed,
          finishedAt,
          output: {
            overallScore: result.scores.overall,
            findings: result.findings.length,
            platform,
          } as Prisma.InputJsonValue,
        },
      });

      await this.emit(auditId, 'audit.completed', 'Store audit completed', {
        overallScore: result.scores.overall,
        findings: result.findings.length,
        platform,
      });

      try {
        await this.prisma.auditStage.upsert({
          where: { auditId_name: { auditId, name: 'intelligence' } },
          create: {
            auditId,
            name: 'intelligence',
            position: 11,
            status: 'running',
            startedAt: new Date(),
          },
          update: { status: 'running', startedAt: new Date(), errorMessage: null },
        });
        await this.intelligence.runForAudit(auditId);
        await this.prisma.auditStage.update({
          where: { auditId_name: { auditId, name: 'intelligence' } },
          data: { status: 'succeeded', finishedAt: new Date() },
        });
      } catch (intelErr) {
        const msg = intelErr instanceof Error ? intelErr.message : 'Intelligence failed';
        this.logger.warn(`AI intelligence failed for ${auditId}: ${msg}`);
        await this.prisma.auditStage.updateMany({
          where: { auditId, name: 'intelligence' },
          data: { status: 'failed', finishedAt: new Date(), errorMessage: msg },
        });
      }

      await this.prisma.notification.create({
        data: {
          organizationId: audit.organizationId,
          userId: audit.triggeredById,
          channel: 'in_app',
          status: 'sent',
          title: 'Store audit complete',
          body: `${result.context.listing.title} scored ${result.scores.overall}/100 with ${result.findings.length} findings.`,
          sentAt: new Date(),
          dedupeKey: `audit-complete:${auditId}`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Audit failed';
      if (message === 'AUDIT_CANCELLED') {
        await this.prisma.jobRun.update({
          where: { id: job.id },
          data: { status: JobStatus.cancelled, finishedAt: new Date() },
        });
        return;
      }

      this.logger.error(`Store audit ${auditId} failed: ${message}`);
      await this.fail(auditId, job.id, message);
      await this.emit(auditId, 'audit.failed', message, {});
    }
  }

  private async fail(auditId: string, jobId: string, message: string) {
    await this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: AuditStatus.failed,
        finishedAt: new Date(),
        errorMessage: message,
        errorCode: 'STORE_AUDIT_FAILED',
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
  }

  private async persistResults(
    auditId: string,
    organizationId: string,
    result: StoreAuditOutput,
  ) {
    await this.prisma.finding.deleteMany({ where: { auditId } });

    if (result.findings.length) {
      await this.prisma.finding.createMany({
        data: result.findings.map((f) => ({
          auditId,
          fingerprint: f.fingerprint,
          title: f.title,
          description: f.description,
          severity: f.severity as FindingSeverity,
          category: f.category,
          location: f.location,
          evidenceRefs: f.evidenceRefs ?? [],
          // Observational phase — do not persist remediations / AI fixes
          remediation: null,
          metadata: (f.metadata ?? {}) as Prisma.InputJsonValue,
        })),
      });
    }

    const reportBody = {
      ...result.report,
      scores: result.scores,
      modules: result.modules.map((m) => ({
        id: m.moduleId,
        label: m.label,
        score: m.score,
        weight: m.weight,
        summary: m.summary,
        metrics: m.metrics,
      })),
      listing: {
        title: result.context.listing.title,
        platform: result.platform,
        storeId: result.context.listing.storeId,
        url: result.context.listing.url,
      },
    };

    const storageKey = `reports/${organizationId}/${auditId}.json`;
    await this.prisma.report.create({
      data: {
        organizationId,
        auditId,
        format: ReportFormat.json,
        status: ReportStatus.ready,
        title: result.report.title,
        storageKey,
        readyAt: new Date(),
        byteSize: Buffer.byteLength(JSON.stringify(reportBody), 'utf8'),
      },
    });

    await this.emit(auditId, 'audit.report.ready', 'Store report ready', reportBody);
  }

  private async emit(
    auditId: string,
    type: string,
    message: string,
    payload: Record<string, unknown>,
  ) {
    await this.prisma.auditEvent.create({
      data: {
        auditId,
        type,
        message,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
}
