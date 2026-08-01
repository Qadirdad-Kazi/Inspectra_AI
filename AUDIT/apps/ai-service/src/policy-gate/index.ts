import { redactText } from '@inspectra/redaction';

/** Ensure prompts never receive raw secrets (scaffold). */
export function policyGateStub(input: string) {
  const redacted = redactText(input);
  return {
    allowed: true,
    redacted,
    module: 'policy-gate',
  };
}
