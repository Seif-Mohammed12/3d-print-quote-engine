# 3D Print It — website guide

Everything about **https://3dprintit-eg.com** in one place: what the site does, every page, how buying, quoting and the admin work, the services behind it, the data it stores, its settings, and how to run and publish it.

Last updated: 10 November 2026.

---

## 1. At a glance

|                         |                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Business**            | 3D Print It, a 3D printing studio in New Cairo, Egypt, since 2021                            |
| **Slogan**              | Bringing your ideas to life, one layer at a time                                             |
| **What the site sells** | The studio's own printed designs (desk gear and decor) and custom prints of customers' files |
| **Customers**           | Mostly young Egyptians arriving from Instagram and Facebook, mostly on phones                |
| **Live site**           | https://3dprintit-eg.com                                                                     |
| **Code**                | GitHub `Seif-Mohammed12/3d-print-quote-engine`, branch `main`                                |
| **Hosting**             | Netlify (site + server functions), Supabase (database, logins, file storage)                 |
| **Money**               | Egyptian pounds (EGP). Cash on delivery or InstaPay. No online card payments.                |
| **Delivery**            | Free pickup in New Cairo, or Aramex (cost confirmed after the order)                         |
| **Materials**           | PLA and PETG, printed in about 48 hours                                                      |
| **Contact**             | WhatsApp / phone +20 109 922 8486 · 3d.print.ittt@gmail.com                                  |

Related documents: [PRODUCT.md](PRODUCT.md) (who it's for, brand voice), [DESIGN.md](DESIGN.md) (the visual system), [SHOT_LIST.md](SHOT_LIST.md) (photos to take).

---

## 2. Brand and design

- **Look ("Label Catalogue")**: dark graphite background, paper-white text, one orange accent (`#FF5B1F`). Every product is shown like a record release: a catalogue number (3DP-001), a square photo with a coloured "spine" on its left edge, and ruled tables instead of cards. Full rules in [DESIGN.md](DESIGN.md).
- **Font**: Host Grotesk (Google Fonts), with Noto Sans Arabic as a fallback for Arabic names and addresses.
- **Logo**: an orange isometric cube. Two layer lines on the left face form a "3" and a cut-out on the right face forms a "D", so the cube reads "3D". Shown next to the name "3D PRINT IT".
- **Logo files** (`public/brand/`):

| File                                                                  | Use                                                                               |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `mark-orange.svg`, `mark-paper.svg`, `mark-black.svg`                 | The cube with a transparent background, for print, stickers, packaging, engraving |
| `mark-orange-1024.png`                                                | The cube as a normal image                                                        |
| `instagram-orange.png`, `instagram-dark.png`                          | 1080×1080 profile pictures                                                        |
| `favicon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Browser tab and phone home-screen icons                                           |
| `og-image.png`                                                        | The 1200×630 preview shown when the site is shared on WhatsApp, Facebook, etc.    |

- The old blue cube (`public/logos/3d-print-it-logo.png`) is no longer used.

---

## 3. Pages

### Public

| Address                                                  | Page            | What it does                                                                                                                                                                                          |
| -------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                      | Home            | Full-width photo opening ("One layer at a time."), a "Browse the shop" button, a scrollable shelf of products, the rest of the catalogue, custom-print options, terms of sale, and the studio section |
| `/products`                                              | Shop            | Every product, filterable by shelf (Gaming & Setup, Home & Decor), with Add to cart (opens a colour picker) and Details                                                                               |
| `/products/:slug`                                        | Product         | Photo gallery, colour choice, price, Add to cart / Buy now, delivery and payment terms, description. Works with the product's slug (e.g. `/products/onami-stand`) or its ID                           |
| `/services`                                              | Custom prints   | The three ways to get something printed (your file, your idea, a large batch), materials and quality levels                                                                                           |
| `/quote`                                                 | Price your file | The **3D Print OS quoter** (see section 5): upload an STL, get a price, order                                                                                                                         |
| `/gallery`                                               | Gallery         | Every product photo, linking to its product, plus slots for custom-work photos                                                                                                                        |
| `/about`                                                 | About           | The studio's story and how it works                                                                                                                                                                   |
| `/contact`                                               | Contact         | WhatsApp, phone, email, and a contact form that emails the studio                                                                                                                                     |
| `/product-cart`                                          | Cart            | Items added from the shop                                                                                                                                                                             |
| `/product-checkout`                                      | Checkout        | Customer details, pickup or Aramex, cash on delivery or InstaPay                                                                                                                                      |
| `/product-order-confirmation`                            | Order received  | Confirmation with a downloadable PDF receipt                                                                                                                                                          |
| `/privacy-policy`, `/terms-of-service`, `/refund-policy` | Legal           | Policy pages                                                                                                                                                                                          |
| anything else                                            | Not found       | "Nothing printed at this address", with links back                                                                                                                                                    |

Old addresses keep working: `/pforge` and `/printique` go to the shop, and `/pforge/<product>` or `/printique/<product>` go to that product's page.

### Accounts (customers)

| Address                                                  | Who       | What it does                                                                                   |
| -------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `/login`, `/signup`, `/reset-password`, `/auth/callback` | Anyone    | Email + password, or Google sign-in                                                            |
| `/account`                                               | Signed in | Profile, saved address, password, recent orders                                                |
| `/orders`, `/orders/:orderId`                            | Signed in | Order history and details; customers can cancel an order while it's still pending or confirmed |

Signing in is optional: guests can check out. Guest orders are remembered in that browser, and if the guest later signs in **on the same browser**, those orders are attached to their account.

### Admin

| Address         | What it does                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin`        | Products: create/edit, prices and discounts, publish/unpublish, order on the shop, photos (upload, reorder, delete, **tag with a colour**), colours, bundles |
| `/admin/orders` | All orders: status changes, details, delete                                                                                                                  |
| `/admin/stats`  | Sales and order statistics                                                                                                                                   |

Admin pages only open for accounts with an admin role (or an email listed in `ADMIN_EMAILS`); everyone else is sent to the login page or home.

### Older pages still in the code

`/cart`, `/checkout`, `/order-confirmation`, `/quote-request` and `/quote-confirmation` belong to the **previous** custom-print flow (the site's own STL upload and price estimate). Nothing links to them since `/quote` switched to 3D Print OS. `/quote-request` sends visitors back to `/quote`. They can be deleted once you're sure you won't go back.

---

## 4. How buying works

1. **Choose**: the customer picks a colour on the product page or in the shop's quick-add window, then Add to cart (or Buy now for one item).
   - Products can have a main colour and an optional accent colour.
   - **Single-colour products can switch photos with the colour** once photos are tagged in the admin (see section 6).
2. **Cart**: quantities, remove, subtotal. The cart is saved in the browser.
3. **Checkout**: guest checkout or sign in. Name, email, phone; an address only for Aramex.
   - Delivery: **pickup** (free) or **Aramex** (cost confirmed by the studio after the order; shown as 0 at checkout).
   - Payment: **cash on delivery** or **InstaPay** (paid outside the site).
4. **Order saved**: `orders-create` stores the order and its items in Supabase.
5. **Emails**: `send-product-order-email` emails the studio and the customer (via Resend).
6. **Confirmation**: confirmation page with a PDF receipt.
7. **After**: the studio moves the order through **pending → confirmed → processing → shipped → completed** (or **cancelled**) in `/admin/orders`; signed-in customers see the status in `/orders`.

---

## 5. Custom prints: the 3D Print OS quoter

The quote page runs the quoter from the studio's other system, **3D Print OS** (separate repo `3d-print-os`, admin app on Vercel).

- **How it's added**: `src/pages/Quote.tsx` loads `https://3d-print-os.vercel.app/embed.js` and places `<print-quoter data-key="pk_wlskm_…">`, themed with the site's colours and font. The key is a public (publishable) key, safe in the page.
- **What the customer does**: uploads an STL, sees a 3D preview, picks material, colour, quality and quantity, gets a slicer-based price, then enters details and places the order. **These orders go to 3D Print OS, not this site's database or emails.**
- **Allowed websites**: 3D Print OS only serves this quoter to addresses listed in its **Settings → Website quoter** (exact match: `https://3dprintit-eg.com` and `https://www.3dprintit-eg.com`).
- **Where its backend lives**: it finds its server address at runtime from a config file, and that address is currently a temporary Cloudflare tunnel on the studio's computer. **If that computer or tunnel stops, the quote page shows "Quoting is unavailable".** Moving the 3D Print OS backend to always-on hosting removes this risk.
- **If the quoter script can't load at all**, the page shows a WhatsApp link instead.
- The panel theming fix for the quoter lives in `3d-print-os` (branch `fix/quoter-theme-panels`); it takes effect once merged there.

---

## 6. The product catalogue

All products, colours, photos and bundles live in Supabase and are managed in `/admin`. The public site reads them through `/api/products-catalog`.

- **Shelves**: products belong to a brand that the site shows as a shelf: `pforge` = **Gaming & Setup**, `printique` = **Home & Decor**.
- **Catalogue numbers** (3DP-001…) come from each product's position in the catalogue, so they change if products are reordered.
- **Prices**: a base price plus an optional discount price. When a discount is on, the base price shows struck through.
- **Colours**: picked from a shared colour library; each product has main colours and optional accent colours. A product with **no accent colours is a "single-colour" product**.
- **Photos**: uploaded in order; the first photo is the one used across the site.
  - **Colour tags**: each photo can be tagged with the colour it shows ("Any colour" = a general shot). On single-colour products, choosing a colour shows that colour's photos first, then the general shots. Two-colour products always show every photo.
  - **Requires** the database column from `supabase/migrations/20261109_product_image_colors.sql`. Until that SQL is run, tags can't be saved and photos don't switch.
- **Bundles**: a product can be a bundle of other products, listed on its page and in the cart.
- **Products without photos** show a "Photo on the way" placeholder naming the shot to take (see [SHOT_LIST.md](SHOT_LIST.md)).

---

## 7. Services the site depends on

| Service              | Used for                                                                                             | Where it's set up                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Netlify**          | Hosts the site; runs the server functions in `api/`; publishes automatically on every push to `main` | Netlify dashboard (site settings, environment variables) |
| **Supabase**         | Database, customer and admin logins (incl. Google sign-in), photo and file storage                   | Supabase dashboard                                       |
| **Resend**           | All emails: orders, contact form, password reset                                                     | Resend dashboard (the sending domain must be verified)   |
| **3D Print OS**      | The quote page's quoter                                                                              | `3d-print-os` repo + its Vercel deployment               |
| **Google Fonts**     | Host Grotesk and Noto Sans Arabic                                                                    | Loaded by the page                                       |
| **WhatsApp**         | Contact links (`wa.me/201099228486`)                                                                 | —                                                        |
| **Geometry service** | Old STL analysis for the previous quote flow (`GEOMETRY_SERVICE_URL`)                                | Only used by the old `/quote-request` flow               |

---

## 8. Server functions (`api/`)

All are reached at `/api/<name>` (Netlify redirects them to its functions).

| Group                  | Functions                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Catalogue (public)** | `products-catalog`                                                                                                                           |
| **Orders (customers)** | `orders-create`, `orders-list`, `orders-cancel`, `orders-claim-guest`                                                                        |
| **Emails**             | `send-product-order-email`, `contact-message`, `auth-password-reset`, plus `send-order-email` and `send-quote-email` (old custom-print flow) |
| **Accounts**           | `user-role`                                                                                                                                  |
| **Admin: products**    | `admin-products-list`, `admin-products-upsert`, `admin-products-delete`, `admin-products-reorder`                                            |
| **Admin: photos**      | `admin-product-images-upload`, `admin-product-images-reorder`, `admin-product-images-delete`, `admin-product-images-set-color`               |
| **Admin: colours**     | `admin-product-colors-upsert`, `admin-product-colors-reorder`, `admin-product-colors-delete`                                                 |
| **Admin: bundles**     | `admin-bundles-upsert`, `admin-bundles-delete`, `admin-bundle-items-set`                                                                     |
| **Admin: orders**      | `admin-orders-list`, `admin-orders-update`, `admin-orders-delete`                                                                            |
| **Admin: stats**       | `admin-stats-list`, `admin-stats-add`, `admin-stats-update`, `admin-stats-delete`                                                            |
| **Old quote flow**     | `stl-upload`, `geometry-analysis`                                                                                                            |
| **Debugging**          | `debug-env`                                                                                                                                  |

Admin functions check that the caller is a signed-in admin before doing anything (`api/_lib/admin-auth.js`).

---

## 9. Data (Supabase)

| Table                                           | Holds                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `products`                                      | Name, slug, shelf, description, prices, discount, stock, published, order, bundle flag |
| `product_images`                                | Photo URL, storage path, order, and (after the new migration) `color_id`               |
| `product_colors`                                | Each product's main and accent colours                                                 |
| `color_library`                                 | The shared list of colours (id, name, hex)                                             |
| `product_bundles`, `product_bundle_items`       | Bundle definitions and their contents                                                  |
| `orders`, `order_items`, `order_status_history` | Orders, their lines, and every status change                                           |
| `customer_profiles`                             | Saved customer details and addresses                                                   |
| `admin_users`                                   | Who has an admin role                                                                  |
| `admin_order_stats`                             | Figures for the stats page                                                             |
| `stl_upload_jobs`, `geometry_analysis_jobs`     | The old custom-print upload flow                                                       |

**Storage buckets**: product photos (`product-images`, public) and the old flow's STL uploads.

**Changing the database**: SQL files live in `supabase/migrations/`. They are **not** applied automatically: run new ones yourself in **Supabase → SQL Editor**.

**Pending:** `20261109_product_image_colors.sql` (photo colour tags) has not been run yet.

---

## 10. Settings (environment variables)

Set in **Netlify → Site configuration → Environment variables**, and in `.env.local` for local development.

| Variable                                                         | Used for                                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                    | The browser's connection to Supabase                                          |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | Server functions' connection to Supabase (the service role key is secret)     |
| `SUPABASE_PRODUCT_IMAGES_BUCKET`                                 | Photo bucket name (default `product-images`)                                  |
| `SUPABASE_STL_UPLOADS_BUCKET`                                    | Old flow's STL bucket                                                         |
| `ADMIN_EMAILS`                                                   | Comma-separated emails always treated as admins                               |
| `ADMIN_EMAIL`                                                    | Where order and contact emails are sent (defaults to 3d.print.ittt@gmail.com) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                            | Sending emails (the from-address must be on a domain verified in Resend)      |
| `VITE_AUTH_REDIRECT_URL`                                         | Where Google sign-in returns to                                               |
| `VITE_API_URL`                                                   | Optional API address override                                                 |
| `GEOMETRY_SERVICE_URL`                                           | Old flow's STL analysis service                                               |

Email is sent through Resend. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Netlify; the sender must use a domain verified in Resend.

---

## 11. Running and publishing

**Requirements**: Node.js 22, npm.

```bash
npm install
```

```bash
npm run dev
```

Starts the site at http://localhost:8080. The server functions don't run this way, so the catalogue and checkout won't load.

```bash
npx netlify dev
```

Runs the site **with** the server functions (http://localhost:8888). Needs `.env.local`. Expect slow API responses locally.

```bash
npm run build
```

Production build into `dist/`.

```bash
npx vitest run
```

Unit tests.

**Publishing**: push to `main` on GitHub. Netlify builds and publishes in about a minute.

**Checks before publishing**: `npm run build` should pass. Lint has 37 older errors (`any` types, mostly in admin and API code) and 3 older TypeScript errors in the STL upload code; none block the build.

---

## 12. Code map

| Folder / file                         | What's there                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/pages/`                          | One file per page (see section 3); `src/pages/admin/` for admin                                                 |
| `src/components/`                     | Navbar, footer, layout, cookie banner, quick-add window, logo (`BrandLogo.tsx`)                                 |
| `src/components/catalog/`             | The design's building blocks: `Sleeve` (square photo with spine), `CatalogueRow`, `ColorPicker`, `PhotoPending` |
| `src/lib/`                            | Catalogue and orders API helpers, cart, login, formatting (`catalog-format.ts`), receipt PDF                    |
| `src/index.css`, `tailwind.config.ts` | Colours, font, and shared styles                                                                                |
| `api/`                                | Server functions (section 8); shared helpers in `api/_lib/`                                                     |
| `supabase/migrations/`                | Database changes (run by hand)                                                                                  |
| `public/brand/`, `public/images/`     | Logo files; the home page photo                                                                                 |

Pages load on demand, so each page only downloads its own code. The home, shop, product, cart and checkout pages load about 290 KB (compressed).

---

## 13. Still to do

**Content**

- Take the photos in [SHOT_LIST.md](SHOT_LIST.md). The three decor products have none, the others use renders, and shot #0 (a real layer close-up) should replace the home page photo.
- Turn off the permanent "sale" prices in the admin unless they're real discounts.

**Setup**

- Product image colour tagging is enabled by the applied `20261109_product_image_colors.sql` migration.
- Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Netlify if not already, so the contact form and order emails send.
- In 3D Print OS: add the remaining materials and colours (the quoter only offers black PLA), capitalise "pla"/"black", and check the upload limit (the quoter says 100 MB, the server allows 50 MB).
- Merge the quoter panel-theming fix in `3d-print-os`.

**Risks**

- The quote page depends on 3D Print OS running on a temporary tunnel. Move its backend to always-on hosting.
- The site's quality names (Draft 0.3 / Standard 0.2 / High 0.12 mm on Custom prints) don't match the quoter's (0.28 / 0.2 / 0.15 mm).
- The contact form and order emails fail if the Resend settings are missing.

**Tidy-up**

- Delete the old custom-print flow (`/cart`, `/checkout`, `/quote-request`, STL upload code, `stl-upload` / `geometry-analysis` functions) once 3D Print OS fully replaces it.
- Delete the unused legacy pages `Pforge.tsx`, `Printique.tsx`, `BrandProductDetail.tsx`.
