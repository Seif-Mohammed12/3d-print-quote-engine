# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mostly young Egyptians (late teens to early 30s) who find 3D Print It through Instagram and Facebook posts and land on the site from a phone, often mid-scroll, to check a price, pick a color, and order. Two jobs:

1. **Buy a ready-made product** — a gaming desk accessory (controller stand, headset stand, desk dock), a home decor piece (vase, wall panel, tray), or a bundle. They want to see the real object, the color options, and the price in EGP, then check out with cash on delivery or InstaPay.
2. **Get something custom printed** — upload an STL for an instant quote, or ask for design help / a volume run when they don't have a file.

Secondary: the owner/admin, who manages orders and stats in the admin area (out of scope for brand work).

## Product Purpose

3D Print It is an Egyptian 3D printing studio, founded in 2021. It started as a print-on-demand service and is becoming a product brand: its own line of gaming desk accessories and home decor, with custom printing kept alongside. Success means a visitor from social media sees a real print, trusts that a real maker made it, and orders it on their phone without friction.

## Positioning

A small, real maker's studio in Egypt that designs and prints its own objects, in colors you pick, priced in EGP and delivered locally. It isn't an anonymous print farm or an imported marketplace listing. The site should feel tactile, precise and a bit nerdy, made by a person. It should not read as a SaaS startup or a crypto landing page.

## Operating Context

- Traffic arrives from Instagram/Facebook links, mostly on phones, often on mobile data.
- Ordering: product cart → checkout with pickup (free) or Aramex delivery (cost confirmed after order), payment by cash on delivery or InstaPay.
- Custom work: STL upload → automatic volume/weight analysis → instant quote, or a quote request form.
- Contact through the contact page, phone and WhatsApp.

## Capabilities and Constraints

- Stack: React 18 + Vite + TypeScript, Tailwind + shadcn/Radix, Framer Motion, hosted on Netlify, data/auth/orders in Supabase.
- Supabase logic, routes, product data, and checkout/order flows are fixed. Design work is frontend presentation only.
- Materials offered: **PLA and PETG only**. Do not claim resin/SLA, ABS, nylon, TPU, or sub-0.1mm layer resolution.
- Turnaround: most orders are printed in about **48 hours** (delivery time is extra).
- Services that are real: ready-made products, custom STL printing with instant quotes, design help (sketch/idea → printable model), and volume/bulk orders.
- Product categories in data: `pforge` = Gaming & Setup, `printique` = Home & Decor. These are internal IDs; customer-facing labels are the category names.
- Product colors (from the catalog): Matte Black, Matte White, Matte Gray, Matte Light Blue, Matte Red. Some products support an LED add-on.
- Prices in EGP.
- Language: **English only.** Type choices must still render Arabic correctly as a fallback (Arabic product names, customer names, addresses).
- Studio location: **New Cairo, Egypt** (OK to show).
- **Open:** founder first name. The owner agreed to show it but hasn't supplied it yet. Use a clearly marked placeholder until they do.

## Brand Commitments

- Name: **3D Print It** (domain 3dprintit-eg.com). Logo at `public/logos/3d-print-it-logo.png`.
- Founded 2021, Egyptian.
- Voice: plain, specific, slightly playful. Banned filler: "Unlock", "Elevate", "Seamless", "Unleash", "Bring your ideas to life", "Turn your ideas into reality", "Next-gen", and similar.
- Real photos of real prints lead. No illustrations or stock imagery standing in for products.

## Evidence on Hand

- Product images live in Supabase storage: 6 gaming products have 2–3 images each; the 3 decor products (vase, wall panel, tray) have none. **The current Supabase images are renders of the studio's own designs, not photos of prints.** Treat them as temporary until real photos are shot.
- Two real photos of an older product (DualSense Display Stand) are in `public/pforge/`.
- No testimonials, reviews, order counts, press, or customer logos are on hand. Do not invent any.
- Removed as unverified: "AI-powered cost estimation", "FDM & SLA", "0.05mm layer resolution", "dedicated project manager", "parts up to 300×300×400mm".

## Product Principles

1. **The print is the proof.** Every claim should be backed by a photo of an actual object or a concrete spec (material, size, color, hours).
2. **Phone first, order fast.** The core path is social post → product → color → checkout, all on a 375px screen.
3. **Honest, specific, local.** Real materials, real turnaround, real EGP prices, real delivery options. Never over-claim capability.
4. **A person made this.** Show the maker, the machines, the layer lines. Being small is a strength, not something to hide.

## Accessibility & Inclusion

- WCAG 2.1 AA contrast and keyboard access as baseline.
- Respect `prefers-reduced-motion`.
- Many visitors are on mid-range Android phones and mobile data, so keep pages light and images properly sized.
- Arabic text (names, addresses) must render correctly with proper direction wherever user-entered content appears.
