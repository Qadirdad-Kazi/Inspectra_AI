import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetType, AuditStatus, TriageStatus } from '@inspectra/db';
import { Prisma } from '@inspectra/db';
import { assertPublicHttpUrl } from '@inspectra/web-audit-engine';
import { PrismaService } from '../../prisma/prisma.service';
import { toPaginationMeta } from '../../common/dto/pagination-query.dto';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { WebsiteAuditRunner } from './runner/website-audit.runner';
import { StoreAuditRunner } from './runner/store-audit.runner';
import { AiIntelligenceService } from './intelligence/ai-intelligence.service';
import { BillingService } from '../billing/billing.service';
import { refundConsumedAuditCredit } from './audit-credit-refund';
import type {
  CreateAssetDto,
  CreateAuditDto,
  CreateSuppressionDto,
  ListAuditsQueryDto,
  ListFindingsQueryDto,
  UpdateFindingTriageDto,
} from './dto/audit.dto';

const SUPPORTED_ASSET_TYPES = new Set(['web', 'android', 'ios', 'msstore']);

const ASSET_TO_STORE_PLATFORM = {
  android: 'google_play',
  ios: 'app_store',
  msstore: 'microsoft_store',
} as const;

type StoreAssetType = keyof typeof ASSET_TO_STORE_PLATFORM;

function normalizeWebsiteUrl(raw: string): string {
  try {
    return assertPublicHttpUrl(raw);
  } catch (err) {
    throw new BadRequestException({
      code: 'INVALID_URL',
      message: err instanceof Error ? err.message : 'Invalid or non-public URL',
    });
  }
}

function normalizeStoreIdentifier(raw: string): string {
  return raw.trim();
}

function isStoreAssetType(type: string): type is StoreAssetType {
  return type === 'android' || type === 'ios' || type === 'msstore';
}

@Injectable()
export class AuditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websiteRunner: WebsiteAuditRunner,
    private readonly storeRunner: StoreAuditRunner,
    private readonly intelligence: AiIntelligenceService,
    private readonly billing: BillingService,
  ) {}

  async createAsset(organizationId: string, dto: CreateAssetDto) {
    if (!SUPPORTED_ASSET_TYPES.has(dto.type)) {
      throw new BadRequestException({
        code: 'ASSET_TYPE_UNSUPPORTED',
        message: 'Supported asset types: web, android, ios, msstore',
      });
    }

    const assetType = dto.type as AssetType;
    const identifier =
      dto.type === 'web'
        ? normalizeWebsiteUrl(dto.identifier)
        : normalizeStoreIdentifier(dto.identifier);

    const asset = await this.prisma.asset.upsert({
      where: {
        organizationId_type_identifier: {
          organizationId,
          type: assetType,
          identifier,
        },
      },
      create: {
        organizationId,
        workspaceId: dto.workspaceId,
        type: assetType,
        name: dto.name || identifier,
        identifier,
        environment: dto.environment ?? 'production',
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        name: dto.name || undefined,
        workspaceId: dto.workspaceId,
        isActive: true,
      },
    });
    return this.serializeAsset(asset);
  }

  async listAssets(organizationId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      organizationId,
      type: { in: [AssetType.web, AssetType.android, AssetType.ios, AssetType.msstore] },
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((a) => this.serializeAsset(a)),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }

  async getAsset(organizationId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });
    if (!asset) throw new NotFoundException({ code: 'ASSET_NOT_FOUND', message: 'Asset not found' });
    return this.serializeAsset(asset);
  }

  async createAudit(organizationId: string, userId: string, dto: CreateAuditDto) {
    const requestedType = dto.type ?? (dto.storeIdentifier ? undefined : 'web');
    const isStoreRequest =
      (requestedType && isStoreAssetType(requestedType)) || Boolean(dto.storeIdentifier);

    if (!dto.assetId && !dto.url && !dto.storeIdentifier) {
      throw new BadRequestException({
        code: 'TARGET_REQUIRED',
        message: 'Provide url, storeIdentifier, or assetId',
      });
    }

    if (isStoreRequest && !dto.assetId && !dto.storeIdentifier) {
      throw new BadRequestException({
        code: 'STORE_IDENTIFIER_REQUIRED',
        message: 'Provide storeIdentifier for android / ios / msstore audits',
      });
    }

    let assetId = dto.assetId;

    if (!assetId && dto.storeIdentifier && isStoreRequest) {
      const type = (requestedType && isStoreAssetType(requestedType)
        ? requestedType
        : null) as StoreAssetType | null;
      if (!type) {
        throw new BadRequestException({
          code: 'STORE_TYPE_REQUIRED',
          message: 'Provide type: android | ios | msstore with storeIdentifier',
        });
      }
      const identifier = normalizeStoreIdentifier(dto.storeIdentifier);
      const asset = await this.createAsset(organizationId, {
        type,
        name: identifier,
        identifier,
        workspaceId: dto.workspaceId,
      });
      assetId = asset.id;
    } else if (!assetId && dto.url) {
      const identifier = normalizeWebsiteUrl(dto.url);
      const asset = await this.createAsset(organizationId, {
        type: 'web',
        name: new URL(identifier).hostname,
        identifier,
        workspaceId: dto.workspaceId,
      });
      assetId = asset.id;
    }

    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });
    if (!asset) throw new NotFoundException({ code: 'ASSET_NOT_FOUND', message: 'Asset not found' });
    if (!SUPPORTED_ASSET_TYPES.has(asset.type)) {
      throw new BadRequestException({
        code: 'AUDIT_TYPE_UNSUPPORTED',
        message: 'Supported audits: web, android, ios, msstore',
      });
    }

    const creditResult = await this.billing.consumeAuditCredit(organizationId, userId);
    const billingMeta = {
      creditConsumed: !creditResult.unlimited,
      creditRefunded: false,
    };

    if (asset.type === AssetType.web) {
      const config = {
        kind: 'website',
        profile: dto.config?.profile ?? 'standard',
        maxPages: dto.config?.maxPages ?? 15,
        maxDepth: dto.config?.maxDepth ?? 2,
        requestDelayMs: dto.config?.requestDelayMs ?? 300,
        engines: dto.config?.engines,
        targetUrl: asset.identifier,
        billing: billingMeta,
        ...(dto.config?.options ?? {}),
      };

      const audit = await this.prisma.audit.create({
        data: {
          organizationId,
          workspaceId: dto.workspaceId ?? asset.workspaceId,
          assetId: asset.id,
          status: AuditStatus.queued,
          triggeredById: userId,
          config: config as Prisma.InputJsonValue,
        },
      });

      this.websiteRunner.enqueue(audit.id);
      return this.serializeAudit(audit);
    }

    if (!isStoreAssetType(asset.type)) {
      throw new BadRequestException({
        code: 'AUDIT_TYPE_UNSUPPORTED',
        message: 'Unsupported store asset type',
      });
    }

    const platform = ASSET_TO_STORE_PLATFORM[asset.type];
    const competitorIds =
      dto.config?.competitorIds ??
      (Array.isArray(dto.config?.options?.competitorIds)
        ? (dto.config!.options!.competitorIds as string[])
        : undefined);

    const config = {
      kind: 'store',
      platform,
      assetType: asset.type,
      country: dto.config?.country ?? 'us',
      language: dto.config?.language ?? 'en',
      competitorIds: competitorIds ?? [],
      modules: dto.config?.modules,
      maxReviews: dto.config?.maxReviews ?? 25,
      storeIdentifier: asset.identifier,
      billing: billingMeta,
      ...(dto.config?.options ?? {}),
    };

    const audit = await this.prisma.audit.create({
      data: {
        organizationId,
        workspaceId: dto.workspaceId ?? asset.workspaceId,
        assetId: asset.id,
        status: AuditStatus.queued,
        triggeredById: userId,
        config: config as Prisma.InputJsonValue,
      },
    });

    this.storeRunner.enqueue(audit.id);
    return this.serializeAudit(audit);
  }

  async listAudits(organizationId: string, query: ListAuditsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      organizationId,
      ...(query.status ? { status: query.status as AuditStatus } : {}),
      ...(query.assetId ? { assetId: query.assetId } : {}),
      ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.audit.count({ where }),
      this.prisma.audit.findMany({
        where,
        include: { asset: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((a) => ({
        ...this.serializeAudit(a),
        asset: this.serializeAsset(a.asset),
        scores: (a.config as { scores?: unknown })?.scores ?? null,
      })),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }

  async getAudit(organizationId: string, auditId: string) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId },
      include: {
        asset: true,
        stages: { orderBy: { position: 'asc' } },
        reports: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!audit) throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit not found' });

    const findingCounts = await this.prisma.finding.groupBy({
      by: ['severity'],
      where: { auditId },
      _count: true,
    });

    return {
      ...this.serializeAudit(audit),
      asset: this.serializeAsset(audit.asset),
      stages: audit.stages.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        position: s.position,
        startedAt: s.startedAt?.toISOString() ?? null,
        finishedAt: s.finishedAt?.toISOString() ?? null,
      })),
      scores: (audit.config as { scores?: unknown })?.scores ?? null,
      aiReport: (audit.config as { aiReport?: unknown })?.aiReport ?? null,
      storeReport: (audit.config as { storeReport?: unknown })?.storeReport ?? null,
      aiIntelligence: (audit.config as { aiIntelligence?: unknown })?.aiIntelligence ?? null,
      listing: (audit.config as { listing?: unknown })?.listing ?? null,
      kind: (audit.config as { kind?: string })?.kind ?? null,
      findingCounts: Object.fromEntries(
        findingCounts.map((c) => [c.severity, c._count]),
      ),
      reports: audit.reports.map((r) => ({
        id: r.id,
        format: r.format,
        status: r.status,
        title: r.title,
        readyAt: r.readyAt?.toISOString() ?? null,
      })),
      shareToken: (audit.config as { shareToken?: string })?.shareToken ?? null,
    };
  }

  /** Enable a public read-only share link (AppVed-style shareable report, original implementation). */
  async enableShare(organizationId: string, auditId: string) {
    const audit = await this.ensureAudit(organizationId, auditId);
    if (!['succeeded', 'failed'].includes(audit.status)) {
      throw new BadRequestException({
        code: 'AUDIT_NOT_READY',
        message: 'Only finished audits can be shared publicly',
      });
    }
    const existing = (audit.config as { shareToken?: string })?.shareToken;
    if (existing) {
      return { shareToken: existing, path: `/r/${existing}` };
    }
    const { randomBytes } = await import('node:crypto');
    const shareToken = randomBytes(18).toString('base64url');
    await this.prisma.audit.update({
      where: { id: auditId },
      data: {
        config: {
          ...(audit.config as object),
          shareToken,
          sharedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
    return { shareToken, path: `/r/${shareToken}` };
  }

  async revokeShare(organizationId: string, auditId: string) {
    const audit = await this.ensureAudit(organizationId, auditId);
    const cfg = { ...(audit.config as Record<string, unknown>) };
    delete cfg.shareToken;
    delete cfg.sharedAt;
    await this.prisma.audit.update({
      where: { id: auditId },
      data: { config: cfg as Prisma.InputJsonValue },
    });
    return { ok: true };
  }

  /** Public snapshot for share links — no comments, no events, no org internals. */
  async getPublicByShareToken(shareToken: string) {
    const audit = await this.prisma.audit.findFirst({
      where: {
        status: { in: [AuditStatus.succeeded, AuditStatus.failed] },
        config: {
          path: ['shareToken'],
          equals: shareToken,
        },
      },
      include: { asset: true },
    });
    if (!audit) {
      throw new NotFoundException({ code: 'SHARE_NOT_FOUND', message: 'Shared report not found' });
    }

    const findings = await this.prisma.finding.findMany({
      where: { auditId: audit.id },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });

    const cfg = audit.config as Record<string, unknown>;
    return {
      id: audit.id,
      status: audit.status,
      createdAt: audit.createdAt.toISOString(),
      finishedAt: audit.finishedAt?.toISOString() ?? null,
      asset: {
        type: audit.asset.type,
        identifier: audit.asset.identifier,
        name: audit.asset.name,
      },
      scores: cfg.scores ?? null,
      aiReport: cfg.aiReport ?? null,
      storeReport: cfg.storeReport ?? null,
      aiIntelligence: cfg.aiIntelligence ?? null,
      listing: cfg.listing ?? null,
      kind: cfg.kind ?? null,
      findings: findings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        category: f.category,
        description: f.description,
        remediation: f.remediation,
        location: f.location,
      })),
    };
  }

  async cancelAudit(organizationId: string, auditId: string) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId },
    });
    if (!audit) throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit not found' });
    if (['succeeded', 'failed', 'cancelled'].includes(audit.status)) {
      return this.serializeAudit(audit);
    }
    const updated = await this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: AuditStatus.cancelled,
        finishedAt: new Date(),
        errorMessage: 'Cancelled by user',
      },
    });
    await this.prisma.auditEvent.create({
      data: {
        auditId,
        type: 'audit.cancelled',
        message: 'Audit cancelled',
        payload: {},
      },
    });
    await refundConsumedAuditCredit(this.prisma, this.billing, updated);
    return this.serializeAudit(updated);
  }

  /**
   * Permanently delete an audit and related rows.
   * Cascades: stages, events, findings (+ triage), reports (+ artifacts), comments.
   * Also removes job runs / AI memory linked to this audit, and orphan assets with no remaining audits.
   * Report bodies live in DB (events/config) — no separate object store to clear today.
   */
  async deleteAudit(organizationId: string, auditId: string) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId },
      select: { id: true, assetId: true, status: true },
    });
    if (!audit) {
      throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit not found' });
    }

    // Stop in-flight runners that poll for cancelled status
    if (!['succeeded', 'failed', 'cancelled'].includes(audit.status)) {
      await this.prisma.audit.update({
        where: { id: auditId },
        data: {
          status: AuditStatus.cancelled,
          finishedAt: new Date(),
          errorMessage: 'Deleted by user',
        },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.jobRun.deleteMany({ where: { auditId } });
      await tx.aiMemoryEntry.deleteMany({ where: { auditId } });
      // Findings → triage, reports → artifacts, stages, events, comments cascade from Audit
      await tx.audit.delete({ where: { id: auditId } });

      const remaining = await tx.audit.count({ where: { assetId: audit.assetId } });
      if (remaining === 0) {
        // Safe to remove orphan target asset (schedules on asset cascade)
        await tx.auditSchedule.deleteMany({ where: { assetId: audit.assetId } });
        await tx.asset.deleteMany({
          where: { id: audit.assetId, organizationId },
        });
      }
    });

    return { ok: true as const, id: auditId };
  }

  async runIntelligence(organizationId: string, auditId: string) {
    const audit = await this.ensureAudit(organizationId, auditId);
    if (audit.status !== 'succeeded' && audit.status !== 'failed') {
      throw new BadRequestException({
        code: 'AUDIT_NOT_READY',
        message: 'Intelligence runs after the scan finishes',
      });
    }
    const result = await this.intelligence.runForAudit(auditId);
    if (!result) {
      throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit not found' });
    }
    return {
      executiveSummary: result.executiveSummary,
      recommendationCount: result.recommendations.length,
      generatedBy: result.generatedBy,
      modelSelection: result.modelSelection,
      recommendations: result.recommendations,
    };
  }

  async listStages(organizationId: string, auditId: string) {
    await this.ensureAudit(organizationId, auditId);
    const stages = await this.prisma.auditStage.findMany({
      where: { auditId },
      orderBy: { position: 'asc' },
    });
    return {
      data: stages.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        position: s.position,
      })),
      meta: toPaginationMeta(1, stages.length || 1, stages.length),
    };
  }

  async listEvents(organizationId: string, auditId: string, query: PaginationQueryDto) {
    await this.ensureAudit(organizationId, auditId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = { auditId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((e) => ({
        id: e.id,
        type: e.type,
        message: e.message,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      })),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }

  async listFindings(
    organizationId: string,
    auditId: string,
    query: ListFindingsQueryDto,
  ) {
    await this.ensureAudit(organizationId, auditId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = {
      auditId,
      ...(query.severity ? { severity: query.severity as never } : {}),
      ...(query.triageStatus ? { triageStatus: query.triageStatus as TriageStatus } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.finding.count({ where }),
      this.prisma.finding.findMany({
        where,
        orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((f) => ({
        id: f.id,
        fingerprint: f.fingerprint,
        title: f.title,
        description: f.description,
        severity: f.severity,
        category: f.category,
        triageStatus: f.triageStatus,
        location: f.location,
        remediation: f.remediation,
      })),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }

  async updateFindingTriage(
    organizationId: string,
    auditId: string,
    findingId: string,
    userId: string,
    dto: UpdateFindingTriageDto,
  ) {
    await this.ensureAudit(organizationId, auditId);
    const finding = await this.prisma.finding.findFirst({
      where: { id: findingId, auditId },
    });
    if (!finding) {
      throw new NotFoundException({ code: 'FINDING_NOT_FOUND', message: 'Finding not found' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.finding.update({
        where: { id: findingId },
        data: { triageStatus: dto.triageStatus as TriageStatus },
      });
      await tx.findingTriageEvent.create({
        data: {
          findingId,
          actorId: userId,
          fromStatus: finding.triageStatus,
          toStatus: dto.triageStatus as TriageStatus,
          note: dto.note,
        },
      });
      return row;
    });

    return {
      id: updated.id,
      triageStatus: updated.triageStatus,
    };
  }

  async createSuppression(
    organizationId: string,
    userId: string,
    dto: CreateSuppressionDto,
  ) {
    if (!dto.fingerprint && !dto.pattern) {
      throw new BadRequestException({
        code: 'SUPPRESSION_TARGET_REQUIRED',
        message: 'Provide fingerprint or pattern',
      });
    }
    const row = await this.prisma.findingSuppression.create({
      data: {
        organizationId,
        fingerprint: dto.fingerprint,
        pattern: dto.pattern,
        reason: dto.reason,
        createdById: userId,
      },
    });
    return {
      id: row.id,
      fingerprint: row.fingerprint,
      pattern: row.pattern,
      reason: row.reason,
    };
  }

  private async ensureAudit(organizationId: string, auditId: string) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId },
    });
    if (!audit) throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit not found' });
    return audit;
  }

  private serializeAsset(asset: {
    id: string;
    type: string;
    name: string;
    identifier: string;
    environment: string;
    createdAt: Date;
  }) {
    return {
      id: asset.id,
      type: asset.type,
      name: asset.name,
      identifier: asset.identifier,
      environment: asset.environment,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  private serializeAudit(audit: {
    id: string;
    organizationId: string;
    assetId: string;
    status: string;
    config: unknown;
    workflowId: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    createdAt: Date;
    errorMessage?: string | null;
  }) {
    return {
      id: audit.id,
      organizationId: audit.organizationId,
      assetId: audit.assetId,
      status: audit.status,
      config: (audit.config ?? {}) as Record<string, unknown>,
      workflowId: audit.workflowId,
      startedAt: audit.startedAt?.toISOString() ?? null,
      finishedAt: audit.finishedAt?.toISOString() ?? null,
      createdAt: audit.createdAt.toISOString(),
      errorMessage: audit.errorMessage ?? null,
    };
  }
}
