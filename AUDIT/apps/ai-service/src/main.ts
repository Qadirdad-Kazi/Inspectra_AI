import Fastify from 'fastify';
import { createLogger } from '@inspectra/logger';
import { triageStub } from './triage/index.js';
import { intelligenceMeta, runRemediationOrchestrator } from './remediation/index.js';
import { ragStub } from './rag/index.js';
import { policyGateStub } from './policy-gate/index.js';

const log = createLogger({ name: 'ai-service' });

async function main() {
  const app = Fastify({ logger: false });
  const port = Number(process.env.AI_SERVICE_PORT ?? 4100);

  app.get('/health', async () => ({
    status: 'ok',
    service: 'inspectra-ai-service',
  }));

  app.get('/v1/intelligence/meta', async () => intelligenceMeta());

  app.post('/v1/triage', async () => triageStub());
  app.post('/v1/remediation', async (req) => runRemediationOrchestrator(req.body));
  app.post('/v1/intelligence', async (req) => runRemediationOrchestrator(req.body));
  app.post('/v1/rag/query', async () => ragStub());
  app.post('/v1/policy-gate', async (req) =>
    policyGateStub(typeof req.body === 'object' && req.body ? JSON.stringify(req.body) : ''),
  );

  await app.listen({ port, host: '0.0.0.0' });
  log.info('ai-service listening', { port });
}

void main();
