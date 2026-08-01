import type { CrawlResult, EngineResult } from '../../types/index.js';
import { clampScore, deduct, fingerprint } from '../helpers.js';

export function runSecurityEngine(crawl: CrawlResult): EngineResult {
  const findings: EngineResult['findings'] = [];
  let score = 100;
  const page = crawl.pages[0];
  if (!page) {
    return {
      engineId: 'security',
      label: 'Security',
      score: 0,
      weight: 0.25,
      findings: [],
      metrics: {},
      summary: 'No pages for security analysis.',
    };
  }

  const url = new URL(page.url);
  if (url.protocol !== 'https:') {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['sec', 'https', page.url]),
      title: 'Site not served over HTTPS',
      description: 'Transport is HTTP; credentials and cookies can be intercepted.',
      severity: 'critical',
      category: 'security',
      location: page.url,
      remediation: 'Terminate TLS and redirect all HTTP traffic to HTTPS.',
    }, 40);
  }

  const headers = page.headers;
  if (!headers['strict-transport-security']) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['sec', 'hsts', page.url]),
      title: 'Missing Strict-Transport-Security',
      description: 'HSTS prevents protocol downgrade attacks after first visit.',
      severity: 'medium',
      category: 'security',
      location: page.url,
      remediation: 'Send Strict-Transport-Security with a long max-age.',
    }, 8);
  }

  if (!headers['content-security-policy']) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['sec', 'csp', page.url]),
      title: 'Missing Content-Security-Policy',
      description: 'CSP reduces XSS blast radius by restricting script sources.',
      severity: 'high',
      category: 'security',
      location: page.url,
      remediation: 'Deploy a CSP (start with Report-Only, then enforce).',
    }, 12);
  }

  if (!headers['x-frame-options'] && !/frame-ancestors/i.test(headers['content-security-policy'] ?? '')) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['sec', 'clickjacking', page.url]),
      title: 'Clickjacking protections missing',
      description: 'No X-Frame-Options or CSP frame-ancestors directive found.',
      severity: 'medium',
      category: 'security',
      location: page.url,
      remediation: 'Set X-Frame-Options: DENY (or CSP frame-ancestors).',
    }, 8);
  }

  if (!headers['x-content-type-options']) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['sec', 'nosniff', page.url]),
      title: 'Missing X-Content-Type-Options',
      description: 'Browsers may MIME-sniff responses without nosniff.',
      severity: 'low',
      category: 'security',
      location: page.url,
      remediation: 'Send X-Content-Type-Options: nosniff.',
    }, 4);
  }

  if (!headers['referrer-policy']) {
    score = deduct(score, findings, {
      fingerprint: fingerprint(['sec', 'referrer', page.url]),
      title: 'Missing Referrer-Policy',
      description: 'Referrer leakage can expose path/query data to third parties.',
      severity: 'low',
      category: 'security',
      location: page.url,
      remediation: 'Set Referrer-Policy: strict-origin-when-cross-origin (or stricter).',
    }, 3);
  }

  const cookies = headers['set-cookie'] ?? '';
  if (cookies) {
    if (!/;\s*Secure/i.test(cookies)) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['sec', 'cookie-secure', page.url]),
        title: 'Cookie missing Secure flag',
        description: 'Set-Cookie observed without Secure attribute.',
        severity: 'high',
        category: 'security',
        location: page.url,
        remediation: 'Mark cookies Secure; Prefer HttpOnly and SameSite too.',
      }, 10);
    }
    if (!/;\s*HttpOnly/i.test(cookies)) {
      score = deduct(score, findings, {
        fingerprint: fingerprint(['sec', 'cookie-httponly', page.url]),
        title: 'Cookie missing HttpOnly flag',
        description: 'Non-HttpOnly cookies are readable by JavaScript (XSS risk).',
        severity: 'medium',
        category: 'security',
        location: page.url,
        remediation: 'Add HttpOnly to session cookies.',
      }, 8);
    }
  }

  return {
    engineId: 'security',
    label: 'Security',
    score: clampScore(score),
    weight: 0.25,
    findings,
    metrics: {
      https: url.protocol === 'https:',
      hasHsts: Boolean(headers['strict-transport-security']),
      hasCsp: Boolean(headers['content-security-policy']),
    },
    summary: `Security score ${clampScore(score)}/100 from transport and header posture.`,
  };
}
