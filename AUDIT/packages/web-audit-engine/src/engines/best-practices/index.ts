import * as cheerio from 'cheerio';
import type { CrawlResult, EngineResult } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../helpers.js';

export function runBestPracticesEngine(crawl: CrawlResult): EngineResult {
  const findings: EngineResult['findings'] = [];
  let score = 100;
  const page = crawl.pages[0];
  if (!page?.html) {
    return {
      engineId: 'best_practices',
      label: 'Best practices',
      score: 0,
      weight: 0.15,
      findings: [],
      metrics: {},
      summary: 'No HTML for best-practice checks.',
    };
  }

  const htmlLower = page.html.slice(0, 500).toLowerCase();
  if (!htmlLower.includes('<!doctype html')) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['bp', 'doctype', page.url]),
      title: 'Missing HTML5 doctype',
      description: 'Documents should start with <!DOCTYPE html> for standards mode.',
      severity: 'low',
      category: 'best_practices',
      location: page.url,
      remediation: 'Add <!DOCTYPE html> as the first line.',
    }, 6);
  }

  const $ = cheerio.load(page.html);
  const charset =
    $('meta[charset]').attr('charset') ||
    $('meta[http-equiv="Content-Type"]').attr('content');
  if (!charset) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['bp', 'charset', page.url]),
      title: 'Missing charset declaration',
      description: 'Declare UTF-8 early to avoid encoding issues.',
      severity: 'medium',
      category: 'best_practices',
      location: page.url,
      remediation: 'Add <meta charset="utf-8"> in <head>.',
    }, 8);
  }

  const viewport = $('meta[name="viewport"]').attr('content');
  if (!viewport) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['bp', 'viewport', page.url]),
      title: 'Missing viewport meta tag',
      description: 'Mobile browsers need a viewport meta for responsive layout.',
      severity: 'medium',
      category: 'best_practices',
      location: page.url,
      remediation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
    }, 8);
  }

  if (page.url.startsWith('https:') && /http:\/\//i.test(page.html)) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['bp', 'mixed', page.url]),
      title: 'Potential mixed content references',
      description: 'HTTPS page HTML contains http:// resource references.',
      severity: 'medium',
      category: 'best_practices',
      location: page.url,
      remediation: 'Upgrade third-party/assets URLs to HTTPS.',
    }, 10);
  }

  if (/jquery-1\.|jquery-2\./i.test(page.html)) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['bp', 'jquery', page.url]),
      title: 'Legacy jQuery detected',
      description: 'Older jQuery majors may carry known vulnerabilities.',
      severity: 'low',
      category: 'best_practices',
      location: page.url,
      remediation: 'Upgrade or remove legacy jQuery dependencies.',
    }, 6);
  }

  if (crawl.errors.length > 0) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['bp', 'crawl-errors', crawl.startUrl]),
      title: 'Crawl encountered fetch errors',
      description: `${crawl.errors.length} URL(s) failed during the responsible crawl.`,
      severity: 'info',
      category: 'best_practices',
      location: crawl.startUrl,
      remediation: 'Inspect broken links and server errors in the crawl log.',
    }, 2);
  }

  return {
    engineId: 'best_practices',
    label: 'Best practices',
    score: clampScore(score),
    weight: 0.15,
    findings,
    metrics: {
      hasDoctype: htmlLower.includes('<!doctype html'),
      hasCharset: Boolean(charset),
      hasViewport: Boolean(viewport),
      crawlErrors: crawl.errors.length,
      pagesCrawled: crawl.pages.length,
    },
    summary: `Best-practices score ${clampScore(score)}/100.`,
  };
}
