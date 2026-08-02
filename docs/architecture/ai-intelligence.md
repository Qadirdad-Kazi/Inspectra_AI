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
- **LLM optional** — heuristics always run; enrichment when OpenAI / OpenRouter / Gemini is configured and org `allowAiTriage`

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
| `AI_PROVIDER` / `AI_DEFAULT_PROVIDER` | `openai` \| `openrouter` \| `gemini` \| `auto` \| `stub` |
| `OPENAI_API_KEY` | OpenAI |
| `OPENROUTER_API_KEY` | OpenRouter |
| `GEMINI_API_KEY` | Google Gemini (OpenAI-compatible endpoint) |
| `OPENAI_MODEL` / `OPENROUTER_MODEL` / `GEMINI_MODEL` / `LLM_MODEL` | Default chat model |
| `OPENAI_VISION_MODEL` / `*_VISION_MODEL` / `LLM_VISION_MODEL` | Vision model for store creatives |

With `auto`, the API picks the first available key in order: OpenRouter → Gemini → OpenAI.

Heuristics always run; LLM enrichment activates when a provider key is present and provider is not `stub`.
