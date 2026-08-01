# AI Intelligence Layer

Modular package: `@inspectra/ai-intelligence`

Not a chatbot — a **specialist-agent orchestrator** that consumes audit results and emits prioritized recommendations with explicit business and technical impact.

## Agents

| Agent | Website | Store |
|---|---|---|
| Executive summary | ✓ | ✓ |
| SEO | ✓ | |
| Performance | ✓ | |
| Accessibility | ✓ | |
| Security | ✓ | |
| UX | ✓ | ✓ |
| Branding | | ✓ |
| Review intelligence | | ✓ |
| Competitor analysis | | ✓ |
| Report writer | ✓ | ✓ |

## Capabilities

- **Prompt versioning** — `PROMPT_REGISTRY` + `ACTIVE_PROMPTS` (each recommendation records `promptVersion`)
- **Model selection** — `OPENAI_MODEL` default, per-agent overrides via `modelConfig.agentModels`
- **AI memory** — `AiMemoryStore` interface; Prisma `ai_memory_entries` in API; in-memory for tests / ai-service
- **Ranking** — impact vs effort + confidence
- **LLM optional** — heuristics always run; OpenAI enrichment when `OPENAI_API_KEY` and org `allowAiTriage`

## Recommendation shape

Each recommendation includes:

- `businessImpact` — level, explanation, estimatedBenefit
- `technicalImpact` — level, explanation, effort (`xs`…`xl`)
- `actions[]`, related finding fingerprints, confidence, model, prompt version

## API

Auto-runs after website/store audits (`intelligence` stage).

```
POST /v1/organizations/:orgId/audits/:auditId/intelligence
```

Persists to `audit.config.aiIntelligence` and hydrates legacy `aiReport`.

AI plane:

```
POST /v1/intelligence   (apps/ai-service)
GET  /v1/intelligence/meta
```

## Env

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Enable LLM enrichment |
| `OPENAI_MODEL` | Default chat model (`gpt-4o-mini`) |
