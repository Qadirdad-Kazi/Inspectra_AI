/**
 * Emails that bypass audit credit checks (unlimited audits).
 * Set UNLIMITED_AUDIT_EMAILS=comma,separated,emails — no hardcoded defaults in production.
 */
export function unlimitedAuditEmails(): Set<string> {
  const fromEnv = (process.env.UNLIMITED_AUDIT_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(fromEnv);
}

export function isUnlimitedAuditEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return unlimitedAuditEmails().has(email.trim().toLowerCase());
}
