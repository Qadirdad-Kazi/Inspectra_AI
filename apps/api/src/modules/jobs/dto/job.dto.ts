import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobRunResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['run_audit', 'generate_report', 'send_notification', 'sync_billing'] })
  type!: string;

  @ApiProperty({ enum: ['pending', 'queued', 'active', 'completed', 'failed', 'cancelled'] })
  status!: string;

  @ApiProperty()
  queueName!: string;

  @ApiPropertyOptional()
  externalJobId?: string | null;

  @ApiPropertyOptional()
  auditId?: string | null;

  @ApiPropertyOptional()
  reportId?: string | null;

  @ApiProperty()
  attempts!: number;

  @ApiProperty()
  createdAt!: string;
}

export type EnqueueAuditJobInput = {
  organizationId: string;
  auditId: string;
  requestedById?: string;
  config: Record<string, unknown>;
};

export type EnqueueReportJobInput = {
  organizationId: string;
  reportId: string;
  auditId: string;
  format: string;
  requestedById?: string;
};

export type EnqueueNotificationJobInput = {
  organizationId: string;
  notificationId: string;
  channel: string;
};
