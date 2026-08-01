import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const audits = await this.prisma.audit.findMany({
      where: { organizationId, createdAt: { gte: since } },
      include: { asset: true },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });

    const byStatus: Record<string, number> = {};
    const scoreSeries: Array<{ date: string; score: number; auditId: string; target: string }> = [];
    let scoreSum = 0;
    let scoreCount = 0;

    for (const a of audits) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
      const scores = (a.config as { scores?: { overall?: number } })?.scores;
      if (typeof scores?.overall === 'number') {
        scoreSum += scores.overall;
        scoreCount += 1;
        scoreSeries.push({
          date: a.createdAt.toISOString().slice(0, 10),
          score: scores.overall,
          auditId: a.id,
          target: a.asset.identifier,
        });
      }
    }

    const findings = await this.prisma.finding.groupBy({
      by: ['severity'],
      where: { audit: { organizationId } },
      _count: true,
    });

    const reportsReady = await this.prisma.report.count({
      where: { organizationId, status: 'ready' },
    });

    const schedulesActive = await this.prisma.auditSchedule.count({
      where: { organizationId, isActive: true },
    });

    // Average score by day for chart
    const byDay = new Map<string, { sum: number; n: number }>();
    for (const point of scoreSeries) {
      const cur = byDay.get(point.date) ?? { sum: 0, n: 0 };
      cur.sum += point.score;
      cur.n += 1;
      byDay.set(point.date, cur);
    }
    const scoreTrend = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, averageScore: Math.round(v.sum / v.n) }));

    return {
      windowDays: 90,
      totals: {
        audits: audits.length,
        averageScore: scoreCount ? Math.round(scoreSum / scoreCount) : null,
        reportsReady,
        schedulesActive,
        findings: Object.fromEntries(findings.map((f) => [f.severity, f._count])),
      },
      auditsByStatus: byStatus,
      scoreTrend,
      recentScores: scoreSeries.slice(-12).reverse(),
    };
  }

  async workflowLogs(organizationId: string, limit = 50) {
    const rows = await this.prisma.workflowLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        workflowType: r.workflowType,
        referenceId: r.referenceId,
        attempt: r.attempt,
        status: r.status,
        message: r.message,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
