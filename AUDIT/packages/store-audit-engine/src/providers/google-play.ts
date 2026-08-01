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

function parseAfData($: cheerio.CheerioAPI): Record<string, unknown> | null {
  const scripts = $('script').toArray();
  for (const el of scripts) {
    const text = $(el).html() ?? '';
    const m = text.match(/AF_initDataCallback\((\{[\s\S]*?\})\);/);
    if (!m?.[1]) continue;
    try {
      // Best-effort: many payloads are JS object literals; skip if not JSON.
      const keyMatch = m[1].match(/key:\s*'([^']+)'/);
      if (keyMatch) return { key: keyMatch[1], snippet: m[1].slice(0, 500) };
    } catch {
      /* continue */
    }
  }
  return null;
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

    const screenshotUrls = $('img')
      .toArray()
      .map((el) => $(el).attr('src') || $(el).attr('data-src') || '')
      .filter((src) => /googleusercontent\.com|ggpht\.com/i.test(src) && /screenshot|w\d+/i.test(src))
      .slice(0, 12);

    // Fallback: og images won't cover screenshots; keep unique
    const uniqueScreens = [...new Set(screenshotUrls)];

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
      screenshotUrls: uniqueScreens,
      contentRating,
      raw: { af: parseAfData($) ?? undefined },
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
