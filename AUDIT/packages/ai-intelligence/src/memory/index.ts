import type { AiMemoryStore, MemoryEntry, MemoryKind } from '../types/index.js';

function id() {
  return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Process-local memory — useful for tests and when DB adapter is not wired. */
export function createInMemoryStore(seed: MemoryEntry[] = []): AiMemoryStore {
  const rows = [...seed];

  return {
    async list(input) {
      return rows
        .filter((r) => r.organizationId === input.organizationId)
        .filter((r) => (input.assetId ? r.assetId === input.assetId || !r.assetId : true))
        .filter((r) => (input.kinds?.length ? input.kinds.includes(r.kind) : true))
        .slice(-(input.limit ?? 50));
    },
    async put(entry) {
      const row: MemoryEntry = {
        ...entry,
        id: entry.id ?? id(),
        createdAt: new Date().toISOString(),
      };
      const idx = rows.findIndex(
        (r) =>
          r.organizationId === row.organizationId &&
          r.key === row.key &&
          (r.assetId ?? null) === (row.assetId ?? null),
      );
      if (idx >= 0) rows[idx] = row;
      else rows.push(row);
      return row;
    },
  };
}

export function memoryDigest(entries: MemoryEntry[]): string {
  if (!entries.length) return 'No prior AI memory for this asset.';
  return entries
    .slice(-12)
    .map((e) => `[${e.kind}/${e.key}] ${JSON.stringify(e.content).slice(0, 180)}`)
    .join('\n');
}

export type { MemoryEntry, MemoryKind, AiMemoryStore };
