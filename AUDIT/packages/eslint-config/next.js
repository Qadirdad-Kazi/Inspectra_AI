import { baseConfig } from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    rules: {
      // Next.js-specific rules can be extended per-app after eslint-config-next is installed
    },
  },
];
