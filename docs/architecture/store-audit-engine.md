# Application Store Audit Engine

Modular package: `@inspectra/store-audit-engine`

## Scope

Public listing analysis for:

| Asset type | Platform id | Provider |
|---|---|---|
| `android` | `google_play` | HTML scrape of Play Store listing |
| `ios` | `app_store` | iTunes Lookup + customer reviews RSS |
| `msstore` | `microsoft_store` | Display catalog API + HTML fallback |

This phase's store engine is **observational** for findings. Prioritized fix recommendations with business/technical impact are produced by the [AI intelligence layer](./ai-intelligence.md) after the scan.

## Pipeline

1. **Fetch** — resolve ID/URL → listing metadata via pluggable provider  
2. **Reviews** — sample public reviews when available  
3. **Competitors** — optional peer listings from the same store  
4. **Modules** (registry, independently toggleable):
   - `metadata` (0.18)
   - `aso` (0.20)
   - `screenshots` (0.17) — multimodal vision when `OPENAI_API_KEY` is set; else heuristics  
   - `icon` (0.12)
   - `reviews` (0.18)
   - `competitors` (0.15)
5. **Score** — weighted average with published formula  
6. **Report** — executive summary, highlights, risks, observations (no remediations)

## Extensibility

```ts
import { storeAuditRegistry, bootstrapStoreAuditEngine } from '@inspectra/store-audit-engine';

bootstrapStoreAuditEngine();
storeAuditRegistry.registerModule(myCustomModule);
storeAuditRegistry.registerProvider(myStoreProvider);
```

## API

```
POST /v1/organizations/:orgId/audits
{
  "type": "ios",
  "storeIdentifier": "284882215",
  "config": {
    "country": "us",
    "competitorIds": ["389801252"],
    "maxReviews": 25
  }
}
```

`type` + `storeIdentifier` map to Prisma asset types `android` | `ios` | `msstore`.

Progress: poll `GET .../audits/:id`, `.../stages`, `.../events`, `.../findings`.

Async runner: in-process `StoreAuditRunner` (JobRun + AuditStage + AuditEvent + Report persistence).
