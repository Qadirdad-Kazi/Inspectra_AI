import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, JobType, Prisma } from '@inspectra/db';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowLoggerService } from '../../common/workflow/workflow-logger.service';

const SUPPORTED = new Set(['slack', 'jira']);

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowLoggerService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.prisma.integration.findMany({
      where: { organizationId },
      orderBy: { type: 'asc' },
      take: 50,
    });
    return {
      data: rows.map((r) => this.serialize(r)),
      supported: [...SUPPORTED],
    };
  }

  async upsert(
    organizationId: string,
    type: string,
    config: Record<string, unknown>,
    status = 'active',
  ) {
    if (!SUPPORTED.has(type)) {
      throw new BadRequestException({
        code: 'INTEGRATION_UNSUPPORTED',
        message: `Supported: ${[...SUPPORTED].join(', ')}`,
      });
    }
    const row = await this.prisma.integration.upsert({
      where: { organizationId_type: { organizationId, type } },
      create: {
        organizationId,
        type,
        status,
        config: config as Prisma.InputJsonValue,
      },
      update: {
        status,
        config: config as Prisma.InputJsonValue,
      },
    });
    return this.serialize(row);
  }

  async remove(organizationId: string, type: string) {
    await this.prisma.integration.deleteMany({ where: { organizationId, type } });
    return { ok: true };
  }

  async test(organizationId: string, type: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { organizationId_type: { organizationId, type } },
    });
    if (!integration) {
      throw new NotFoundException({
        code: 'INTEGRATION_NOT_FOUND',
        message: 'Configure the integration first',
      });
    }

    return this.workflows.withRetry({
      organizationId,
      workflowType: `integration.${type}.test`,
      referenceId: integration.id,
      maxAttempts: 3,
      fn: async () => {
        if (type === 'slack') {
          return this.postSlack(
            integration.config as { webhookUrl?: string },
            {
              text: 'Inspectra AI connected successfully.',
            },
          );
        }
        if (type === 'jira') {
          return this.createJiraIssue(integration.config as Record<string, string>, {
            summary: 'Inspectra AI connectivity check',
            description: 'Automated test issue from Inspectra integrations.',
          });
        }
        throw new Error('Unsupported integration');
      },
    });
  }

  async notifyAuditComplete(organizationId: string, payload: {
    title: string;
    score: number;
    findings: number;
    auditId: string;
    url?: string;
  }) {
    const slack = await this.prisma.integration.findUnique({
      where: { organizationId_type: { organizationId, type: 'slack' } },
    });
    if (slack?.status === 'active') {
      await this.workflows.withRetry({
        organizationId,
        workflowType: 'integration.slack.notify',
        referenceId: slack.id,
        maxAttempts: 3,
        fn: async () =>
          this.postSlack(slack.config as { webhookUrl?: string }, {
            text: `Audit complete: *${payload.title}* scored ${payload.score}/100 (${payload.findings} findings).`,
          }),
      }).catch(() => undefined);
    }
  }

  async createJiraFromFinding(
    organizationId: string,
    input: { summary: string; description: string },
  ) {
    const jira = await this.prisma.integration.findUnique({
      where: { organizationId_type: { organizationId, type: 'jira' } },
    });
    if (!jira || jira.status !== 'active') {
      throw new BadRequestException({
        code: 'JIRA_NOT_CONFIGURED',
        message: 'Enable the Jira integration first',
      });
    }

    const job = await this.prisma.jobRun.create({
      data: {
        organizationId,
        type: JobType.sync_integration,
        status: JobStatus.active,
        queueName: 'notifications',
        startedAt: new Date(),
        input: input as Prisma.InputJsonValue,
      },
    });

    try {
      const result = await this.workflows.withRetry({
        organizationId,
        workflowType: 'integration.jira.create_issue',
        referenceId: jira.id,
        maxAttempts: 3,
        fn: async () =>
          this.createJiraIssue(jira.config as Record<string, string>, input),
      });
      await this.prisma.jobRun.update({
        where: { id: job.id },
        data: {
          status: JobStatus.completed,
          finishedAt: new Date(),
          output: result as Prisma.InputJsonValue,
        },
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Jira sync failed';
      await this.prisma.jobRun.update({
        where: { id: job.id },
        data: {
          status: JobStatus.failed,
          finishedAt: new Date(),
          errorMessage: message,
        },
      });
      throw err;
    }
  }

  private async postSlack(
    config: { webhookUrl?: string },
    body: { text: string },
  ) {
    if (!config.webhookUrl) throw new Error('Slack webhookUrl missing');
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Slack webhook failed (${res.status})`);
    return { ok: true, provider: 'slack' };
  }

  private async createJiraIssue(
    config: Record<string, string>,
    input: { summary: string; description: string },
  ) {
    const { baseUrl, email, apiToken, projectKey } = config;
    if (!baseUrl || !email || !apiToken || !projectKey) {
      throw new Error('Jira requires baseUrl, email, apiToken, projectKey');
    }
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary: input.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: input.description }],
              },
            ],
          },
          issuetype: { name: config.issueType || 'Task' },
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jira API failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as { id?: string; key?: string };
    return { ok: true, provider: 'jira', id: data.id, key: data.key };
  }

  private serialize(row: {
    id: string;
    type: string;
    status: string;
    config: unknown;
    updatedAt: Date;
  }) {
    const config = (row.config ?? {}) as Record<string, unknown>;
    const redacted = { ...config };
    if (typeof redacted.apiToken === 'string') redacted.apiToken = '••••';
    if (typeof redacted.webhookUrl === 'string') {
      redacted.webhookUrl = String(redacted.webhookUrl).replace(
        /^(https?:\/\/[^/]+).*/,
        '$1/…',
      );
    }
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      config: redacted,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
