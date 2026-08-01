# Local development

1. Copy `.env.example` to `.env`
2. `docker compose -f infra/docker/docker-compose.yml up -d`
3. `pnpm install`
4. `pnpm db:generate && pnpm db:migrate`
5. `pnpm dev`
