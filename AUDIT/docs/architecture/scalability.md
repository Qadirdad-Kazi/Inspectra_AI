# Horizontal scaling & performance

## Stateless API replicas

- Session refresh tokens live in Postgres; access JWTs are bearer — safe to scale horizontally
- Enable sticky sessions only if you add in-memory caches later (prefer Redis)
- Compose: `docker compose ... up --scale api=3` behind nginx `least_conn`
- K8s: HPA on CPU (see `infra/k8s/api.yaml`)

## Performance levers

| Layer | Tuning |
|---|---|
| Edge | nginx gzip, keepalive, rate zones |
| API | rate limits, validation pipe, Prisma connection limit |
| DB | indexes already on org/audit FKs; add read replica when reporting heavy |
| Redis | AOF + `maxmemory-policy allkeys-lru` in prod compose |
| Reports | async generation with retries — do not block request threads |
| Web | Next.js production build; CDN for static assets in front of ingress |

## Capacity sketch

| Component | Starting size | Scale signal |
|---|---|---|
| API | 2 pods @ 512Mi | CPU > 70% |
| Web | 2 pods @ 256Mi | CPU > 75% |
| Postgres | 2 vCPU / 4GB | connections, IO |
| Redis | 256MB | evictions |

Load-test auth + audit create + report export before raising HPA max.
