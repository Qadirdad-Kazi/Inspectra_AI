import * as cheerio from 'cheerio';
import type { StoreListing, StoreProvider, StoreReview } from '../types/index.js';
import { fetchJson, fetchText } from './helpers.js';

function resolveMsId(input: string): { storeId: string; url: string } {
  const urlMatch = input.match(/microsoft\.com\/.*\/p\/[^/]+\/([a-zA-Z0-9]+)/i);
  if (urlMatch?.[1]) {
    const storeId = urlMatch[1];
    return {
      storeId,
      url: `https://www.microsoft.com/store/productId/${storeId}`,
    };
  }
  if (/^[a-zA-Z0-9]{10,}$/.test(input.trim())) {
    const storeId = input.trim();
    return {
      storeId,
      url: `https://www.microsoft.com/store/productId/${storeId}`,
    };
  }
  // slug form
  if (input.includes('microsoft.com')) {
    return { storeId: input, url: input };
  }
  throw new Error('Invalid Microsoft Store identifier (product id or store URL)');
}

export const microsoftStoreProvider: StoreProvider = {
  id: 'microsoft_store',
  label: 'Microsoft Store',
  resolveIdentifier: resolveMsId,

  async fetchListing({ storeId, language = 'en-us' }) {
    // Display catalog API (public)
    const apiUrl = `https://displaycatalog.mp.microsoft.com/v7.0/products/${encodeURIComponent(
      storeId.startsWith('http') ? storeId.split('/').pop()! : storeId,
    )}?market=US&languages=${language}&bigIds=${encodeURIComponent(
      storeId.startsWith('http') ? storeId.split('/').pop()! : storeId,
    )}`;

    try {
      const data = await fetchJson<{
        Products?: Array<{
          ProductId?: string;
          LocalizedProperties?: Array<{
            ProductTitle?: string;
            ProductDescription?: string;
            PublisherName?: string;
            Images?: Array<{ ImagePurpose?: string; Uri?: string }>;
          }>;
          MarketProperties?: Array<{
            OriginalReleaseDateUtc?: string;
          }>;
        }>;
      }>(apiUrl);

      const product = data.Products?.[0];
      const loc = product?.LocalizedProperties?.[0];
      if (!loc) throw new Error('empty catalog');

      const images = loc.Images ?? [];
      const iconUrl = images.find((i) => /logo|icon|tile/i.test(i.ImagePurpose ?? ''))?.Uri;
      const screenshotUrls = images
        .filter((i) => /screenshot/i.test(i.ImagePurpose ?? ''))
        .map((i) => i.Uri!)
        .filter(Boolean)
        .slice(0, 12);

      return {
        platform: 'microsoft_store',
        storeId: product?.ProductId || storeId,
        url: `https://apps.microsoft.com/detail/${product?.ProductId || storeId}`,
        title: loc.ProductTitle || storeId,
        developer: loc.PublisherName || 'Unknown publisher',
        description: loc.ProductDescription || '',
        shortDescription: (loc.ProductDescription || '').slice(0, 80),
        iconUrl: iconUrl ? (iconUrl.startsWith('http') ? iconUrl : `https:${iconUrl}`) : undefined,
        screenshotUrls: screenshotUrls.map((u) => (u.startsWith('http') ? u : `https:${u}`)),
        free: true,
      } satisfies StoreListing;
    } catch {
      // HTML fallback — still try to pull screenshot-like images from the page
      const url = storeId.startsWith('http')
        ? storeId
        : `https://apps.microsoft.com/detail/${storeId}`;
      const html = await fetchText(url);
      const $ = cheerio.load(html);
      const title =
        $('h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        storeId;
      const description =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';
      const iconUrl = $('meta[property="og:image"]').attr('content');
      const screenshotUrls = [
        ...new Set(
          $('img')
            .toArray()
            .map((el) => $(el).attr('src') || $(el).attr('data-src') || '')
            .filter((src) => /^https?:\/\//i.test(src) && !/logo|icon|svg|sprite/i.test(src))
            .slice(0, 12),
        ),
      ];
      return {
        platform: 'microsoft_store',
        storeId,
        url,
        title,
        developer: 'Unknown publisher',
        description,
        shortDescription: description.slice(0, 80),
        iconUrl,
        screenshotUrls,
        free: true,
      } satisfies StoreListing;
    }
  },

  async fetchReviews() {
    // No stable public reviews API without auth — return empty for honest intelligence module.
    return [] as StoreReview[];
  },
};
