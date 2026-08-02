# Deploy Inspectra AI — Vercel (frontend) + Render (API)

Deploy in this order:

1. Push latest `main` to GitHub (must include restore commit — see troubleshooting)
2. **Vercel** — Next.js web (`@inspectra/web`)
3. **Render** — PostgreSQL + NestJS API (`@inspectra/api`)
4. Set Vercel `NEXT_PUBLIC_API_URL` to the Render API URL and **redeploy**

Repo root is the monorepo. Leave **Root Directory** empty on both platforms.

---

## Prerequisites

```bash
cd /path/to/Inspectra_AI
git push -u origin main
```

Confirm GitHub `main` includes `packages/web-audit-engine/package.json` (not only `src/`).

---

## 1. Vercel — frontend

### Project settings

| Field | Value |
|--------|--------|
| Framework Preset | **Next.js** |
| Root Directory | Prefer **`apps/web`**. If left empty (repo root), root `vercel.json` + `scripts/vercel-web-build.sh` still work |
| Include files outside Root Directory | **Enabled** (when Root Directory is `apps/web`) |
| Install Command | Root: `npm install -g pnpm@9.15.4 && NODE_ENV=development pnpm install --frozen-lockfile` · From `apps/web`: prefix with `cd ../.. &&` |
| Build Command | Root: `bash scripts/vercel-web-build.sh` · From `apps/web`: `cd ../.. && pnpm --filter @inspectra/web... build` |
| Output Directory | **Leave empty** (never set `public`) |
| Node.js Version | **20.x** |

> Prefer `npm install -g pnpm@9.15.4` over `corepack enable` on Vercel — avoids pnpm `ERR_INVALID_THIS` / registry fetch failures with Corepack.
>
> If Root Directory is left empty, Vercel fails with: *No Next.js version detected*.

### Environment variables

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `https://<your-api>.onrender.com` (no trailing slash) |

Optional: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`

Redeploy after changing `NEXT_PUBLIC_API_URL` (build-time).

---

## 2. Render — PostgreSQL

1. **New → PostgreSQL** (e.g. `inspectra-db`)
2. Same region as the API
3. Use **Internal Database URL** for the API service env
4. Use **External Database URL** for local migrations

### Migrate (from your machine)

```bash
cd /path/to/Inspectra_AI
pnpm install
DATABASE_URL="<External Database URL>?schema=public" pnpm --filter @inspectra/db migrate:deploy
```

---

## 3. Render — API web service

### Service settings

| Field | Value |
|--------|--------|
| Name | `inspectra-api` |
| Branch | `main` |
| Root Directory | *(empty)* |
| Runtime | Node |
| Build Command | `npm install -g pnpm@9.15.4 && NODE_ENV=development pnpm install --frozen-lockfile && pnpm --filter @inspectra/db generate && pnpm --filter @inspectra/api... build` |
| Start Command | `API_PORT=$PORT node apps/api/dist/main.js` |
| Health check | `/health/ready` |

### Environment variables

| Name | Value |
|------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Internal Database URL |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `AUTH_SECRET` | different `openssl rand -hex 32` |
| `WEB_URL` | Vercel origin, e.g. `https://your-app.vercel.app` |
| `TRUST_PROXY` | `1` |
| `AI_DEFAULT_PROVIDER` | `auto` (or `openai` / `openrouter` / `gemini` / `stub`) |
| `OPENROUTER_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY` | Set one on Render for LLM enrichment |
| `ENABLE_SWAGGER` | `false` |

### Verify

```bash
curl -fsS https://inspectra-api.onrender.com/health/ready
```

---

## 4. Connect frontend ↔ API

1. Vercel env: `NEXT_PUBLIC_API_URL=https://inspectra-api.onrender.com`
2. Redeploy Vercel
3. Render `WEB_URL` = exact Vercel origin → redeploy API if changed

---

## Quick reference

```text
# Vercel (Root Directory = apps/web)
Install:  cd ../.. && npm install -g pnpm@9.15.4 && NODE_ENV=development pnpm install --frozen-lockfile
Build:    cd ../.. && pnpm --filter @inspectra/web... build
Env:      NEXT_PUBLIC_API_URL

# Render API
Build:    npm install -g pnpm@9.15.4 && NODE_ENV=development pnpm install --frozen-lockfile && pnpm --filter @inspectra/db generate && pnpm --filter @inspectra/api... build
Start:    API_PORT=$PORT node apps/api/dist/main.js
Env:      DATABASE_URL, JWT_SECRET, AUTH_SECRET, WEB_URL, NODE_ENV, TRUST_PROXY
```

> Render service `NODE_ENV=production` also applies during **build**, so install must force `NODE_ENV=development` or Prisma/TypeScript will be missing.
---

## Troubleshooting

### `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` / `@inspectra/web-audit-engine`

GitHub was on commit `41bcd25`, which moved the monorepo to root but **dropped** `packages/web-audit-engine/package.json` (and other files). Local fix commit restores them.

```bash
git log -1 --oneline   # should be e229043 or later
git push -u origin main
```

Then **Manual Deploy** on Render / redeploy on Vercel so they build the new commit (not `41bcd25`).

### Vercel `No Output Directory named "public"`

Next.js built fine, but the project is treated as static. In Vercel:

1. Framework = **Next.js**
2. Root Directory = **`apps/web`**
3. **Output Directory** = clear/empty (remove `public` if set)

Do not set `outputDirectory` to `public` or `apps/web/.next` in `vercel.json`.

### Vercel `tsc: command not found`

Vercel sets `NODE_ENV=production` during install, so pnpm skips `devDependencies` (including TypeScript). Force a full install:

```text
NODE_ENV=development pnpm install --frozen-lockfile
```

### Vercel `No Next.js version detected`

Set **Root Directory** to `apps/web` (not repo root). Use install/build commands that `cd ../..` into the monorepo root first.

### Vercel `ERR_INVALID_THIS` / `ERR_PNPM_META_FETCH_FAIL`

Use install command with global pnpm (not Corepack). Pin Node to **20**.

### Render `prisma: not found` / `tsc: command not found`

Service env `NODE_ENV=production` applies at build time, so pnpm omits `devDependencies`. Use:

```text
NODE_ENV=development pnpm install --frozen-lockfile
```

in the **Build Command** (runtime can still be `NODE_ENV=production`).

### CORS

`WEB_URL` on Render must match the Vercel origin exactly.

### Free Render sleep

First request after idle can take 30–60s.
