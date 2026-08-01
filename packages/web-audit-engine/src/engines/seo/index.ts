import * as cheerio from 'cheerio';
import type { CrawlResult, EngineResult } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../helpers.js';

export function runSeoEngine(crawl: CrawlResult): EngineResult {
  const findings: EngineResult['findings'] = [];
  let score = 100;
  const page = crawl.pages[0];
  if (!page?.html) {
    return {
      engineId: 'seo',
      label: 'SEO',
      score: 0,
      weight: 0.2,
      findings: [
        {
          fingerprint: fingerprint(['seo', 'no-html']),
          title: 'No HTML content crawled',
          description: 'The primary URL did not return HTML suitable for SEO checks.',
          severity: 'high',
          category: 'seo',
          remediation: 'Ensure the URL returns a 200 HTML response.',
        },
      ],
      metrics: { pagesAnalyzed: 0 },
      summary: 'SEO checks could not run — no HTML.',
    };
  }

  const $ = cheerio.load(page.html);
  const title = $('title').first().text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
  const h1Count = $('h1').length;
  const canonical = $('link[rel="canonical"]').attr('href');
  const robots = $('meta[name="robots"]').attr('content') ?? '';
  const ogTitle = $('meta[property="og:title"]').attr('content');

  if (!title) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['seo', 'title', page.url]),
      title: 'Missing document title',
      description: 'Search engines rely on <title> for relevance and SERP display.',
      severity: 'high',
      category: 'seo',
      location: page.url,
      remediation: 'Add a unique, descriptive <title> between 30–60 characters.',
    }, 20);
  } else if (title.length < 15 || title.length > 65) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['seo', 'title-length', page.url]),
      title: 'Title length outside recommended range',
      description: `Title is ${title.length} characters (recommended 30–60).`,
      severity: 'low',
      category: 'seo',
      location: page.url,
      remediation: 'Tune title length for clarity and SERP display.',
    }, 5);
  }

  if (!description) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['seo', 'meta-description', page.url]),
      title: 'Missing meta description',
      description: 'Meta descriptions influence click-through from search results.',
      severity: 'medium',
      category: 'seo',
      location: page.url,
      remediation: 'Add a unique meta description (~120–160 characters).',
    }, 12);
  }

  if (h1Count === 0) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['seo', 'h1-missing', page.url]),
      title: 'Missing H1 heading',
      description: 'Pages should expose a single primary H1 for topical clarity.',
      severity: 'medium',
      category: 'seo',
      location: page.url,
      remediation: 'Add one descriptive H1 that matches the page intent.',
    }, 10);
  } else if (h1Count > 1) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['seo', 'h1-multiple', page.url]),
      title: 'Multiple H1 headings',
      description: `Found ${h1Count} H1 elements; prefer a single primary heading.`,
      severity: 'low',
      category: 'seo',
      location: page.url,
      remediation: 'Collapse to one H1 and demote others to H2+.',
    }, 4);
  }

  if (!canonical) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['seo', 'canonical', page.url]),
      title: 'Missing canonical link',
      description: 'Canonical URLs reduce duplicate-content ambiguity.',
      severity: 'low',
      category: 'seo',
      location: page.url,
      remediation: 'Add <link rel="canonical" href="..."> pointing to the preferred URL.',
    }, 5);
  }

  if (/noindex/i.test(robots)) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['seo', 'noindex', page.url]),
      title: 'Page marked noindex',
      description: 'robots meta includes noindex, so the page will not appear in search.',
      severity: 'info',
      category: 'seo',
      location: page.url,
      remediation: 'Remove noindex if this page should be indexed.',
    }, 0);
  }

  if (!ogTitle) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['seo', 'og', page.url]),
      title: 'Missing Open Graph title',
      description: 'Social previews benefit from og:title / og:description tags.',
      severity: 'info',
      category: 'seo',
      location: page.url,
      remediation: 'Add Open Graph meta tags for richer link previews.',
    }, 3);
  }

  return {
    engineId: 'seo',
    label: 'SEO',
    score: clampScore(score),
    weight: 0.2,
    findings,
    metrics: {
      titleLength: title.length,
      hasDescription: Boolean(description),
      h1Count,
      hasCanonical: Boolean(canonical),
    },
    summary: `SEO score ${clampScore(score)}/100 across primary page signals.`,
  };
}
