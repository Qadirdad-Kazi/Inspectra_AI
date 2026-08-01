import { createLogger } from '@inspectra/logger';

export type WorkerBootstrapOptions = {
  name: string;
  onStart?: () => Promise<void> | void;
};

/** Shared worker bootstrap scaffold. */
export async function bootstrapWorker(options: WorkerBootstrapOptions): Promise<void> {
  const log = createLogger({ name: options.name, level: 'info' });
  log.info('worker bootstrapping');
  await options.onStart?.();
  log.info('worker ready (scaffold — no job loop yet)');
}
