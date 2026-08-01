import type { StoreModule, StoreModuleId, StorePlatform, StoreProvider } from '../types/index.js';

const providers = new Map<StorePlatform, StoreProvider>();
const modules = new Map<StoreModuleId, StoreModule>();

/** Pluggable registry — register providers/modules without changing the runner. */
export const storeAuditRegistry = {
  registerProvider(provider: StoreProvider) {
    providers.set(provider.id, provider);
  },
  getProvider(id: StorePlatform): StoreProvider {
    const p = providers.get(id);
    if (!p) throw new Error(`No store provider registered for ${id}`);
    return p;
  },
  listProviders(): StoreProvider[] {
    return [...providers.values()];
  },
  registerModule(module: StoreModule) {
    modules.set(module.id, module);
  },
  getModule(id: StoreModuleId): StoreModule {
    const m = modules.get(id);
    if (!m) throw new Error(`No store module registered for ${id}`);
    return m;
  },
  listModules(): StoreModule[] {
    return [...modules.values()];
  },
};
