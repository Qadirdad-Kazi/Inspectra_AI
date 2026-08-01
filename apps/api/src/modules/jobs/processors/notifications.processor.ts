import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import type { EnqueueNotificationJobInput } from '../dto/job.dto';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<EnqueueNotificationJobInput>): Promise<{ ok: boolean }> {
    this.logger.log(
      `Processing ${job.name} notificationId=${job.data.notificationId}`,
    );
    return { ok: true };
  }
}
