import * as cheerio from 'cheerio';
import type { StoreListing, StoreProvider, StoreReview } from '../types/index.js';
import { fetchJson, fetchText } from './helpers.js';

/** Microsoft Store product IDs are typically 12 alphanumeric chars (e.g. 9NSQ3623TH0N). */
const MS_PRODUCT_ID = /([0-9a-z]{12})/i;

export function extractMsProductId(input: string): string | null {
  const trimmed = input.trim();
  const detail = trimmed.match(
    /(?:apps\.)?microsoft\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?detail\/([0-9a-z]{12})/i,
  );
  if (detail?.[1]) return detail[1].toUpperCase();

  const legacy = trimmed.match(/microsoft\.com\/.*\/p\/[^/]+\/([0-9a-z]{12})/i);
  if (legacy?.[1]) return legacy[1].toUpperCase();

  const storePid = trimmed.match(/store\/productId\/([0-9a-z]{12})/i);
  if (storePid?.[1]) return storePid[1].toUpperCase();

  if (/^[0-9a-z]{12}$/i.test(trimmed)) return trimmed.toUpperCase();

  const any = trimmed.match(MS_PRODUCT_ID);
  if (any?.[1] && /microsoft\.com/i.test(trimmed)) return any[1].toUpperCase();

  return null;
}

function resolveMsId(input: string): { storeId: string; url: string } {
  const storeId = extractMsProductId(input);
  if (!storeId) {
    throw new Error('Invalid Microsoft Store identifier (product id or store URL)');
  }
  return {
    storeId,
    url: `https://apps.microsoft.com/detail/${storeId}`,
  };
}

function absoluteMsUri(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith('http')) return uri;
  if (uri.startsWith('//')) return `https:${uri}`;
  return `https://${uri.replace(/^\/+/, '')}`;
}

type MsCatalogProduct = {
  ProductId?: string;
  LocalizedProperties?: Array<{
    ProductTitle?: string;
    ShortTitle?: string;
    ProductDescription?: string;
    ShortDescription?: string;
    PublisherName?: string;
    DeveloperName?: string;
    Images?: Array<{ ImagePurpose?: string; Uri?: string }>;
  }>;
  Properties?: {
    Category?: string;
    SubCategory?: string;
    Categories?: string[];
  };
};

async function fetchMsCatalog(
  productId: string,
  market: string,
  language: string,
): Promise<MsCatalogProduct> {
  const qs = new URLSearchParams({
    market,
    languages: language,
    bigIds: productId,
  });
  // Prefer list endpoint — returns { Products: [...] }
  const listUrl = `https://displaycatalog.mp.microsoft.com/v7.0/products?${qs.toString()}`;
  try {
    const data = await fetchJson<{ Products?: MsCatalogProduct[]; Product?: MsCatalogProduct }>(
      listUrl,
    );
    const product = data.Products?.[0] ?? data.Product;
    if (product?.LocalizedProperties?.[0]) return product;
  } catch {
    /* try path style */
  }

  const pathUrl = `https://displaycatalog.mp.microsoft.com/v7.0/products/${encodeURIComponent(
    productId,
  )}?${qs.toString()}`;
  const data = await fetchJson<{ Products?: MsCatalogProduct[]; Product?: MsCatalogProduct }>(
    pathUrl,
  );
  const product = data.Product ?? data.Products?.[0];
  if (!product?.LocalizedProperties?.[0]) {
    throw new Error('empty catalog');
  }
  return product;
}

function categoryFromProduct(product: MsCatalogProduct): string | undefined {
  const props = product.Properties;
  if (!props) return undefined;
  if (props.Categories?.length) return props.Categories.join(' · ');
  if (props.Category && props.SubCategory) return `${props.Category} · ${props.SubCategory}`;
  return props.Category || props.SubCategory || undefined;
}

export const microsoftStoreProvider: StoreProvider = {
  id: 'microsoft_store',
  label: 'Microsoft Store',
  resolveIdentifier: resolveMsId,

  async fetchListing({ storeId, country = 'us', language = 'en-us' }) {
    const productId = extractMsProductId(storeId) ?? storeId.trim().toUpperCase();
    const market = (country || 'us').toUpperCase();
    const lang = language.includes('-') ? language : `${language}-${market}`;

    try {
      const product = await fetchMsCatalog(productId, market, lang);
      const loc = product.LocalizedProperties![0]!;
      const images = loc.Images ?? [];
      const iconUrl = absoluteMsUri(
        images.find((i) => /logo|icon|tile|boxart|poster/i.test(i.ImagePurpose ?? ''))?.Uri,
      );
      const screenshotUrls = images
        .filter((i) => /screenshot/i.test(i.ImagePurpose ?? ''))
        .map((i) => absoluteMsUri(i.Uri))
        .filter((u): u is string => Boolean(u))
        .slice(0, 12);

      const description = loc.ProductDescription || loc.ShortDescription || '';
      const developer =
        loc.PublisherName || loc.DeveloperName || 'Unknown publisher';

      return {
        platform: 'microsoft_store',
        storeId: product.ProductId || productId,
        url: `https://apps.microsoft.com/detail/${product.ProductId || productId}`,
        title: loc.ProductTitle || loc.ShortTitle || productId,
        developer,
        description,
        shortDescription: (loc.ShortDescription || description).slice(0, 120),
        category: categoryFromProduct(product),
        iconUrl,
        screenshotUrls,
        free: true,
        raw: { catalog: 'displaycatalog', imageCount: images.length },
      } satisfies StoreListing;
    } catch {
      // HTML fallback
      const url = `https://apps.microsoft.com/detail/${productId}`;
      const html = await fetchText(url);
      const $ = cheerio.load(html);
      const title =
        $('h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content')?.replace(/\s*\|\s*Microsoft Store.*$/i, '').trim() ||
        productId;
      const description =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';
      const iconUrl = $('meta[property="og:image"]').attr('content');
      const fromJson = [
        ...html.matchAll(
          /\/\/store-images\.s-microsoft\.com\/image\/[^"'\\\s]+/gi,
        ),
      ].map((m) => absoluteMsUri(m[0]));
      const screenshotUrls = [
        ...new Set(
          fromJson.filter(
            (u): u is string =>
              Boolean(u) && !/logo|icon|tile|boxart|poster/i.test(u!),
          ),
        ),
      ].slice(0, 12);

      return {
        platform: 'microsoft_store',
        storeId: productId,
        url,
        title,
        developer: 'Unknown publisher',
        description,
        shortDescription: description.slice(0, 120),
        iconUrl,
        screenshotUrls,
        free: true,
        raw: { catalog: 'html-fallback' },
      } satisfies StoreListing;
    }
  },

  async fetchReviews() {
    return [] as StoreReview[];
  },
};
