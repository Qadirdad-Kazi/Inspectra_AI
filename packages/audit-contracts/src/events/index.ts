import { z } from 'zod';
import { AuditStatus } from '../enums/index.js';

export const ScanEventSchema = z.object({
  scanId: z.string().min(1).optional(),
  auditId: z.string().min(1),
  type: z.enum([
    'audit.queued',
    'audit.started',
    'audit.stage.started',
    'audit.stage.completed',
    'audit.finding',
    'audit.completed',
    'audit.failed',
    'audit.cancelled',
  ]),
  status: z.enum([
    AuditStatus.DRAFT,
    AuditStatus.PENDING,
    AuditStatus.QUEUED,
    AuditStatus.RUNNING,
    AuditStatus.SUCCEEDED,
    AuditStatus.FAILED,
    AuditStatus.CANCELLED,
    AuditStatus.TIMED_OUT,
  ]),
  timestamp: z.string().datetime(),
  message: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export type ScanEvent = z.infer<typeof ScanEventSchema>;
export type AuditEventContract = ScanEvent;
