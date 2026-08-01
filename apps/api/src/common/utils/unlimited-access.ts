/**
 * Only these emails bypass audit credit checks (unlimited audits).
 * Override with UNLIMITED_AUDIT_EMAILS=comma,separated,emails
 */
const DEFAULT_UNLIMITED = ['qadirdadkazi@gmail.com'];

export function unlimitedAuditEmails(): Set<string> {
  const fromEnv = (process.env.UNLIMITED_AUDIT_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(fromEnv.length ? fromEnv : DEFAULT_UNLIMITED);
}

export function isUnlimitedAuditEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return unlimitedAuditEmails().has(email.trim().toLowerCase());
}
