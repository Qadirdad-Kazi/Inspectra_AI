import { createLogger } from '@inspectra/logger';
import { scanWorkflowStub } from './workflows/scan.workflow.js';
import { reportWorkflowStub } from './workflows/report.workflow.js';

const log = createLogger({ name: 'orchestrator' });

/**
 * Temporal worker entrypoint scaffold.
 * Wire @temporalio/worker in a later phase.
 */
async function main() {
  log.info('orchestrator bootstrapping', {
    queue: process.env.ORCHESTRATOR_TASK_QUEUE ?? 'inspectra-scans',
    workflows: [scanWorkflowStub.name, reportWorkflowStub.name],
  });
  log.info('orchestrator ready (scaffold — Temporal client not connected)');
}

void main();
