import { Injectable } from '@nestjs/common';
import { resolveLlmConfig } from '@inspectra/llm';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  live() {
    const llm = resolveLlmConfig();
    return {
      status: 'ok',
      service: 'inspectra-api',
      llm: {
        available: llm.available,
        provider: llm.provider,
        visionModel: llm.visionModel,
        defaultModel: llm.defaultModel,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async ready() {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { ok: true };
    } catch (err) {
      checks.database = {
        ok: false,
        detail: err instanceof Error ? err.message : 'db unreachable',
      };
    }

    const llm = resolveLlmConfig();
    checks.llm = {
      ok: true, // informational — audits still run without LLM
      detail: llm.available
        ? `${llm.provider} (${llm.visionModel})`
        : 'unavailable — set OPENROUTER_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY; AI_PROVIDER must not be stub',
    };

    const dbOk = checks.database?.ok === true;
    return {
      status: dbOk ? 'ready' : 'degraded',
      service: 'inspectra-api',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
