export const AssetType = {
  WEB: 'web',
  ANDROID: 'android',
  IOS: 'ios',
  MSSTORE: 'msstore',
  API: 'api',
  EXTENSION: 'extension',
  SAAS: 'saas',
} as const;

export type AssetType = (typeof AssetType)[keyof typeof AssetType];

/** @deprecated Prefer AuditStatus — kept for transitional SDK compatibility. */
export const ScanStatus = {
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type ScanStatus = (typeof ScanStatus)[keyof typeof ScanStatus];

export const AuditStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMED_OUT: 'timed_out',
} as const;

export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus];

export const FindingSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const;

export type FindingSeverity = (typeof FindingSeverity)[keyof typeof FindingSeverity];

export const MembershipRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  ANALYST: 'analyst',
  VIEWER: 'viewer',
} as const;

export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole];

export const ReportFormat = {
  PDF: 'pdf',
  SARIF: 'sarif',
  JSON: 'json',
  CSV: 'csv',
  HTML: 'html',
} as const;

export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];

export const NotificationChannel = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  SLACK: 'slack',
} as const;

export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];
