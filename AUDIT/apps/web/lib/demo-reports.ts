/** Client-side demo reports — local samples users can browse without running an audit. */

export type DemoFinding = {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  remediation?: string;
  impactPoints?: number;
};

export type DemoSurface = {
  id: string;
  label: string;
  status: 'strong' | 'needs_work' | 'weak';
  note: string;
};

export type DemoReport = {
  id: string;
  title: string;
  subtitle: string;
  kind: 'web' | 'store';
  targetLabel: string;
  score: number; // 0–100
  summary: string;
  surfaces: DemoSurface[];
  findings: DemoFinding[];
  strengths: Array<{ title: string; detail: string }>;
  listing?: {
    developer?: string;
    category?: string;
    rating?: string;
    downloads?: string;
    iconUrl?: string;
    screenshotUrls?: string[];
    shortDescription?: string;
    description?: string;
  };
};

export const BUILTIN_DEMOS: DemoReport[] = [
  {
    id: 'web-retail-sample',
    title: 'Northwind Retail',
    subtitle: 'Website quality & security snapshot',
    kind: 'web',
    targetLabel: 'https://example.com',
    score: 72,
    summary:
      'Solid content structure and HTTPS baseline, with clear gaps in performance budgets, heading order, and security headers that keep the listing from a top-tier score.',
    surfaces: [
      { id: 'seo', label: 'SEO', status: 'strong', note: 'Titles and canonicals look intentional.' },
      {
        id: 'performance',
        label: 'Performance',
        status: 'needs_work',
        note: 'Large hero image without modern formats.',
      },
      {
        id: 'accessibility',
        label: 'Accessibility',
        status: 'needs_work',
        note: 'Skip link missing; contrast on muted text is low.',
      },
      {
        id: 'security',
        label: 'Security',
        status: 'weak',
        note: 'CSP and HSTS headers absent on primary origin.',
      },
      {
        id: 'practices',
        label: 'Best practices',
        status: 'strong',
        note: 'No mixed content; robots.txt is reachable.',
      },
    ],
    findings: [
      {
        id: 'f1',
        title: 'Missing Content-Security-Policy',
        severity: 'high',
        category: 'security',
        description:
          'The primary origin responds without a CSP, which leaves XSS blast radius larger than necessary for a public storefront.',
        remediation:
          'Ship a report-only CSP first, then enforce script-src and frame-ancestors suited to your CDNs.',
        impactPoints: 8,
      },
      {
        id: 'f2',
        title: 'Hero image not served in AVIF/WebP',
        severity: 'medium',
        category: 'performance',
        description:
          'The LCP candidate is a multi-megabyte JPEG. Mobile visitors pay for bytes they never need.',
        remediation: 'Generate AVIF/WebP derivatives and set width/height to avoid layout shift.',
        impactPoints: 5,
      },
      {
        id: 'f3',
        title: 'Heading hierarchy skips levels',
        severity: 'medium',
        category: 'accessibility',
        description: 'Several pages jump from h1 to h3, which confuses assistive navigation.',
        remediation: 'Normalize section titles to a strict h1 → h2 → h3 outline.',
        impactPoints: 4,
      },
      {
        id: 'f4',
        title: 'Muted text contrast below WCAG AA',
        severity: 'low',
        category: 'accessibility',
        description: 'Secondary copy uses #94a3b8 on white (~3.2:1).',
        remediation: 'Raise muted text to at least 4.5:1 against the page background.',
        impactPoints: 2,
      },
    ],
    strengths: [
      {
        title: 'HTTPS everywhere on crawled pages',
        detail: 'No mixed-content assets on the sampled origin.',
      },
      {
        title: 'Clear document titles',
        detail: 'Product and category pages use unique, human-readable <title> values.',
      },
    ],
  },
  {
    id: 'store-fitness-sample',
    title: 'PulseTrack Fitness',
    subtitle: 'Store listing & ASO health check',
    kind: 'store',
    targetLabel: 'App Store · sample',
    score: 68,
    summary:
      'Keyword-led title and a clear value prop in the subtitle, but creative assets and social proof are under-invested relative to category leaders.',
    listing: {
      developer: 'Inspectra Demo Studio',
      category: 'Health & Fitness',
      rating: '4.1 · 1.2K ratings',
      downloads: '50K+',
      shortDescription: 'Scan your body with a pic and get instant fitness analysis & score',
      description:
        'PulseTrack helps people understand fitness progress with on-device analysis, history charts, and plain-language coaching. This sample report shows how Inspectra presents store listing health.',
      iconUrl: 'https://picsum.photos/seed/inspectra-icon/128/128',
      screenshotUrls: [
        'https://picsum.photos/seed/inspectra-s1/320/640',
        'https://picsum.photos/seed/inspectra-s2/320/640',
        'https://picsum.photos/seed/inspectra-s3/320/640',
        'https://picsum.photos/seed/inspectra-s4/320/640',
      ],
    },
    surfaces: [
      { id: 'icon', label: 'Icon', status: 'strong', note: 'Readable at thumbnail size.' },
      { id: 'title', label: 'Title', status: 'strong', note: 'Primary keyword first.' },
      {
        id: 'subtitle',
        label: 'Subtitle',
        status: 'strong',
        note: 'States action + outcome cleanly.',
      },
      {
        id: 'screenshots',
        label: 'Screenshots',
        status: 'needs_work',
        note: 'Frame 3 is text-dense at store size.',
      },
      {
        id: 'description',
        label: 'Description',
        status: 'needs_work',
        note: 'Opens soft; bury less of the differentiator.',
      },
    ],
    findings: [
      {
        id: 's1',
        title: 'Screenshot set overloads frame 3',
        severity: 'medium',
        category: 'screenshots',
        description:
          'One frame packs too many metric chips; at store thumbnail size the value is illegible.',
        remediation: 'Feature 4–5 metrics max with larger type, or split into two frames.',
        impactPoints: 6,
      },
      {
        id: 's2',
        title: 'Description buries the differentiator',
        severity: 'medium',
        category: 'description',
        description: 'Unique on-device analysis claim appears after three generic paragraphs.',
        remediation: 'Lead with the differentiator in the first two lines above the fold.',
        impactPoints: 5,
      },
      {
        id: 's3',
        title: 'Limited social proof near the fold',
        severity: 'low',
        category: 'trust',
        description: 'Ratings exist but creative does not reinforce trust for cold traffic.',
        remediation: 'Add a discreet credibility cue in early screenshots (privacy / press).',
        impactPoints: 3,
      },
    ],
    strengths: [
      {
        title: 'Icon communicates category instantly',
        detail: 'High-contrast mark reads cleanly in search grids.',
      },
      {
        title: 'Title puts the search term first',
        detail: 'Avoids keyword stuffing while staying within character limits.',
      },
    ],
  },
];

const CUSTOM_KEY = 'inspectra_custom_demos';

export function listCustomDemos(): DemoReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DemoReport[];
  } catch {
    return [];
  }
}

export function saveCustomDemo(demo: DemoReport) {
  const all = listCustomDemos().filter((d) => d.id !== demo.id);
  all.unshift(demo);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(all.slice(0, 20)));
}

export function deleteCustomDemo(id: string) {
  const all = listCustomDemos().filter((d) => d.id !== id);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(all));
}

export function getDemoById(id: string): DemoReport | null {
  return BUILTIN_DEMOS.find((d) => d.id === id) ?? listCustomDemos().find((d) => d.id === id) ?? null;
}

export function scoreBand(score: number): { label: string; tone: 'strong' | 'fair' | 'weak' } {
  if (score >= 80) return { label: 'Strong', tone: 'strong' };
  if (score >= 60) return { label: 'Solid', tone: 'fair' };
  return { label: 'Needs work', tone: 'weak' };
}

export function toTenScale(score100: number): string {
  return (Math.round((score100 / 10) * 10) / 10).toFixed(1);
}
