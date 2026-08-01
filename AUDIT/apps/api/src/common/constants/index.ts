export const ROLES = ['owner', 'admin', 'analyst', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

/** Role hierarchy: higher index = more privileged. */
export const ROLE_RANK: Record<Role, number> = {
  viewer: 1,
  analyst: 2,
  admin: 3,
  owner: 4,
};

export const API_PREFIX = 'v1';

export const QUEUE_NAMES = {
  AUDITS: 'audits',
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
  BILLING: 'billing',
} as const;
