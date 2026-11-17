# PROJECT_OVERVIEW — read this instead of exploring the repo

Compact briefing for an AI assistant. Goal: understand the project without scanning files. Deeper detail: `WEBSITE.md` (full guide, ~7k tokens), `DESIGN.md`, `PRODUCT.md`, `HANDOFF.md`. Read those only if a task needs them.

## 1. What it is
Storefront for **3D Print It**, a 3D printing studio in New Cairo, Egypt (since 2021). Live: https://3dprintit-eg.com. Repo `Seif-Mohammed12/3d-print-quote-engine`, branch `main` (push to `main` = production deploy on Netlify, so use branches/PRs for risky work).

- Sells the studio's own designs (grouped by category; the owner will choose the categories later, so don't hardcode category names in copy or docs) and custom prints.
- Audience: young Egyptians on phones from Instagram/Facebook. English-only UI, Arabic must render (names/addresses).
- Money: EGP; cash on delivery or InstaPay; **no card payments**. Delivery: free pickup or Aramex (cost confirmed after order, shown as 0 at checkout).
- Materials: **PLA and PETG only**, ~48h turnaround. Never claim resin/SLA/ABS/TPU or fine layer specs. No invented testimonials/stats.
- Contact: WhatsApp +20 109 922 8486, 3d.print.ittt@gmail.com.

## 2. Stack
Vite + React 18 + TypeScript, Tailwind, shadcn/Radix (`src/components/ui/` is generated shadcn, ignore it), react-router, react-query, framer-motion, three/r3f. Serverless functions in `api/` (Netlify, served at `/api/<name>` via redirect in `netlify.toml`). Supabase (Postgres, auth incl. Google, storage). Resend (email). Node 22.

## 3. Commands
```
npm install
npm run dev        # site only :8080 (no /api functions)
npx netlify dev    # site + functions :8888 (needs .env.local)
npm run build      # must pass before pushing
npx vitest run     # unit tests (few: catalog-format.test.ts)
npm run lint       # baseline: ~37 `any` errors + 3 TS errors in STL code; non-blocking
npm run seed:supabase
```

## 4. Routes (`src/App.tsx`, all lazy-loaded)
- Public: `/` (`Index.tsx` just renders `Home.tsx`), `/products`, `/products/:slug-or-id`, `/services`, `/quote` (coming-soon page), `/gallery`, `/about`, `/contact`, legal (`/privacy-policy`, `/terms-of-service`, `/refund-policy`).
- Buying: `/product-cart` → `/product-checkout` → `/product-order-confirmation` (PDF receipt). Guest checkout allowed (see 4b).
- Auth/account: `/login`, `/signup`, `/reset-password`, `/auth/callback`, `/account`, `/orders`, `/orders/:id` (cancel while pending/confirmed).
- Admin (role-gated via `AdminRoleRoute`): `/admin` (products, photos, colours, bundles), `/admin/orders`, `/admin/stats`.
- Redirects: old category URLs → `/products*`; `/quote-request` → `/quote`.
- **Legacy/dead**: `/cart`, `/checkout`, `/order-confirmation`, `/quote-request`, `/quote-confirmation`, old per-category pages (`Pforge.tsx`, `Printique.tsx`, `BrandProductDetail.tsx`), STL upload code, `api/stl-upload.js`, `api/geometry-analysis.js`, `api/send-order-email.js`, `api/send-quote-email.js`, `services/geometry-analysis/` (Python FastAPI), `src/lib/quote-calculator.ts`, `stl-parser.ts`, `stl-upload.ts`, `components/stl/`, `ModelViewer.tsx` (three/r3f, only used by STL flow), `api/_lib/stl-validation.js`/`geometry-analysis.js`. `Pforge.tsx`/`Printique.tsx`/`BrandProductDetail.tsx` are imported by nothing in `App.tsx`. Safe to delete only after owner confirms. **The legacy endpoints are switched off**: `stl-upload`, `geometry-analysis`, `send-order-email`, `send-quote-email` return 410 (and `orders-create` refuses `quote` orders) unless `LEGACY_QUOTE_FLOW_ENABLED=true` (`api/_lib/legacy-flow.js`). The pages still load but fail on submit.

## 4b. Order flow (verified in code)
1. Product page / `QuickAddProductDialog` → `addProductToCart` in `src/lib/cart-context.tsx`. `ProductCartItem` = `{brand, productId, slug, isBundle, bundleItems, qty, primaryColorId, secondaryColorId, ledsEnabled, unitPrice}`; persisted in localStorage `3d-print-product-cart`. Products can have an **LED add-on** (`supportsLeds`, `ledExtraPrice`). The cart context also still holds the legacy STL `cart` (`3d-print-cart`).
2. `/product-checkout` (`ProductCheckout.tsx`, 795 lines): resolves cart lines against live catalogue, guest-or-login prompt (`CheckoutAuthPrompt`), customer/shipping/payment form.
3. Submit → `createOrderRecord()` (`src/lib/orders-api.ts`) POSTs `/api/orders-create` with the Bearer token if logged in plus a `guestToken` (localStorage `guest_order_token`). The function (service-role Supabase) inserts `orders` (`order_code` like `PO-YYYYMMDD-XXXX`, `order_type` `product|quote`, status `pending`, `user_id` or `guest_token`, `shipping/payment/totals/metadata` JSON) and `order_items` (`item_data` JSON). An order with neither user nor guest token is rejected. **The server sets the price**: it looks each product up (must be published), computes unit price, names, bundle contents and totals itself (`api/_lib/order-pricing.js`), ignores browser-sent prices, and answers 409 `PRICE_CHANGED` if the total the customer saw differs. Limits: qty 1–50, 30 lines, 32 KB body; shipping `pickup|aramex`, payment `cod|instapay` only. Guest token is 48 random hex chars.
4. `orders-create` then sends the admin and customer emails itself via Resend (`api/_lib/order-email.js`) and returns `emailSent`; a failed email does not fail the order. `/api/send-product-order-email` is a retired no-op. Checkout clears the cart and navigates to `/product-order-confirmation` (PDF receipt via `lib/receipt*.ts`).
5. Statuses pending → confirmed → processing → shipped → completed | cancelled (`order_status_history`). Customers cancel via `/api/orders-cancel` only while pending/confirmed. After login, `auth-context` calls `claimGuestOrders()` → `/api/orders-claim-guest`.

## 4c. Auth and admin
- `src/lib/supabase.ts`: browser client (null when env missing; `isSupabaseConfigured`). `auth-session.ts` `getAccessToken()` has a 1.5 s cache and retries. `auth-context.tsx` (685 lines, heavy debug logging, `?debug=auth`) resolves an **admin role** `viewer | manager | admin` via `/api/user-role` (DB `admin_users.role`, fallback: email in `ADMIN_EMAILS`/`ADMIN_EMAIL` → "admin"), cached in localStorage 10 min.
- `AdminRoleRoute` gates `/admin*`; `ProtectedRoute` gates account/orders. `/admin/login` redirects to `/login`.
- Every `api/admin-*.js` starts with `requireAdmin(event)` from `api/_lib/admin-auth.js` (Bearer token → `auth.getUser` → `admin_users` row, else email allowlist for confirmed emails only). Roles are enforced server-side: GET needs `viewer`, writes need `manager`, deleting orders and `/api/debug-env` need `admin` (`requireAdmin(event, { minRole })`). Customer endpoints use `requireUser` (`user-auth.js`).
- `AdminDashboard.tsx` (941 lines) is the product manager: create/edit products, prices/discount, stock, publish, reorder (`sort_order`), photo upload/reorder/delete/colour-tag, colours from `color_library`, bundles. `AdminStats.tsx` (892 lines) manual sales stats via `admin-stats-*`. `AdminOrders.tsx` status changes/delete.

## 5. Custom quotes — CURRENT STATE: "coming soon"
Latest commit `5cd55de` made `src/pages/Quote.tsx` a **static "Price your file — coming soon" page** with a WhatsApp button (`wa.me/201099228486`). It does NOT currently embed anything. The previous version (commit `e3637f9`) embedded the external **3D Print OS** quoter (`https://3d-print-os.vercel.app/embed.js`, `<print-quoter data-key="pk_…">`, separate repo `3d-print-os`, backend on a temporary Cloudflare tunnel on the studio PC, its orders go to that system). Restore it from git history when the quoter is ready. `/services` still describes custom printing (your file / your idea / bulk).

## 6. Code map
- `src/pages/` one per route; `src/pages/admin/`.
- `src/components/`: Navbar, Footer, Layout, ModelViewer, CookieConsentBanner, QuickAddProductDialog, ReceiptPdfDialog, `catalog/` (`Sleeve`, `CatalogueRow`, `ColorPicker`), `admin/AdminNav`.
- `src/lib/`: `products-api.ts`, `orders-api.ts`, `cart-context.tsx`, `auth-context.tsx`, `catalog-format.ts` (catalogue numbers, price format), `brand-catalog.ts`, `runtime-product-cache.ts`, `receipt*.ts`, `supabase.ts`. `src/hooks/use-brand-products.ts`.
- `api/*.js`: one function per file. Groups: `products-catalog` (public), `orders-*`, `admin-*` (products, product-images incl. `set-color`, product-colors, bundles, orders, stats), `contact-message`, `auth-password-reset`, `user-role`, `send-*-email`, `debug-env`. Helpers `api/_lib/`: `admin-auth.js` (every admin fn checks admin), `user-auth.js`, `supabase-admin.js`, `resend.js`, `http.js`, `order-pricing.js` (order validation + pricing), `order-email.js` (escaped email templates), `redirects.js` (password-reset redirect allowlist), `image-validation.js` (photo type by content, 8 MB), `legacy-flow.js` (legacy on/off flag).
- `supabase/migrations/*.sql`: **applied by hand** in Supabase SQL Editor, not automatically. Latest `20261116_security_hardening.sql` (owner ran it 2026-11-16): customers can only read their own orders, catalogue/bundle writes need manager or admin, only role `admin` manages `admin_users`, `product-images` bucket limited to images ≤ 8 MB. Functions use the service-role key, so they bypass RLS.
- Tables: `products`, `product_images` (`color_id`), `product_colors`, `color_library`, `product_bundles`, `product_bundle_items`, `orders`, `order_items`, `order_status_history`, `customer_profiles`, `admin_users`, `admin_order_stats`, plus old `stl_upload_jobs`, `geometry_analysis_jobs`. Storage bucket `product-images` (public).
- Root docs: README, WEBSITE, DESIGN, PRODUCT, HANDOFF, SHOT_LIST, ADMIN_STATS_*, INPUT_VALIDATION_SUMMARY. `.impeccable/`, `.claude/`, `.codex/`, `.agents/` are design/agent tooling, not app code.

## 6b. Catalogue data flow
`GET /api/products-catalog[?brand=<category id>]` (public, service-role/anon Supabase read, published only, ordered by `sort_order`) joins `product_images` (with `color_id`), `product_colors` (`role` primary|secondary) and bundle items, returning camelCase `DbProduct`. Frontend: `fetchPublicProducts` in `src/lib/products-api.ts` → `mapDbProductToLegacyProduct` → react-query hooks `useProducts` / `useBrandProducts` (`src/hooks/use-brand-products.ts`, 5 min stale, no refetch on focus) → `runtime-product-cache.ts` (in-memory). `src/lib/brand-catalog.ts` holds the `Product`/`BrandId` types and brand metadata (icons). `src/lib/catalog-format.ts`: `formatEGP`, `effectivePrice`, `hasDiscount`, `catalogueNo` (position+1), `productHref` (slug or id), `imagesForColor` (colour-tagged photo switching, single-colour products only), `categoryLabel/Order`. Admin calls go through `adminRequest` in `products-api.ts` (adds Bearer token; error text hints to use `netlify dev`).

## 7. Design rules ("Label Catalogue") — follow when touching UI
Dark graphite background, paper-white text, single orange accent `#FF5B1F`. Products look like record releases: catalogue number (3DP-001, derived from product order, so reordering renumbers), square photo "sleeve" with coloured spine, ruled tables not cards. Font Host Grotesk (+ Noto Sans Arabic fallback). Mobile-first, big touch targets, no gradients, no card grids. Voice: plain, specific, slightly playful; banned filler ("Unlock", "Elevate", "Seamless", "Bring your ideas to life"…). Real photos lead; current images are mostly renders. WCAG AA, respect reduced motion.

## 8. Catalogue logic gotchas
- Product with no accent colours = "single-colour" → photos can be tagged per colour and switch with the chosen colour; two-colour products show all photos.
- Discount price shows base struck through; owner wants permanent fake "sale" prices turned off.
- Admin = row in `admin_users` or email in `ADMIN_EMAILS`.
- Photo placeholders were removed (commit `c25f5e3`).

## 9. Environment (see `.env.example`)
Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_AUTH_REDIRECT_URL`, `VITE_API_URL`. Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (secret), `SUPABASE_ANON_KEY`, `SUPABASE_PRODUCT_IMAGES_BUCKET`, `ADMIN_EMAILS`, `ADMIN_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified domain; currently `3D Print It <noreply@3dprintit-eg.com>`), optional `LEGACY_QUOTE_FLOW_ENABLED` (leave unset). Never commit secrets.

## 10. State and open items (as of 2026-11-17)
- Recent commits: security audit fixes (`30121b8`, merged to `main` as `af8510e` and live), launch copy + "quote coming soon" state (`5cd55de`), removed photo placeholders, colour-switching photos, new cube logo.
- Security audit (2026-11-16) is done and deployed: server-side order pricing, locked-down RLS, admin role checks, retired open email endpoint, password-reset redirect allowlist, photo upload validation, security headers in `netlify.toml`, legacy endpoints off. Tests: `src/test/order-security.test.ts`.
- **Decided direction: Shopify as the back end (headless). See section 13. Not started.**
- Uncommitted working tree: deleted `IMPLEMENTATION_SUMMARY.md`, `NETLIFY_SETUP.md`, `QUICKSTART.md`, `SENDGRID_SETUP.md`; modified `README.md`; untracked `HANDOFF.md`, `WEBSITE.md`, `PROJECT_OVERVIEW.md`, tooling dirs.
- Open security items (owner): order emails were failing with Resend 403 "sender domain not verified" (check domain status and that the API key is from the same Resend account, then redeploy); no rate limiting on public functions; delete the duplicate `_dmarc` TXT record so only the one with `rua=` remains; confirm Supabase "Confirm email" and redirect URL allowlist; branch protection on `main`; remove `ADMIN_EMAILS` once all admins have `admin_users` rows.
- Owner tasks: real product photos (`SHOT_LIST.md`); 3D Print OS needs more materials/colours, upload-limit mismatch (100 vs 50 MB), merge `fix/quoter-theme-panels`; move its backend off the tunnel.
- Code tasks: delete legacy flow and pages above; fix lint `any`; align quality names on `/services` (0.3/0.2/0.12 mm) with quoter (0.28/0.2/0.15 mm); founder first name still a placeholder.

## 11. Working tips for the AI
- Netlify functions are `exports.handler`-style ESM (`export const handler`), return via `json()` from `api/_lib/http.js`, handle OPTIONS, and need `getSupabaseAdmin()`/`requireAdmin()` from `_lib`.
- Don't read `src/components/ui/*`, lockfiles, `public/` images, `.impeccable/`.
- For catalogue/UI changes start at `src/pages/Products.tsx`, `ProductDetail.tsx`, `src/components/catalog/`, `src/lib/catalog-format.ts`.
- For orders: `src/pages/ProductCheckout.tsx`, `src/lib/orders-api.ts`, `api/orders-create.js`.
- For admin: `src/pages/admin/AdminDashboard.tsx`, `api/admin-*.js`.
- Run `npm run build` before declaring done.

## 12. Categories (in flux)
Code still stores category in the `products.brand` column and a hardcoded `BrandId` type / `categoryLabel` / `categoryOrder` (`brand-catalog.ts`, `catalog-format.ts`). The owner plans to drop the two old categories and pick new ones later, so treat these as placeholders: any category work should make them data-driven rather than adding more hardcoded IDs. With Shopify (section 13) categories become Shopify collections, so don't invest in a Supabase-side category system.

## 13. Planned: Shopify as the back end (headless) — decided 2026-11-17, not started
**Decision:** keep this React site, design and domain as the storefront; move products, cart, checkout and order management to Shopify through its Storefront API. Chosen over Buy Buttons and over a Shopify theme because it keeps the "Label Catalogue" design.

**Status (2026-11-17):** started. Store exists: `bg0wk3-it.myshopify.com` ("My Store", trial plan, EGP, Egypt), only the default "Home page" collection. Imported 2026-11-17 from the live catalogue, in catalogue order: Nami Stand, Onami Stand, Lumo Stand, ArcDock Duo, ClampCup Mount (active, colours as options, photos, sale price + compare-at, inventory not tracked, `custom.short` metafield defined with Storefront read access). The three photoless seed products (vase, wall panel, tray) were not imported. Shipping: the single Egypt rate is now "Aramex delivery" at 0 EGP; local pickup is not enabled yet because the Shopify location has no address. Still to do by the owner: manual payment methods (COD, InstaPay), location address, Headless channel + Storefront token after the plan is bought. Step 2 is coded on branch `feat/shopify-storefront` (uncommitted): `src/lib/shopify-storefront.ts` (Storefront API client + `mapShopifyProduct` adapter, tests beside it) and a switch in `fetchPublicProducts`. It is off unless `VITE_CATALOG_SOURCE=shopify` plus `VITE_SHOPIFY_STORE_DOMAIN` and `VITE_SHOPIFY_STOREFRONT_TOKEN` are set; not yet run against the real store (needs a Storefront token and products). Mapping it assumes: option "Colour" = primary colour, option "Accent colour" = secondary, variant image = that colour's photo, first collection handle = category, metafield `custom.short` = short line, oldest product = 3DP-001. Cart/checkout still use Supabase, so do not turn the flag on in production before step 3.

**What moves to Shopify**
- Catalogue: products, prices, discounts, stock, photos, bundles; categories become collections. Colours become product options/variants (primary and secondary colour).
- Cart and checkout: Shopify cart via the Storefront API, then redirect to Shopify's hosted checkout. Cash on delivery and InstaPay are set up as manual payment methods. Shipping: free pickup, and Aramex with cost confirmed after the order.
- Orders, customer emails, order status and the product/order admin: all in Shopify admin.

**What stays here**
- All pages, design and copy; hosting on Netlify; `/quote` and the 3D Print OS quoter (separate system); contact form (`contact-message`).

**What gets replaced or retired in this repo (do not delete until the Shopify flow is live)**
- `api/products-catalog.js`, `src/lib/products-api.ts` data fetching, `use-brand-products.ts` → Storefront API queries. Keep `catalog-format.ts` and the `Product` shape as the adapter target so pages change little.
- `cart-context.tsx` product cart, `ProductCheckout.tsx`, `ProductOrderConfirmation.tsx`, `orders-create`/`orders-list`/`orders-cancel`/`orders-claim-guest`, `order-pricing.js`, `order-email.js` → Shopify cart + checkout.
- `/admin*` pages and every `api/admin-*.js` → Shopify admin. `admin_order_stats` → Shopify analytics.
- Supabase auth, `/account`, `/orders`: decide between Shopify customer accounts or dropping accounts (guest checkout only).

**Open questions to settle before building**
- Plan and cost: Shopify bills monthly in USD plus a transaction fee when not using Shopify Payments, which is not offered in Egypt as far as known. Confirm the cheapest plan that allows Storefront API checkout.
- Checkout runs on a Shopify domain (or a subdomain such as `shop.3dprintit-eg.com`); its look is only lightly customisable on lower plans.
- How to model two-colour products and per-colour photos as variants; whether bundles need an app.
- Catalogue numbers (3DP-001) come from product order today; with Shopify use collection sort order or a metafield.
- Migration of existing products, photos and any open orders; what happens to existing customer accounts.
- EGP as store currency; Arabic names and addresses in checkout.

**Suggested order of work**
1. Create the Shopify store, set EGP, manual payment methods, pickup and Aramex shipping; add two or three real products by hand.
2. Add a Storefront API client and an adapter that returns the existing `Product` shape; switch `/products` and product pages to it behind an env flag.
3. Replace cart and checkout with Shopify cart + checkout redirect; place test orders.
4. Migrate the full catalogue, then retire the Supabase order/admin code listed above.
5. Env to add (names to confirm): Shopify store domain and Storefront API public token for the browser; any Admin API token stays server-side only.
