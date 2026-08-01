import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  live() {
    return {
      status: 'ok',
      service: 'inspectra-api',
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

    const ok = Object.values(checks).every((c) => c.ok);
    return {
      status: ok ? 'ready' : 'degraded',
      service: 'inspectra-api',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
