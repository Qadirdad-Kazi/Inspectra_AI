import type { StoreListing, StoreProvider, StoreReview } from '../types/index.js';
import { fetchJson } from './helpers.js';

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

export const appleAppStoreProvider: StoreProvider = {
  id: 'app_store',
  label: 'Apple App Store',
  resolveIdentifier: resolveAppleId,

  async fetchListing({ storeId, country = 'us' }) {
    const result = storeId.startsWith('bundle:')
      ? await lookup({ bundleId: storeId.slice('bundle:'.length), country })
      : await lookup({ id: storeId, country });

    const screens = [
      ...(result.screenshotUrls ?? []),
      ...(result.ipadScreenshotUrls ?? []),
    ].slice(0, 12);

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
      screenshotUrls: screens,
      languages: result.languageCodesISO2A,
      sizeText: result.fileSizeBytes
        ? `${(Number(result.fileSizeBytes) / (1024 * 1024)).toFixed(1)} MB`
        : undefined,
      websiteUrl: result.sellerUrl,
      raw: { bundleId: result.bundleId },
    } satisfies StoreListing;
  },

  async fetchReviews({ storeId, country = 'us', limit }) {
    const id = storeId.startsWith('bundle:')
      ? (await this.fetchListing({ storeId })).storeId
      : storeId;

    // RSS customer reviews feed
    try {
      const xml = await (
        await import('./helpers.js')
      ).fetchText(
        `https://itunes.apple.com/${country}/rss/customerreviews/id=${id}/sortBy=mostRecent/json`,
      );
      const data = JSON.parse(xml) as {
        feed?: {
          entry?: Array<Record<string, unknown>>;
        };
      };
      const entries = data.feed?.entry ?? [];
      // First entry can be the app itself in some feeds
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
