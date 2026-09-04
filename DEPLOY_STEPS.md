# Apex Mart — Vercel Deployment Steps

Cash-on-Delivery storefront. No payment gateway (SafePay/Stripe) needed for
this deploy. Follow top to bottom; it takes ~15 minutes.

Prerequisites:
- A Neon Postgres database (free tier is fine). Have its connection string ready.
- This repo pushed to GitHub/GitLab/Bitbucket.
- Node 20+ locally (for the migrate + seed steps at the end).

---

## 1. Import the repo into Vercel

1. Go to https://vercel.com → **Add New… → Project**.
2. **Import** this Git repository.
3. **Project Name: `apex-mart`** (this fixes the production URL to
   `https://apex-mart.vercel.app`, which you need for the env vars below).
4. Framework Preset: **Next.js** (auto-detected). Leave Build & Output settings
   at their defaults — Build Command `next build`, Install `npm install`
   (its `postinstall` runs `prisma generate`).
5. **Do NOT click Deploy yet** — add the environment variables first (Step 2),
   otherwise the first boot will fail the production env guard.

---

## 2. Add environment variables

In the import screen (or later under **Project → Settings → Environment
Variables**), add these for the **Production** environment. Source of truth:
`.env.example`.

Required:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon **direct / non-pooling** connection string (host without `-pooler`). Needed so migrations run. |
| `NEXTAUTH_SECRET` | A strong random string. Generate locally: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://apex-mart.vercel.app` |
| `APP_URL` | `https://apex-mart.vercel.app` |

Optional now (leave unset for this COD launch):
- `RESEND_API_KEY` — Phase C (order/verification emails). Without it those emails
  are skipped; COD checkout still works.
- `EMAIL_FROM` — e.g. `Apex Mart <no-reply@apex-mart.vercel.app>` (only matters
  once Resend is set).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Phase D (Google sign-in).
- `CSP_REPORT_ONLY=true` — recommended for the first deploy (observe CSP
  violations without blocking); unset later to enforce.
- `REDIS_URL` — only for distributed rate limiting (e.g. Upstash). Without it,
  rate limiting uses per-instance memory. Checkout does **not** need it.

> The app refuses to start in production if `NEXTAUTH_SECRET`, `DATABASE_URL`,
> `NEXTAUTH_URL`, or `APP_URL` still look like local dev defaults — so set the
> four required ones correctly before deploying.

---

## 3. First deploy

1. Click **Deploy**. Wait for the build to finish.
2. If you named the project `apex-mart`, the production URL is already
   `https://apex-mart.vercel.app`. Confirm under **Settings → Domains**.

### If the URL is NOT `apex-mart.vercel.app`
- **Settings → Domains** shows the `*.vercel.app` URL. To change it, either
  rename the **Project** (Settings → General → Project Name → `apex-mart`) or
  add `apex-mart.vercel.app` as a domain if it's free.
- After the URL is final, make sure `NEXTAUTH_URL` and `APP_URL` both equal that
  exact URL (Step 2), then **redeploy** (Deployments → ⋯ → Redeploy) so the new
  values take effect.

---

## 4. Run migrations against the prod Neon DB

Migrations are **not** run automatically by the Vercel build — run them once from
your machine, pointed at prod.

```bash
# From the repo root, using the SAME Neon direct URL you put in Vercel:
DATABASE_URL="postgresql://<user>:<pass>@<host>/<db>?sslmode=require" \
  npx prisma migrate deploy
```

This applies all migrations in `prisma/migrations/` to the prod database.
(`prisma migrate deploy` never resets data; it only applies pending migrations.)

---

## 5. Seed the catalog + admin on prod

Run against the same prod `DATABASE_URL`. The `db:seed:*` scripts read `.env`, so
the simplest approach is to temporarily put the **prod** `DATABASE_URL` in a local
`.env` and run:

```bash
npm run db:seed:mart     # 50 Apex Mart products / 95 variants (6 aisles)
npm run db:seed:admin    # admin@apexmart.local / MartAdmin1234!
```

Or without touching `.env`, pass it inline (inline vars win over `--env-file`):

```bash
DATABASE_URL="postgresql://…prod…?sslmode=require" npm run db:seed:mart
DATABASE_URL="postgresql://…prod…?sslmode=require" npm run db:seed:admin
```

Do **not** run `db:seed:e2e` on prod — that's a test customer for local QA only.

> **Change the admin password after first login.** The seed sets a known default
> (`MartAdmin1234!`). Sign in at `https://apex-mart.vercel.app/signin`, then
> update it under Account → Settings → Security.

---

## 6. Smoke-test the live site

- `https://apex-mart.vercel.app/` — homepage loads, products + images show.
- Add to cart → `/checkout` → place a COD order → confirmation shows an
  `APEX-…` order ref.
- `/admin` → redirects to `/signin`; sign in as `admin@apexmart.local` → panel loads.
- `/track` with that order ref + the phone you used → order shows.

---

## Notes
- Payments: **Cash on Delivery only.** No Stripe/SafePay keys required.
- Emails are optional (Phase C / Resend). Order placement works without them.
- If a later deploy changes the domain, update `NEXTAUTH_URL` + `APP_URL` and redeploy.
