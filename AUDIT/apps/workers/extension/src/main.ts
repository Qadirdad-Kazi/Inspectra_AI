import { bootstrapWorker } from '@inspectra/scanner-runtime';

void bootstrapWorker({
  name: 'worker-extension',
  onStart: async () => {
    // Job loop / queue consumer will be wired later.
  },
});
