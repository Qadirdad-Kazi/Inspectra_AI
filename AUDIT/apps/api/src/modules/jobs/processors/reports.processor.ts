import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import type { EnqueueReportJobInput } from '../dto/job.dto';

@Processor(QUEUE_NAMES.REPORTS)
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  async process(job: Job<EnqueueReportJobInput>): Promise<{ ok: boolean }> {
    this.logger.log(`Processing ${job.name} reportId=${job.data.reportId}`);
    return { ok: true };
  }
}
