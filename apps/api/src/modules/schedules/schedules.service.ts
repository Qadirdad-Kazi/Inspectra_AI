import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, JobType, Prisma } from '@inspectra/db';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowLoggerService } from '../../common/workflow/workflow-logger.service';
import { AuditsService } from '../audits/audits.service';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowLoggerService,
    private readonly audits: AuditsService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.prisma.auditSchedule.findMany({
      where: { organizationId },
      include: { asset: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return { data: rows.map((r) => this.serialize(r)) };
  }

  async create(
    organizationId: string,
    userId: string,
    dto: {
      assetId: string;
      name: string;
      intervalMinutes?: number;
      config?: Record<string, unknown>;
    },
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: dto.assetId, organizationId },
    });
    if (!asset) {
      throw new NotFoundException({ code: 'ASSET_NOT_FOUND', message: 'Asset not found' });
    }
    const intervalMinutes = dto.intervalMinutes ?? 10080;
    if (intervalMinutes < 60) {
      throw new BadRequestException({
        code: 'INTERVAL_TOO_SHORT',
        message: 'Minimum interval is 60 minutes',
      });
    }
    const nextRunAt = new Date(Date.now() + intervalMinutes * 60_000);
    const row = await this.prisma.auditSchedule.create({
      data: {
        organizationId,
        assetId: asset.id,
        name: dto.name,
        intervalMinutes,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
        nextRunAt,
        createdById: userId,
      },
      include: { asset: true },
    });
    return this.serialize(row);
  }

  async update(
    organizationId: string,
    scheduleId: string,
    dto: { name?: string; intervalMinutes?: number; isActive?: boolean; config?: Record<string, unknown> },
  ) {
    const existing = await this.prisma.auditSchedule.findFirst({
      where: { id: scheduleId, organizationId },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found' });
    }
    const row = await this.prisma.auditSchedule.update({
      where: { id: scheduleId },
      data: {
        name: dto.name,
        intervalMinutes: dto.intervalMinutes,
        isActive: dto.isActive,
        config: dto.config ? (dto.config as Prisma.InputJsonValue) : undefined,
        nextRunAt:
          dto.intervalMinutes && dto.intervalMinutes !== existing.intervalMinutes
            ? new Date(Date.now() + dto.intervalMinutes * 60_000)
            : undefined,
      },
      include: { asset: true },
    });
    return this.serialize(row);
  }

  async remove(organizationId: string, scheduleId: string) {
    await this.prisma.auditSchedule.deleteMany({
      where: { id: scheduleId, organizationId },
    });
    return { ok: true };
  }

  /** Process due schedules for one organization (callable from cron endpoint). */
  async runDue(organizationId: string, limit = 20) {
    const now = new Date();
    const due = await this.prisma.auditSchedule.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
      },
      include: { asset: true },
      take: Math.min(limit, 50),
      orderBy: { nextRunAt: 'asc' },
    });

    const results = [];
    for (const schedule of due) {
      results.push(await this.executeSchedule(schedule.id));
    }
    return { processed: results.length, results };
  }

  async runNow(organizationId: string, scheduleId: string) {
    const schedule = await this.prisma.auditSchedule.findFirst({
      where: { id: scheduleId, organizationId },
    });
    if (!schedule) {
      throw new NotFoundException({ code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found' });
    }
    return this.executeSchedule(scheduleId);
  }

  private async executeSchedule(scheduleId: string) {
    const schedule = await this.prisma.auditSchedule.findUnique({
      where: { id: scheduleId },
      include: { asset: true },
    });
    if (!schedule) return { scheduleId, status: 'missing' };

    const job = await this.prisma.jobRun.create({
      data: {
        organizationId: schedule.organizationId,
        type: JobType.run_schedule,
        status: JobStatus.active,
        queueName: 'audits',
        startedAt: new Date(),
        input: { scheduleId, assetId: schedule.assetId } as Prisma.InputJsonValue,
      },
    });

    try {
      const audit = await this.workflows.withRetry({
        organizationId: schedule.organizationId,
        workflowType: 'schedule.run_audit',
        referenceId: scheduleId,
        maxAttempts: schedule.maxAttempts,
        fn: async () => {
          const cfg = (schedule.config ?? {}) as Record<string, unknown>;
          const type = schedule.asset.type as 'web' | 'android' | 'ios' | 'msstore';
          let triggeredById: string | null = schedule.createdById;
          if (!triggeredById) {
            const member = await this.prisma.membership.findFirst({
              where: {
                organizationId: schedule.organizationId,
                role: { in: ['owner', 'admin', 'analyst'] },
              },
              orderBy: { createdAt: 'asc' },
            });
            triggeredById = member?.userId ?? null;
          }
          if (!triggeredById) {
            throw new Error('No user available to attribute scheduled audit');
          }

          if (type === 'web') {
            return this.audits.createAudit(schedule.organizationId, triggeredById, {
              type: 'web',
              assetId: schedule.assetId,
              url: schedule.asset.identifier,
              config: cfg as never,
            });
          }
          return this.audits.createAudit(schedule.organizationId, triggeredById, {
            type,
            assetId: schedule.assetId,
            storeIdentifier: schedule.asset.identifier,
            config: cfg as never,
          });
        },
      });

      const nextRunAt = new Date(Date.now() + schedule.intervalMinutes * 60_000);
      await this.prisma.auditSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
          lastStatus: 'succeeded',
          lastError: null,
        },
      });
      await this.prisma.jobRun.update({
        where: { id: job.id },
        data: {
          status: JobStatus.completed,
          finishedAt: new Date(),
          output: { auditId: audit.id } as Prisma.InputJsonValue,
          auditId: audit.id,
        },
      });
      return { scheduleId, status: 'succeeded', auditId: audit.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Schedule failed';
      await this.prisma.auditSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          nextRunAt: new Date(Date.now() + schedule.intervalMinutes * 60_000),
          lastStatus: 'failed',
          lastError: message,
        },
      });
      await this.prisma.jobRun.update({
        where: { id: job.id },
        data: {
          status: JobStatus.failed,
          finishedAt: new Date(),
          errorMessage: message,
        },
      });
      return { scheduleId, status: 'failed', error: message };
    }
  }

  private serialize(row: {
    id: string;
    name: string;
    intervalMinutes: number;
    isActive: boolean;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    lastStatus: string | null;
    lastError: string | null;
    assetId: string;
    asset?: { identifier: string; type: string; name: string };
    createdAt: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      intervalMinutes: row.intervalMinutes,
      isActive: row.isActive,
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
      nextRunAt: row.nextRunAt?.toISOString() ?? null,
      lastStatus: row.lastStatus,
      lastError: row.lastError,
      assetId: row.assetId,
      asset: row.asset
        ? {
            identifier: row.asset.identifier,
            type: row.asset.type,
            name: row.asset.name,
          }
        : null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
