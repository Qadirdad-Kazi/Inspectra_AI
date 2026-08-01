# Observability — logging, metrics, monitoring

## Logging

- Package: `@inspectra/logger` — JSON lines to stdout (12-factor)
- API HTTP middleware logs method, route template, status, duration, `requestId`
- Never log `Authorization`, cookies, or raw bodies
- Ship container stdout to CloudWatch / Datadog / Loki / ELK

Suggested scrape labels: `service=api`, `env=staging|production`.

## Metrics

`GET /metrics` — Prometheus text:

- `process_uptime_seconds`
- `process_memory_rss_bytes`
- `http_rate_limited_total` (when limiter trips)

K8s annotations on API pods enable Prometheus operator scraping.

## Health

| Endpoint | Use |
|---|---|
| `GET /health` | Liveness |
| `GET /health/ready` | Readiness (Postgres `SELECT 1`) |

## Tracing / errors (env-ready)

| Env | Purpose |
|---|---|
| `SENTRY_DSN` | Error tracking (wire SDK in a follow-up if not yet) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Traces/metrics OTLP |

## Alert ideas

1. Ready probe failing > 2m
2. 5xx rate > 2% for 5m
3. p95 latency > 2s
4. Backup age > 26h
5. HPA at max replicas for > 15m
6. Postgres connection saturation
