import { bootstrapWorker } from '@inspectra/scanner-runtime';

void bootstrapWorker({
  name: 'worker-msstore',
  onStart: async () => {
    // Job loop / queue consumer will be wired later.
  },
});
