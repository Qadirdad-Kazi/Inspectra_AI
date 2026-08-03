import type { StoreListing, StoreProvider, StoreReview } from '../types/index.js';
import { fetchJson, fetchText } from './helpers.js';

type ItunesResult = {
  trackId: number;
  trackName: string;
  trackViewUrl: string;
  artistName: string;
  description?: string;
  averageUserRating?: number;
  userRatingCount?: number;
  primaryGenreName?: string;
  genres?: string[];
  artworkUrl512?: string;
  artworkUrl100?: string;
  screenshotUrls?: string[];
  ipadScreenshotUrls?: string[];
  appletvScreenshotUrls?: string[];
  version?: string;
  currentVersionReleaseDate?: string;
  contentAdvisoryRating?: string;
  formattedPrice?: string;
  price?: number;
  languageCodesISO2A?: string[];
  fileSizeBytes?: string;
  sellerUrl?: string;
  bundleId?: string;
};

function resolveAppleId(input: string): { storeId: string; url: string } {
  const idMatch = input.match(/id(\d{6,})/i) || input.match(/^(\d{6,})$/);
  if (idMatch?.[1]) {
    const storeId = idMatch[1];
    return {
      storeId,
      url: `https://apps.apple.com/app/id${storeId}`,
    };
  }
  if (input.includes('.')) {
    // bundle id — resolve via lookup later; provisional URL
    return { storeId: `bundle:${input.trim()}`, url: input };
  }
  throw new Error('Invalid App Store identifier (use numeric id, App Store URL, or bundle id)');
}

async function lookup(params: Record<string, string>): Promise<ItunesResult> {
  const qs = new URLSearchParams({ country: 'us', ...params });
  const data = await fetchJson<{ resultCount: number; results: ItunesResult[] }>(
    `https://itunes.apple.com/lookup?${qs.toString()}`,
  );
  if (!data.results?.[0]) throw new Error('App Store listing not found via iTunes Lookup API');
  return data.results[0]!;
}

/** Materialize Apple CDN thumb templates into a concrete JPEG URL. */
export function materializeMzstaticUrl(raw: string): string | null {
  let u = raw
    .trim()
    .replace(/\\u002F/g, '/')
    .replace(/\\+/g, '')
    .split(/\s+/)[0];
  if (!u || !/mzstatic\.com/i.test(u)) return null;
  if (!u.startsWith('http')) u = `https:${u}`;
  if (u.includes('{w}x{h}')) {
    u = u
      .replace('{w}x{h}{c}.{f}', '600x1300bb.jpg')
      .replace('{w}x{h}sr.{f}', '600x1300bb.jpg')
      .replace('{w}x{h}bb.{f}', '600x1300bb.jpg')
      .replace('{w}x{h}{c}', '600x1300bb')
      .replace('{f}', 'jpg');
  }
  try {
    return new URL(u).toString();
  } catch {
    return null;
  }
}

function screenshotBaseKey(url: string): string {
  // Drop trailing size variant so 157x340 and 600x1300 of same asset collapse
  return url.replace(/\/\d+x\d+[^.\/]*\.(jpg|jpeg|webp|png)(\?.*)?$/i, '');
}

/**
 * iTunes Lookup often returns empty screenshotUrls now.
 * Fall back to scraping apps.apple.com HTML for PurpleSource / Display frames.
 */
export function extractAppleScreenshotUrls(html: string): string[] {
  const candidates: string[] = [];
  for (const m of html.matchAll(
    /https:\/\/(?:is\d+-ssl\.)?mzstatic\.com\/image\/thumb\/[^"'\\\s<>]+/gi,
  )) {
    const url = materializeMzstaticUrl(m[0]);
    if (!url) continue;
    if (!/PurpleSource|App_Store_Image|Display_/i.test(url)) continue;
    if (/Placeholder\.mill|Features\d+|\/\d+x\d+ia-/i.test(url)) continue;
    candidates.push(url);
  }

  const best = new Map<string, string>();
  for (const url of candidates) {
    const key = screenshotBaseKey(url);
    const prev = best.get(key);
    // Prefer larger concrete sizes when present
    const score = Number(url.match(/\/(\d+)x(\d+)/)?.[1] ?? 0);
    const prevScore = Number(prev?.match(/\/(\d+)x(\d+)/)?.[1] ?? 0);
    if (!prev || score >= prevScore) best.set(key, url);
  }

  return [...best.values()].slice(0, 12);
}

async function scrapeAppleScreenshots(trackId: string, country = 'us'): Promise<string[]> {
  const url = `https://apps.apple.com/${country}/app/id${trackId}`;
  const html = await fetchText(url);
  return extractAppleScreenshotUrls(html);
}

export const appleAppStoreProvider: StoreProvider = {
  id: 'app_store',
  label: 'Apple App Store',
  resolveIdentifier: resolveAppleId,

  async fetchListing({ storeId, country = 'us' }) {
    const result = storeId.startsWith('bundle:')
      ? await lookup({ bundleId: storeId.slice('bundle:'.length), country })
      : await lookup({ id: storeId, country });

    let screens = [
      ...(result.screenshotUrls ?? []),
      ...(result.ipadScreenshotUrls ?? []),
    ].filter(Boolean);

    if (screens.length === 0) {
      try {
        screens = await scrapeAppleScreenshots(String(result.trackId), country);
      } catch {
        screens = [];
      }
    }

    return {
      platform: 'app_store',
      storeId: String(result.trackId),
      url: result.trackViewUrl,
      title: result.trackName,
      developer: result.artistName,
      description: result.description ?? '',
      shortDescription: (result.description ?? '').slice(0, 80),
      category: result.primaryGenreName,
      categories: result.genres,
      rating: result.averageUserRating,
      ratingCount: result.userRatingCount,
      version: result.version,
      updatedAt: result.currentVersionReleaseDate,
      contentRating: result.contentAdvisoryRating,
      price: result.formattedPrice,
      free: (result.price ?? 0) === 0,
      iconUrl: result.artworkUrl512 || result.artworkUrl100,
      screenshotUrls: screens.slice(0, 12),
      languages: result.languageCodesISO2A,
      sizeText: result.fileSizeBytes
        ? `${(Number(result.fileSizeBytes) / (1024 * 1024)).toFixed(1)} MB`
        : undefined,
      websiteUrl: result.sellerUrl,
      raw: {
        bundleId: result.bundleId,
        screenshotSource: (result.screenshotUrls?.length ?? 0) > 0 ? 'itunes' : 'html-scrape',
      },
    } satisfies StoreListing;
  },

  async fetchReviews({ storeId, country = 'us', limit }) {
    const id = storeId.startsWith('bundle:')
      ? (await this.fetchListing({ storeId })).storeId
      : storeId;

    // RSS customer reviews feed
    try {
      const xml = await fetchText(
        `https://itunes.apple.com/${country}/rss/customerreviews/id=${id}/sortBy=mostRecent/json`,
      );
      const data = JSON.parse(xml) as {
        feed?: {
          entry?: Array<Record<string, unknown>>;
        };
      };
      const entries = data.feed?.entry ?? [];
      const reviews: StoreReview[] = [];
      for (const entry of entries) {
        const rating = Number(
          (entry['im:rating'] as { label?: string } | undefined)?.label ?? 0,
        );
        const title = (entry.title as { label?: string } | undefined)?.label;
        const text = (entry.content as { label?: string } | undefined)?.label;
        const author = (
          entry.author as { name?: { label?: string } } | undefined
        )?.name?.label;
        const idLabel = (entry.id as { label?: string } | undefined)?.label;
        if (!text || !rating) continue;
        reviews.push({
          id: idLabel || `ios-${reviews.length}`,
          author,
          rating,
          title,
          text,
        });
        if (reviews.length >= limit) break;
      }
      return reviews;
    } catch {
      return [];
    }
  },
};
