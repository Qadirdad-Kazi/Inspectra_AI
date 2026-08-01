import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@inspectra/db';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowLoggerService {
  private readonly logger = new Logger(WorkflowLoggerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    organizationId: string;
    workflowType: string;
    referenceId?: string;
    attempt?: number;
    status: 'started' | 'retry' | 'succeeded' | 'failed' | 'skipped';
    message?: string;
    meta?: Record<string, unknown>;
  }) {
    this.logger.log(
      `[${input.workflowType}] ${input.status}: ${input.message ?? ''}`.trim(),
      {
        organizationId: input.organizationId,
        referenceId: input.referenceId,
        attempt: input.attempt ?? 1,
      },
    );

    return this.prisma.workflowLog.create({
      data: {
        organizationId: input.organizationId,
        workflowType: input.workflowType,
        referenceId: input.referenceId,
        attempt: input.attempt ?? 1,
        status: input.status,
        message: input.message,
        meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /** Run fn with retries; logs each attempt. */
  async withRetry<T>(input: {
    organizationId: string;
    workflowType: string;
    referenceId?: string;
    maxAttempts?: number;
    baseDelayMs?: number;
    fn: (attempt: number) => Promise<T>;
  }): Promise<T> {
    const max = input.maxAttempts ?? 3;
    const base = input.baseDelayMs ?? 400;
    let lastError: unknown;

    for (let attempt = 1; attempt <= max; attempt++) {
      await this.log({
        organizationId: input.organizationId,
        workflowType: input.workflowType,
        referenceId: input.referenceId,
        attempt,
        status: attempt === 1 ? 'started' : 'retry',
        message: `Attempt ${attempt}/${max}`,
      });

      try {
        const result = await input.fn(attempt);
        await this.log({
          organizationId: input.organizationId,
          workflowType: input.workflowType,
          referenceId: input.referenceId,
          attempt,
          status: 'succeeded',
          message: 'Workflow completed',
        });
        return result;
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        await this.log({
          organizationId: input.organizationId,
          workflowType: input.workflowType,
          referenceId: input.referenceId,
          attempt,
          status: 'failed',
          message,
          meta: { willRetry: attempt < max },
        });
        if (attempt < max) {
          await new Promise((r) => setTimeout(r, base * 2 ** (attempt - 1)));
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
