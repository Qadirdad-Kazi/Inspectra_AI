const SECRET_PATTERNS: RegExp[] = [
  /\b(sk|pk|api|token|secret|password)[-_]?[A-Za-z0-9]{16,}\b/gi,
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi,
];

/** Lightweight redaction scaffold for logs / AI prompts. */
export function redactText(input: string): string {
  let output = input;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, '[REDACTED]');
  }
  return output;
}
