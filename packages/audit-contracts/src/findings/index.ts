import { z } from 'zod';

export const FindingSchema = z.object({
  id: z.string().optional(),
  fingerprint: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  category: z.string().min(1),
  assetType: z.string().min(1),
  location: z.string().optional(),
  evidenceRefs: z.array(z.string()).default([]),
  remediation: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type Finding = z.infer<typeof FindingSchema>;
