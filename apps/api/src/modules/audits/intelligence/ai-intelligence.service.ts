import { Injectable, Logger } from '@nestjs/common';
import {
  runIntelligence,
  type AiMemoryStore,
  type IntelligenceInput,
  type IntelligenceOutput,
  type MemoryEntry,
  type MemoryKind,
} from '@inspectra/ai-intelligence';
import { Prisma } from '@inspectra/db';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PrismaAiMemoryStore implements AiMemoryStore {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: {
    organizationId: string;
    assetId?: string;
    kinds?: MemoryKind[];
    limit?: number;
  }): Promise<MemoryEntry[]> {
    const rows = await this.prisma.aiMemoryEntry.findMany({
      where: {
        organizationId: input.organizationId,
        ...(input.assetId
          ? { OR: [{ assetId: input.assetId }, { assetId: null }] }
          : {}),
        ...(input.kinds?.length ? { kind: { in: input.kinds } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: input.limit ?? 50,
    });

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      assetId: r.assetId,
      auditId: r.auditId,
      key: r.key,
      kind: r.kind as MemoryKind,
      content: (r.content ?? {}) as Record<string, unknown>,
      promptVersion: r.promptVersion,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async put(
    entry: Omit<MemoryEntry, 'id' | 'createdAt'> & { id?: string },
  ): Promise<MemoryEntry> {
    const assetId = entry.assetId ?? null;
    const existing = await this.prisma.aiMemoryEntry.findFirst({
      where: {
        organizationId: entry.organizationId,
        key: entry.key,
        assetId,
      },
    });

    const data = {
      organizationId: entry.organizationId,
      assetId,
      auditId: entry.auditId ?? null,
      key: entry.key,
      kind: entry.kind,
      content: entry.content as Prisma.InputJsonValue,
      promptVersion: entry.promptVersion ?? null,
      expiresAt: entry.expiresAt ? new Date(entry.expiresAt) : null,
    };

    const row = existing
      ? await this.prisma.aiMemoryEntry.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.aiMemoryEntry.create({ data });

    return {
      id: row.id,
      organizationId: row.organizationId,
      assetId: row.assetId,
      auditId: row.auditId,
      key: row.key,
      kind: row.kind as MemoryKind,
      content: (row.content ?? {}) as Record<string, unknown>,
      promptVersion: row.promptVersion,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

@Injectable()
export class AiIntelligenceService {
  private readonly logger = new Logger(AiIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memory: PrismaAiMemoryStore,
  ) {}

  async runForAudit(auditId: string): Promise<IntelligenceOutput | null> {
    const audit = await this.prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        asset: true,
        findings: true,
        organization: { include: { settings: true } },
      },
    });
    if (!audit) return null;

    const config = (audit.config ?? {}) as Record<string, unknown>;
    const kind =
      (config.kind as string) === 'store' ||
      ['android', 'ios', 'msstore'].includes(audit.asset.type)
        ? 'store'
        : 'website';

    const allowLlm = audit.organization.settings?.allowAiTriage !== false;
    const scores = (config.scores ?? {}) as {
      overall?: number;
      engines?: Array<{
        label: string;
        score: number;
        weight: number;
        contribution?: number;
        engineId?: string;
        moduleId?: string;
      }>;
      modules?: Array<{
        label: string;
        score: number;
        weight: number;
        contribution?: number;
        moduleId?: string;
      }>;
      formula?: string;
    };

    const breakdown = (scores.engines ?? scores.modules ?? []).map((row, i) => {
      const rawId =
        ('engineId' in row && typeof row.engineId === 'string' && row.engineId) ||
        ('moduleId' in row && typeof row.moduleId === 'string' && row.moduleId) ||
        row.label.toLowerCase().replace(/\s+/g, '_') ||
        `m${i}`;
      return {
        id: String(rawId),
        label: row.label,
        score: row.score,
        weight: row.weight,
      };
    });

    const input: IntelligenceInput = {
      kind,
      organizationId: audit.organizationId,
      assetId: audit.assetId,
      auditId: audit.id,
      target: {
        label:
          (config.listing as { title?: string } | undefined)?.title ??
          audit.asset.name ??
          audit.asset.identifier,
        url:
          kind === 'website'
            ? audit.asset.identifier
            : (config.listing as { url?: string } | undefined)?.url,
        platform: (config.platform as string | undefined) ?? audit.asset.type,
      },
      scores: {
        overall: scores.overall ?? 0,
        breakdown,
        formula: scores.formula,
      },
      findings: audit.findings.map((f) => ({
        fingerprint: f.fingerprint,
        title: f.title,
        description: f.description,
        severity: f.severity as IntelligenceInput['findings'][number]['severity'],
        category: f.category,
        location: f.location ?? undefined,
        remediation: f.remediation ?? undefined,
      })),
      extras: {
        listing: config.listing ?? null,
        storeReport: config.storeReport ?? null,
        crawl: config.crawl ?? null,
        aiReport: config.aiReport ?? null,
      },
      memory: this.memory,
      enableLlm: allowLlm,
      modelConfig: {
        // Resolved from AI_PROVIDER + OPENAI_/OPENROUTER_/GEMINI_ keys in @inspectra/llm
        agentModels: {},
      },
    };

    const result = await runIntelligence({
      ...input,
      onProgress: async (event) => {
        await this.prisma.auditEvent.create({
          data: {
            auditId,
            type: 'audit.intelligence.progress',
            message: event.message,
            payload: {
              stage: event.stage,
              progress: event.progress,
            } as Prisma.InputJsonValue,
          },
        });
      },
    });

    await this.persist(auditId, config, result);
    return result;
  }

  private async persist(
    auditId: string,
    priorConfig: Record<string, unknown>,
    result: IntelligenceOutput,
  ) {
    const nextConfig = {
      ...priorConfig,
      aiIntelligence: {
        executiveSummary: result.executiveSummary,
        recommendations: result.recommendations,
        agents: result.agents.map((a) => ({
          agentId: a.agentId,
          label: a.label,
          summary: a.summary,
          recommendationCount: a.recommendations.length,
          promptVersion: a.promptVersion,
          model: a.model,
          generatedBy: a.generatedBy,
        })),
        modelSelection: result.modelSelection,
        promptVersions: result.promptVersions,
        generatedBy: result.generatedBy,
        memoryWritten: result.memoryWritten,
      },
      // Keep legacy web card hydrated with detailed impact text
      aiReport: result.legacyReport,
    };

    await this.prisma.audit.update({
      where: { id: auditId },
      data: { config: nextConfig as Prisma.InputJsonValue },
    });

    await this.prisma.auditEvent.create({
      data: {
        auditId,
        type: 'audit.intelligence.ready',
        message: 'AI intelligence recommendations ready',
        payload: {
          recommendationCount: result.recommendations.length,
          generatedBy: result.generatedBy,
          modelSelection: result.modelSelection,
        } as Prisma.InputJsonValue,
      },
    });

    // Optional: attach remediations onto findings when fingerprint matches
    for (const rec of result.recommendations) {
      for (const fp of rec.relatedFindings) {
        try {
          await this.prisma.finding.updateMany({
            where: { auditId, fingerprint: fp, remediation: null },
            data: {
              remediation: [
                rec.summary,
                `Business impact: ${rec.businessImpact.explanation}`,
                `Technical impact: ${rec.technicalImpact.explanation} (effort ${rec.technicalImpact.effort})`,
                ...rec.actions.map((a) => `• ${a}`),
              ].join('\n'),
            },
          });
        } catch (err) {
          this.logger.warn(
            `Failed to attach remediation for ${fp}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }
  }
}
