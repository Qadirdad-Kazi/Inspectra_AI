import { storeAuditRegistry } from './registry/index.js';
import { googlePlayProvider } from './providers/google-play.js';
import { appleAppStoreProvider } from './providers/apple-app-store.js';
import { microsoftStoreProvider } from './providers/microsoft-store.js';
import { metadataModule } from './modules/metadata/index.js';
import { asoModule } from './modules/aso/index.js';
import { screenshotsModule } from './modules/screenshots/index.js';
import { iconModule } from './modules/icon/index.js';
import { reviewsModule } from './modules/reviews/index.js';
import { competitorsModule } from './modules/competitors/index.js';
import { computeStoreScores } from './scoring/index.js';
import { buildStoreReport } from './report/index.js';
import type {
  ModuleResult,
  StoreAuditOptions,
  StoreAuditOutput,
  StoreContext,
  StoreModuleId,
} from './types/index.js';

let bootstrapped = false;

/** Register default providers + modules (idempotent). */
export function bootstrapStoreAuditEngine() {
  if (bootstrapped) return;
  storeAuditRegistry.registerProvider(googlePlayProvider);
  storeAuditRegistry.registerProvider(appleAppStoreProvider);
  storeAuditRegistry.registerProvider(microsoftStoreProvider);
  for (const mod of [
    metadataModule,
    asoModule,
    screenshotsModule,
    iconModule,
    reviewsModule,
    competitorsModule,
  ]) {
    storeAuditRegistry.registerModule(mod);
  }
  bootstrapped = true;
}

const DEFAULT_MODULES: StoreModuleId[] = [
  'metadata',
  'aso',
  'screenshots',
  'icon',
  'reviews',
  'competitors',
];

export async function runStoreAudit(
  options: StoreAuditOptions,
): Promise<StoreAuditOutput> {
  bootstrapStoreAuditEngine();
  const provider = storeAuditRegistry.getProvider(options.platform);
  const selected = new Set(options.modules?.length ? options.modules : DEFAULT_MODULES);

  await options.onProgress?.({
    stage: 'fetch',
    message: `Fetching ${provider.label} listing`,
    progress: 0.1,
  });

  const resolved = provider.resolveIdentifier(options.identifier);
  const listing = await provider.fetchListing({
    storeId: resolved.storeId,
    country: options.country,
    language: options.language,
  });

  await options.onProgress?.({
    stage: 'reviews',
    message: 'Collecting reviews',
    progress: 0.25,
  });
  const reviews = await provider.fetchReviews({
    storeId: listing.storeId,
    country: options.country,
    language: options.language,
    limit: options.maxReviews ?? 25,
  });

  const competitors = [];
  const competitorIds = options.competitorIds ?? [];
  await options.onProgress?.({
    stage: 'competitors',
    message:
      competitorIds.length > 0
        ? `Fetching ${competitorIds.length} competitor listing(s)`
        : 'No competitors supplied — skipping peer fetch',
    progress: 0.3,
  });
  for (const [i, competitorId] of competitorIds.entries()) {
    await options.onProgress?.({
      stage: 'competitors',
      message: `Fetching competitor ${i + 1}/${competitorIds.length}`,
      progress: 0.3 + (i / Math.max(1, competitorIds.length)) * 0.15,
    });
    try {
      const cResolved = provider.resolveIdentifier(competitorId);
      const cListing = await provider.fetchListing({
        storeId: cResolved.storeId,
        country: options.country,
        language: options.language,
      });
      competitors.push(cListing);
    } catch (err) {
      // Skip failed competitors but continue audit
      console.warn(
        `Competitor fetch failed for ${competitorId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const ctx: StoreContext = { listing, reviews, competitors };

  await options.onProgress?.({
    stage: 'modules',
    message: 'Running pluggable store modules',
    progress: 0.5,
  });

  const modules: ModuleResult[] = [];
  const registryModules = storeAuditRegistry
    .listModules()
    .filter((m) => selected.has(m.id));

  for (const [index, mod] of registryModules.entries()) {
    await options.onProgress?.({
      stage: mod.id,
      message: `Running ${mod.label} module`,
      progress: 0.5 + (index / Math.max(1, registryModules.length)) * 0.4,
    });
    modules.push(await mod.analyze(ctx));
  }

  const scores = computeStoreScores(modules);
  const findings = modules.flatMap((m) => m.findings);
  const report = buildStoreReport({ listing, scores, modules, findings });

  await options.onProgress?.({
    stage: 'complete',
    message: 'Store audit complete',
    progress: 1,
  });

  return {
    platform: options.platform,
    context: ctx,
    modules,
    scores,
    findings,
    report,
  };
}

export { storeAuditRegistry } from './registry/index.js';
export * from './types/index.js';
export { computeStoreScores } from './scoring/index.js';
export { buildStoreReport } from './report/index.js';
