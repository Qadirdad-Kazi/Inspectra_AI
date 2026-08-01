import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import type { EnqueueAuditJobInput } from '../dto/job.dto';

@Processor(QUEUE_NAMES.AUDITS)
export class AuditsProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditsProcessor.name);

  async process(job: Job<EnqueueAuditJobInput>): Promise<{ ok: boolean }> {
    this.logger.log(`Processing ${job.name} auditId=${job.data.auditId}`);
    // Contract only: orchestrator / worker dispatch comes in a later prompt.
    return { ok: true };
  }
}
