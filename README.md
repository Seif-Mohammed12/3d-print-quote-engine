# 3D Print It

The storefront for a 3D printing studio in New Cairo, Egypt. Customers can browse the catalogue, order printed designs, request custom work, and contact the studio.

## Stack

- Vite, React 18, TypeScript, Tailwind CSS, and Radix UI
- Supabase for authentication, database, and product image storage
- Netlify Functions under `api/`
- Resend for contact, quote, order, and password-reset emails
- 3D Print OS for the embedded custom-print quoter at `/quote`

## Local development

```bash
npm install
npm run dev
```

`npm run dev` starts the site at `http://localhost:8080`. To run the site with Netlify Functions, copy `.env.example` to `.env.local`, fill in the required values, and run:

```bash
npm run dev:netlify
```

This starts the full local site at `http://localhost:8888`.

## Environment variables

The browser needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Netlify Functions need the Supabase server variables, `ADMIN_EMAILS`, and Resend's `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. The Resend sender must use a verified domain.

See `.env.example` for the complete template. Never commit `.env.local` or service-role/API keys.

## Commands

```bash
npm run build
npm run lint
npm run test
```

Deployments use Netlify's `npm run build` command and publish the `dist` directory. Pushes to `main` deploy to production.

## Project guides

- `WEBSITE.md` — current routes, architecture, and operational notes
- `DESIGN.md` — visual system and catalogue conventions
- `PRODUCT.md` — audience, positioning, and voice
- `SHOT_LIST.md` — photography plan
- `HANDOFF.md` — current ownership and deployment notes
