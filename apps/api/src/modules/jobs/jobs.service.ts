import { Injectable, Logger } from '@nestjs/common';
import type {
  EnqueueAuditJobInput,
  EnqueueNotificationJobInput,
  EnqueueReportJobInput,
  JobRunResponseDto,
} from './dto/job.dto';

/**
 * Legacy deferred job producer. Live audits run via WebsiteAuditRunner / StoreAuditRunner
 * (in-process). Do not use this for production billing paths until Redis/BullMQ is wired.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  async enqueueRunAudit(input: EnqueueAuditJobInput): Promise<JobRunResponseDto> {
    this.logger.warn(
      `Deferred queue path unused — audits run in-process. auditId=${input.auditId}`,
    );
    return {
      id: `jobrun_deferred_${input.auditId}`,
      type: 'run_audit',
      status: 'pending',
      queueName: 'audits',
      auditId: input.auditId,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
  }

  async enqueueGenerateReport(input: EnqueueReportJobInput): Promise<JobRunResponseDto> {
    this.logger.log(`Report job deferred reportId=${input.reportId}`);
    return {
      id: `jobrun_deferred_${input.reportId}`,
      type: 'generate_report',
      status: 'pending',
      queueName: 'reports',
      reportId: input.reportId,
      auditId: input.auditId,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
  }

  async enqueueNotification(input: EnqueueNotificationJobInput): Promise<JobRunResponseDto> {
    return {
      id: `jobrun_deferred_${input.notificationId}`,
      type: 'send_notification',
      status: 'completed',
      queueName: 'notifications',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
  }
}
