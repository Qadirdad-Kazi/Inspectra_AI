import * as cheerio from 'cheerio';
import type { CrawlResult, EngineResult } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../helpers.js';

export function runAccessibilityEngine(crawl: CrawlResult): EngineResult {
  const findings: EngineResult['findings'] = [];
  let score = 100;
  const page = crawl.pages[0];
  if (!page?.html) {
    return {
      engineId: 'accessibility',
      label: 'Accessibility',
      score: 0,
      weight: 0.2,
      findings: [],
      metrics: {},
      summary: 'No HTML for accessibility checks.',
    };
  }

  const $ = cheerio.load(page.html);
  const lang = $('html').attr('lang');
  if (!lang) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['a11y', 'lang', page.url]),
      title: 'Missing html lang attribute',
      description: 'Screen readers use lang to select pronunciation rules.',
      severity: 'medium',
      category: 'accessibility',
      location: page.url,
      remediation: 'Set <html lang="en"> (or the correct locale).',
    }, 10);
  }

  let missingAlt = 0;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined) missingAlt += 1;
  });
  if (missingAlt > 0) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['a11y', 'alt', page.url]),
      title: 'Images missing alt attributes',
      description: `${missingAlt} <img> element(s) lack an alt attribute.`,
      severity: missingAlt > 5 ? 'high' : 'medium',
      category: 'accessibility',
      location: page.url,
      remediation: 'Provide meaningful alt text, or alt="" for decorative images.',
    }, Math.min(25, missingAlt * 3));
  }

  let unlabeledInputs = 0;
  $('input, select, textarea').each((_, el) => {
    const type = ($(el).attr('type') ?? 'text').toLowerCase();
    if (['hidden', 'submit', 'button', 'image'].includes(type)) return;
    const id = $(el).attr('id');
    const aria = $(el).attr('aria-label') || $(el).attr('aria-labelledby');
    const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
    if (!aria && !hasLabel) unlabeledInputs += 1;
  });
  if (unlabeledInputs > 0) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['a11y', 'labels', page.url]),
      title: 'Form controls without labels',
      description: `${unlabeledInputs} input(s) lack associated label/aria naming.`,
      severity: 'high',
      category: 'accessibility',
      location: page.url,
      remediation: 'Associate <label for> or provide aria-label on each control.',
    }, Math.min(20, unlabeledInputs * 4));
  }

  if ($('button, a').filter((_, el) => !$(el).text().trim() && !$(el).attr('aria-label')).length > 0) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['a11y', 'empty-controls', page.url]),
      title: 'Empty link or button names',
      description: 'Some interactive elements have no accessible name.',
      severity: 'medium',
      category: 'accessibility',
      location: page.url,
      remediation: 'Add visible text or aria-label to icon-only controls.',
    }, 8);
  }

  const skip = $('a[href="#main"], a[href="#content"], [data-skip-link]').length;
  if (!skip) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['a11y', 'skip', page.url]),
      title: 'No skip link detected',
      description: 'Keyboard users benefit from a skip-to-content link.',
      severity: 'low',
      category: 'accessibility',
      location: page.url,
      remediation: 'Add a skip navigation link as the first focusable element.',
    }, 4);
  }

  return {
    engineId: 'accessibility',
    label: 'Accessibility',
    score: clampScore(score),
    weight: 0.2,
    findings,
    metrics: {
      missingAlt,
      unlabeledInputs,
      hasLang: Boolean(lang),
    },
    summary: `Accessibility score ${clampScore(score)}/100 from automated HTML heuristics.`,
  };
}
