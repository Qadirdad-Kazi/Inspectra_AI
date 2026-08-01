# Website Audit Engine

Modular package: `@inspectra/web-audit-engine`

## Pipeline

1. **Crawl** — same-origin, robots.txt respect, rate limit, depth/page caps  
2. **Engines** — `seo`, `performance`, `accessibility`, `security`, `best_practices`  
3. **Score** — weighted average with published formula  
4. **AI report** — template recommendations; optional OpenAI enrichment via `OPENAI_API_KEY`

## API

```
POST /v1/organizations/:orgId/audits
{ "url": "https://example.com", "config": { "maxPages": 15, "maxDepth": 2 } }
```

Progress: poll `GET .../audits/:id`, `.../stages`, `.../events`, `.../findings`.

Async runner: in-process `WebsiteAuditRunner` (JobRun + AuditStage + AuditEvent persistence). See also [store-audit-engine.md](./store-audit-engine.md).
