# Handoff for GitHub Copilot — 3D Print It website

Repo: `Seif-Mohammed12/3d-print-quote-engine` (branch `main`). Live: https://3dprintit-eg.com
Read first: [WEBSITE.md](WEBSITE.md) (full site guide), [DESIGN.md](DESIGN.md) (visual system), [PRODUCT.md](PRODUCT.md) (audience, voice), [SHOT_LIST.md](SHOT_LIST.md).

## What this is

Storefront for a 3D printing studio in New Cairo, Egypt. Sells the studio's own printed designs and custom prints. Audience: young Egyptians on phones, arriving from Instagram/Facebook. Currency EGP; cash on delivery or InstaPay; pickup or Aramex. No card payments.

## Stack

- Vite + React 18 + TypeScript + Tailwind + shadcn/Radix, react-router, react-query, framer-motion, three/r3f
- Server functions in `api/` (Netlify, reached at `/api/<name>`); shared helpers in `api/_lib/` (admin auth in `admin-auth.js`)
- Supabase (DB, auth incl. Google, storage), Resend (email), Netlify (hosting, auto-deploy on push to `main`)
- Quote page embeds the **3D Print OS** quoter (`https://3d-print-os.vercel.app/embed.js`) — separate repo `3d-print-os`

## Commands

```
npm install
npm run dev          # site only, http://localhost:8080 (no API functions)
npx netlify dev      # site + functions, http://localhost:8888 (needs .env.local)
npm run build        # must pass before pushing
npx vitest run       # unit tests
```

Node 22. Known baseline: 37 older lint errors (`any`) and 3 older TS errors in STL upload code; none block the build.

## Design rules ("Label Catalogue") — follow these when touching UI

- Dark graphite background, paper-white text, single orange accent `#FF5B1F`
- Products shown like record releases: catalogue number (3DP-001), square photo "sleeve" with coloured spine, ruled tables not cards
- Font: Host Grotesk (+ Noto Sans Arabic fallback)
- Building blocks in `src/components/catalog/`: `Sleeve`, `CatalogueRow`, `ColorPicker`, `PhotoPending`
- Mobile-first; keep touch targets large; don't reintroduce gradients or card grids

## Code map

- `src/pages/` one file per route; `src/pages/admin/` admin
- `src/lib/` catalogue/orders API helpers, cart, auth, formatting (`catalog-format.ts`), receipt PDF
- `supabase/migrations/` SQL — **not auto-applied**; run by hand in Supabase SQL Editor

## Recent work (newest first)

1. Removed "photo pending" placeholders (`c25f5e3`)
2. Single-colour products switch photos with the chosen colour; photos can be colour-tagged in admin (`3ad0c1f`)
3. `/quote` now uses the 3D Print OS quoter (`e3637f9`)
4. New cube logo that reads "3D" (`4e52e20`)
5. Image-led home opening, "One layer at a time." (`04c1eea`)
6. Full Label Catalogue redesign across all pages; route code-splitting

Working tree changes include the About and Home copy updates, current Netlify/Resend configuration, and documentation cleanup. Review the diff before committing.

## Open items

**Needs the owner (not code)**

- Set `RESEND_API_KEY` / `RESEND_FROM_EMAIL` in Netlify if they are not already configured (contact form and order emails fail without them)
- 3D Print OS: add materials/colours (only black PLA offered), check upload limit mismatch (100 MB shown vs 50 MB server), merge `fix/quoter-theme-panels`
- Take photos per SHOT_LIST.md; turn off permanent "sale" prices in admin unless real

**Good Copilot tasks**

- Delete the old custom-print flow: `/cart`, `/checkout`, `/order-confirmation`, `/quote-request`, `/quote-confirmation`, STL upload code, `stl-upload` and `geometry-analysis` functions (only after owner confirms they won't go back)
- Delete unused `Pforge.tsx`, `Printique.tsx`, `BrandProductDetail.tsx` (keep the `/pforge` and `/printique` redirects)
- Fix lint `any` errors in admin and API code
- Align quality names on `/services` (Draft 0.3 / Standard 0.2 / High 0.12 mm) with the quoter's (0.28 / 0.2 / 0.15 mm)

## Gotchas

- The quote page backend is a temporary Cloudflare tunnel on the studio's PC; if it's down the page shows "Quoting is unavailable". Not fixable in this repo.
- Quoter orders go to 3D Print OS, not this site's database or emails.
- Catalogue numbers derive from product order, so reordering products renumbers them.
- Shelves: brand `pforge` = Gaming & Setup, `printique` = Home & Decor.
- A product with no accent colours is "single-colour" (enables per-colour photos).
- Admin access = row in `admin_users` or email in `ADMIN_EMAILS`.
- Never commit secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`); the quoter's `pk_…` key is public and fine.
- Pushing to `main` deploys to production, so branch and open a PR for anything risky.
