import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { resolveLlmConfig } from '../src/config.js';

const KEYS = [
  'AI_PROVIDER',
  'AI_DEFAULT_PROVIDER',
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
  'GEMINI_API_KEY',
  'LLM_API_KEY',
];

describe('resolveLlmConfig', () => {
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      prev[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  });

  it('disables when stub', () => {
    process.env.AI_DEFAULT_PROVIDER = 'stub';
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    expect(resolveLlmConfig().available).toBe(false);
  });

  it('selects openrouter when requested', () => {
    process.env.AI_PROVIDER = 'openrouter';
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    const cfg = resolveLlmConfig();
    expect(cfg.provider).toBe('openrouter');
    expect(cfg.available).toBe(true);
    expect(cfg.baseUrl).toContain('openrouter.ai');
  });

  it('selects gemini when requested', () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'gem-test';
    const cfg = resolveLlmConfig();
    expect(cfg.provider).toBe('gemini');
    expect(cfg.available).toBe(true);
    expect(cfg.baseUrl).toContain('generativelanguage.googleapis.com');
  });

  it('auto prefers openrouter then gemini then openai', () => {
    process.env.AI_DEFAULT_PROVIDER = 'auto';
    process.env.GEMINI_API_KEY = 'gem-test';
    process.env.OPENAI_API_KEY = 'sk-openai';
    expect(resolveLlmConfig().provider).toBe('gemini');

    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    expect(resolveLlmConfig().provider).toBe('openrouter');
  });
});
