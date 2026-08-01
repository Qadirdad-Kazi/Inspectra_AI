import * as cheerio from 'cheerio';
import type { StoreListing, StoreProvider, StoreReview } from '../types/index.js';
import { fetchText } from './helpers.js';

function extractPlayId(input: string): { storeId: string; url: string } {
  const idMatch = input.match(/[?&]id=([a-zA-Z0-9._]+)/);
  if (idMatch?.[1]) {
    return {
      storeId: idMatch[1],
      url: `https://play.google.com/store/apps/details?id=${idMatch[1]}&hl=en&gl=us`,
    };
  }
  if (/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(input.trim())) {
    const storeId = input.trim();
    return {
      storeId,
      url: `https://play.google.com/store/apps/details?id=${storeId}&hl=en&gl=us`,
    };
  }
  throw new Error('Invalid Google Play identifier (use package id or Play Store URL)');
}

/** Normalize play-lh URL; strip srcset density suffixes like " 2x". */
function cleanPlayImageUrl(raw: string): string | null {
  const trimmed = raw.trim().split(/\s+/)[0]?.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
  if (!trimmed) return null;
  if (!/play-lh\.googleusercontent\.com|googleusercontent\.com|ggpht\.com/i.test(trimmed)) {
    return null;
  }
  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https:${trimmed}`);
    return u.toString();
  } catch {
    return null;
  }
}

function imageBaseId(url: string): string {
  // play-lh URLs: https://play-lh.googleusercontent.com/<id>[=size]
  const path = url.split('?')[0] ?? url;
  return path.split('=')[0] ?? path;
}

function parseSize(url: string): { w: number; h: number } | null {
  const m = url.match(/=w(\d+)(?:-h(\d+))?/i);
  if (!m) return null;
  return { w: Number(m[1]), h: Number(m[2] ?? m[1]) };
}

/**
 * Extract screenshot URLs from Play Store HTML.
 * Cheerio img[src] alone misses srcset / JSON-embedded play-lh URLs.
 */
export function extractPlayScreenshotUrls(html: string, iconUrl?: string): string[] {
  const candidates: string[] = [];

  for (const m of html.matchAll(
    /https:\/\/play-lh\.googleusercontent\.com\/[A-Za-z0-9_\-.=]+/g,
  )) {
    const cleaned = cleanPlayImageUrl(m[0]);
    if (cleaned) candidates.push(cleaned);
  }

  // srcset / escaped JSON forms
  for (const m of html.matchAll(
    /(?:srcset|src|data-src)=["']([^"']*play-lh\.googleusercontent\.com[^"']*)["']/gi,
  )) {
    for (const part of (m[1] ?? '').split(',')) {
      const cleaned = cleanPlayImageUrl(part);
      if (cleaned) candidates.push(cleaned);
    }
  }

  const iconBase = iconUrl ? imageBaseId(cleanPlayImageUrl(iconUrl) ?? iconUrl) : null;
  const bestByBase = new Map<string, { url: string; area: number }>();

  for (const url of candidates) {
    const base = imageBaseId(url);
    if (iconBase && base === iconBase) continue;

    const size = parseSize(url);
    // Prefer phone/tablet frames; skip tiny chips and square icons
    if (size) {
      if (size.w < 200 && size.h < 200) continue;
      if (size.w === size.h && size.w <= 512) continue;
      if (size.h > 0 && size.w / size.h > 8) continue; // banner strips
    }

    const area = size ? size.w * size.h : 0;
    const hiRes = `${base}=w1080`;
    const prev = bestByBase.get(base);
    if (!prev || area >= prev.area) {
      bestByBase.set(base, { url: hiRes, area });
    }
  }

  // Prefer largest frames first (screenshots tend to be bigger than UI chrome)
  return [...bestByBase.values()]
    .sort((a, b) => b.area - a.area)
    .map((x) => x.url)
    .slice(0, 12);
}

export const googlePlayProvider: StoreProvider = {
  id: 'google_play',
  label: 'Google Play',
  resolveIdentifier: extractPlayId,

  async fetchListing({ storeId, country = 'us', language = 'en' }) {
    const url = `https://play.google.com/store/apps/details?id=${storeId}&hl=${language}&gl=${country}`;
    const html = await fetchText(url);
    const $ = cheerio.load(html);

    const title =
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.replace(/ - Apps on Google Play$/i, '').trim() ||
      storeId;
    const description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('[data-g-id="description"]').text().trim() ||
      '';
    const developer =
      $('a[href*="/store/apps/dev"]').first().text().trim() ||
      $('div:contains("Offered by")').next().text().trim() ||
      'Unknown developer';

    const ratingText =
      $('div[itemprop="starRating"]').text() ||
      $('[aria-label*="star"]').first().attr('aria-label') ||
      '';
    const ratingMatch = ratingText.match(/([0-9]+(?:\.[0-9]+)?)/);
    const rating = ratingMatch ? Number(ratingMatch[1]) : undefined;

    const iconUrl =
      $('img[alt="Icon image"]').attr('src') ||
      $('img[itemprop="image"]').attr('src') ||
      $('meta[property="og:image"]').attr('content');

    const screenshotUrls = extractPlayScreenshotUrls(html, iconUrl);

    const category =
      $('a[href*="/store/apps/category/"]').first().text().trim() || undefined;

    const installsText =
      $('div:contains("Downloads")').parent().text().match(/[\d,.]+[KMB+]*/)?.[0] ||
      undefined;

    const contentRating =
      $('img[alt*="Rated"]').attr('alt') ||
      $('span:contains("Rated for")').text().trim() ||
      undefined;

    return {
      platform: 'google_play',
      storeId,
      url,
      title,
      developer,
      description,
      shortDescription: description.slice(0, 80),
      category,
      rating,
      installsText,
      free: !/\$\d/.test($('meta[property="og:title"]').attr('content') ?? ''),
      iconUrl,
      screenshotUrls,
      contentRating,
      raw: {
        screenshotExtraction: {
          count: screenshotUrls.length,
          htmlBytes: html.length,
        },
      },
    } satisfies StoreListing;
  },

  async fetchReviews({ storeId, limit }) {
    // Public HTML does not expose a stable reviews API; return structured placeholder
    // derived from listing rating distribution when possible.
    const listing = await this.fetchListing({ storeId });
    const synthetic: StoreReview[] = [];
    const base = listing.rating ?? 4;
    for (let i = 0; i < Math.min(limit, 8); i++) {
      synthetic.push({
        id: `gp-synth-${storeId}-${i}`,
        rating: Math.max(1, Math.min(5, Math.round(base + (i % 3) - 1))),
        text: `Synthetic review sample ${i + 1} for ASO/review intelligence (Play HTML has no public review feed).`,
        author: `user${i + 1}`,
      });
    }
    return synthetic;
  },
};
