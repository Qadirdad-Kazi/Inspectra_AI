import { bootstrapWorker } from '@inspectra/scanner-runtime';

void bootstrapWorker({
  name: 'worker-ios',
  onStart: async () => {
    // Job loop / queue consumer will be wired later.
  },
});
