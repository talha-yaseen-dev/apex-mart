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
3. **Project Name: `apex-mart`**. The canonical production domain is the custom
   domain **`https://buildora.fun`** (added in Step 3). Vercel also assigns a
   `*.vercel.app` alias, but all env vars and links below use the custom domain.
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
| `NEXTAUTH_URL` | `https://buildora.fun` |
| `APP_URL` | `https://buildora.fun` |

Optional now (leave unset for this COD launch):
- `RESEND_API_KEY` — Phase C (order/verification emails). Without it those emails
  are skipped; COD checkout still works.
- `EMAIL_FROM` — e.g. `Apex Mart <no-reply@buildora.fun>` (must be on a
  Resend-verified domain; only matters once Resend is set — see Step 3b).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Phase D (Google sign-in). If set,
  register the callback `https://buildora.fun/api/auth/callback/google` (Step 3c).
- `CSP_REPORT_ONLY=true` — recommended for the first deploy (observe CSP
  violations without blocking); unset later to enforce.
- `REDIS_URL` — only for distributed rate limiting (e.g. Upstash). Without it,
  rate limiting uses per-instance memory. Checkout does **not** need it.

> The app refuses to start in production if `NEXTAUTH_SECRET`, `DATABASE_URL`,
> `NEXTAUTH_URL`, or `APP_URL` still look like local dev defaults — so set the
> four required ones correctly before deploying.

---

## 3. First deploy

1. Click **Deploy**. Wait for the build to finish. Vercel serves it on the
   `*.vercel.app` alias until the custom domain is attached (Step 3a).

---

## 3a. Attach the custom domain (`buildora.fun`)

**Canonical host: `buildora.fun` (apex/non-www).** Keep `www.buildora.fun` as a
redirect to it, so there is exactly one canonical origin.

1. **Vercel → Project → Settings → Domains → Add** `buildora.fun`, then add
   `www.buildora.fun` and set it to **Redirect → `buildora.fun`** (Vercel offers
   this toggle when you add the second host).
2. Point DNS at Vercel (the domain currently sits on Hostinger DNS):
   - Apex `buildora.fun` → an **A record** to Vercel's IP `76.76.21.21`
     (or an ALIAS/ANAME to `cname.vercel-dns.com` if the DNS host supports it).
   - `www` → a **CNAME** to `cname.vercel-dns.com`.
   - Vercel's Domains screen shows the exact records to copy; follow those if
     they differ. Remove any old Hostinger parking A/AAAA records for the apex.
3. Wait for Vercel to show both domains **Valid** (TLS auto-provisions).
4. Ensure `NEXTAUTH_URL` and `APP_URL` are **exactly** `https://buildora.fun`
   (Step 2), then **redeploy** (Deployments → ⋯ → Redeploy) so absolute links
   (email verification, password reset, canonical/OG URLs) use the new domain.

> Auth, verification, and reset links are all derived from `NEXTAUTH_URL` /
> `APP_URL` — no code hardcodes the domain — so this env change + redeploy is all
> that's needed for them to switch over.

## 3b. Resend (transactional email) — DNS

Verification and password-reset emails send only once Resend is configured:
1. **Resend → Domains → Add** `buildora.fun` (or a subdomain like
   `send.buildora.fun`).
2. Add the **SPF/DKIM (and DMARC) DNS records** Resend shows, at your DNS host.
3. Set `EMAIL_FROM` to an address on that verified domain, e.g.
   `Apex Mart <no-reply@buildora.fun>`, and set `RESEND_API_KEY`. Redeploy.

## 3c. Google OAuth (only if enabling Google sign-in)

In Google Cloud Console → Credentials → your OAuth client:
- **Authorized redirect URI:** `https://buildora.fun/api/auth/callback/google`
- **Authorized JavaScript origin:** `https://buildora.fun`

Then set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in Vercel and redeploy. If
these are unset, the Google button is hidden and email sign-in works normally.

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
> (`MartAdmin1234!`). Sign in at `https://buildora.fun/signin`, then
> update it under Account → Settings → Security.

---

## 6. Smoke-test the live site

- `https://buildora.fun/` — homepage loads, products + images show.
- Add to cart → `/checkout` → place a COD order → confirmation shows an
  `APEX-…` order ref.
- `/admin` → redirects to `/signin`; sign in as `admin@apexmart.local` → panel loads.
- `/track` with that order ref + the phone you used → order shows.

---

## Notes
- Payments: **Cash on Delivery only.** No Stripe/SafePay keys required.
- Emails are optional (Phase C / Resend). Order placement works without them.
- If a later deploy changes the domain, update `NEXTAUTH_URL` + `APP_URL` and redeploy.
