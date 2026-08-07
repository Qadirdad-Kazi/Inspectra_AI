import { Injectable, Logger } from '@nestjs/common';
import {
  AuditStatus,
  FindingSeverity,
  JobStatus,
  JobType,
  ReportFormat,
  ReportStatus,
} from '@inspectra/db';
import { runWebsiteAudit, type WebsiteAuditOutput } from '@inspectra/web-audit-engine';
import { Prisma } from '@inspectra/db';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiIntelligenceService } from '../intelligence/ai-intelligence.service';
import { BillingService } from '../../billing/billing.service';
import { refundConsumedAuditCredit } from '../audit-credit-refund';

const STAGES = [
  { name: 'crawl', position: 1 },
  { name: 'seo', position: 2 },
  { name: 'performance', position: 3 },
  { name: 'accessibility', position: 4 },
  { name: 'security', position: 5 },
  { name: 'best_practices', position: 6 },
  { name: 'report', position: 7 },
] as const;

@Injectable()
export class WebsiteAuditRunner {
  private readonly logger = new Logger(WebsiteAuditRunner.name);
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly intelligence: AiIntelligenceService,
    private readonly billing: BillingService,
  ) {}

  /** Fire-and-forget async execution with progress persistence. */
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
      maxPages?: number;
      maxDepth?: number;
      requestDelayMs?: number;
      engines?: string[];
    };

    const url = audit.asset.identifier;

    try {
      await this.emit(auditId, 'audit.started', 'Website audit started', {
        url,
      });

      const markStage = async (name: string, status: 'running' | 'succeeded' | 'failed') => {
        await this.prisma.auditStage.update({
          where: { auditId_name: { auditId, name } },
          data: {
            status,
            startedAt: status === 'running' ? new Date() : undefined,
            finishedAt: status === 'succeeded' || status === 'failed' ? new Date() : undefined,
          },
        });
      };

      await markStage('crawl', 'running');

      const result = await runWebsiteAudit({
        url,
        maxPages: config.maxPages ?? 15,
        maxDepth: config.maxDepth ?? 2,
        requestDelayMs: config.requestDelayMs ?? 300,
        engines: config.engines as never,
        onProgress: async (event) => {
          const live = await this.prisma.audit.findUnique({ where: { id: auditId } });
          if (live?.status === 'cancelled') {
            throw new Error('AUDIT_CANCELLED');
          }

          if (event.stage === 'crawl') {
            await this.emit(auditId, 'audit.stage.progress', event.message, {
              progress: event.progress,
            });
          } else if (event.stage === 'engines') {
            await markStage('crawl', 'succeeded');
          } else if (
            ['seo', 'performance', 'accessibility', 'security', 'best_practices'].includes(
              event.stage,
            )
          ) {
            await markStage(event.stage, 'running');
            await this.emit(auditId, 'audit.stage.started', event.message, {
              stage: event.stage,
            });
          } else if (event.stage === 'report') {
            for (const s of [
              'seo',
              'performance',
              'accessibility',
              'security',
              'best_practices',
            ]) {
              await this.prisma.auditStage.updateMany({
                where: { auditId, name: s, status: 'running' },
                data: { status: 'succeeded', finishedAt: new Date() },
              });
            }
            await markStage('report', 'running');
          }
        },
      });

      await this.persistResults(auditId, audit.organizationId, result);
      await markStage('report', 'succeeded');

      const finishedAt = new Date();
      const durationMinutes =
        audit.startedAt || finishedAt
          ? Number(
              (
                (finishedAt.getTime() - (audit.startedAt?.getTime() ?? finishedAt.getTime())) /
                60000
              ).toFixed(2),
            )
          : 0;

      await this.prisma.audit.update({
        where: { id: auditId },
        data: {
          status: AuditStatus.succeeded,
          finishedAt,
          durationMinutes,
          config: {
            ...(audit.config as object),
            scores: result.scores,
            crawl: {
              pages: result.crawl.pages.length,
              errors: result.crawl.errors.length,
              durationMs: result.crawl.durationMs,
              blockedByRobots: result.crawl.blockedByRobots.length,
            },
            aiReport: result.aiReport,
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
          } as Prisma.InputJsonValue,
        },
      });

      await this.emit(auditId, 'audit.completed', 'Website audit completed', {
        overallScore: result.scores.overall,
        findings: result.findings.length,
      });

      try {
        await this.prisma.auditStage.upsert({
          where: { auditId_name: { auditId, name: 'intelligence' } },
          create: {
            auditId,
            name: 'intelligence',
            position: 8,
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
          title: 'Website audit complete',
          body: `${url} scored ${result.scores.overall}/100 with ${result.findings.length} findings.`,
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

      this.logger.error(`Audit ${auditId} failed: ${message}`);
      await this.prisma.audit.update({
        where: { id: auditId },
        data: {
          status: AuditStatus.failed,
          finishedAt: new Date(),
          errorMessage: message,
          errorCode: 'WEB_AUDIT_FAILED',
        },
      });
      const failed = await this.prisma.audit.findUnique({ where: { id: auditId } });
      if (failed) {
        await refundConsumedAuditCredit(this.prisma, this.billing, failed);
      }
      await this.prisma.jobRun.update({
        where: { id: job.id },
        data: {
          status: JobStatus.failed,
          finishedAt: new Date(),
          errorMessage: message,
        },
      });
      await this.emit(auditId, 'audit.failed', message, {});
    }
  }

  private async persistResults(
    auditId: string,
    organizationId: string,
    result: WebsiteAuditOutput,
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
          remediation: f.remediation,
          metadata: (f.metadata ?? {}) as Prisma.InputJsonValue,
        })),
      });
    }

    const reportBody = {
      ...result.aiReport,
      scores: result.scores,
      engines: result.engines.map((e) => ({
        id: e.engineId,
        label: e.label,
        score: e.score,
        weight: e.weight,
        summary: e.summary,
        metrics: e.metrics,
      })),
      crawl: {
        startUrl: result.crawl.startUrl,
        pages: result.crawl.pages.length,
        durationMs: result.crawl.durationMs,
      },
    };

    const storageKey = `reports/${organizationId}/${auditId}.json`;
    await this.prisma.report.create({
      data: {
        organizationId,
        auditId,
        format: ReportFormat.json,
        status: ReportStatus.ready,
        title: result.aiReport.title,
        storageKey,
        readyAt: new Date(),
        byteSize: Buffer.byteLength(JSON.stringify(reportBody), 'utf8'),
      },
    });

    // Persist report JSON in audit events for retrieval without object storage.
    await this.emit(auditId, 'audit.report.ready', 'AI report ready', reportBody);
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
