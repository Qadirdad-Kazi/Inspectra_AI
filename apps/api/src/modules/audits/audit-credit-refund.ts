import { Prisma } from '@inspectra/db';
import type { PrismaService } from '../../prisma/prisma.service';
import type { BillingService } from '../billing/billing.service';

/** Restore a consumed audit credit after failure/cancel (idempotent). */
export async function refundConsumedAuditCredit(
  prisma: PrismaService,
  billing: BillingService,
  audit: {
    id: string;
    organizationId: string;
    triggeredById?: string | null;
    config: unknown;
  },
) {
  const config = { ...((audit.config ?? {}) as Record<string, unknown>) };
  const billingMeta = {
    ...((config.billing ?? {}) as {
      creditConsumed?: boolean;
      creditRefunded?: boolean;
    }),
  };
  if (!billingMeta.creditConsumed || billingMeta.creditRefunded) return;

  await billing.refundAuditCredit(audit.organizationId, audit.triggeredById ?? undefined);
  billingMeta.creditRefunded = true;
  config.billing = billingMeta;
  await prisma.audit.update({
    where: { id: audit.id },
    data: { config: config as Prisma.InputJsonValue },
  });
}
