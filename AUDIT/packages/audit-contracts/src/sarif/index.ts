import type { Finding } from '../findings/index.js';

/**
 * Placeholder SARIF mapper — implement conversion in a later phase.
 */
export function findingsToSarifStub(findings: Finding[]): Record<string, unknown> {
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Inspectra AI',
            informationUri: 'https://inspectra.ai',
            rules: [],
          },
        },
        results: findings.map((f) => ({
          ruleId: f.fingerprint,
          level: 'warning',
          message: { text: f.title },
        })),
      },
    ],
  };
}
