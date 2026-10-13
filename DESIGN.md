---
name: 3D Print It (incumbent, pre-redesign)
description: Baseline record of the current dark neon storefront, captured before the 2026 redesign as a reference and anti-reference.
colors:
  void-navy: "hsl(220 20% 4%)"
  frost-text: "hsl(210 20% 92%)"
  panel-navy: "hsl(220 18% 8%)"
  slate-raised: "hsl(220 16% 14%)"
  slate-muted: "hsl(220 14% 12%)"
  fog-gray: "hsl(215 15% 55%)"
  hairline-slate: "hsl(220 16% 16%)"
  neon-cyan: "hsl(190 100% 50%)"
  electric-violet: "hsl(260 80% 60%)"
  alarm-red: "hsl(0 72% 51%)"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 7vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.2em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  card: "16px"
  pill: "9999px"
spacing:
  section-y-mobile: "80px"
  section-y-desktop: "112px"
  gutter-mobile: "16px"
  gutter-desktop: "32px"
  card-pad: "24px"
components:
  button-primary:
    backgroundColor: "{colors.neon-cyan}"
    textColor: "{colors.void-navy}"
    rounded: "{rounded.lg}"
    padding: "14px 32px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.lg}"
    padding: "14px 32px"
  card-glass:
    backgroundColor: "{colors.panel-navy}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-pad}"
  eyebrow-pill:
    backgroundColor: "{colors.neon-cyan}"
    textColor: "{colors.neon-cyan}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
---

# Design System: 3D Print It (incumbent, pre-redesign)

> **Status: baseline only.** This file records the system as it shipped before the redesign the owner commissioned in October 2026. It is evidence and an anti-reference, not guidance. When the new direction is implemented, `/impeccable document` will replace this file with the new system.

## Overview

**Creative North Star: "The Default Dark Tech Template"** (descriptive, not aspirational)

The current site is a near-black navy canvas with a saturated cyan accent, a violet secondary used mainly in gradients, translucent "glass" cards with blur and a faint cyan glow, and Space Grotesk headings over Inter body text. Most sections share one rhythm: centered gradient-text heading, centered subtitle, then a grid of equal cards. Pages also layer their own one-off Tailwind slate/blue values (`slate-950`, `blue-200`, raw `rgba(59,130,246,…)` radial blobs) on top of the token set, so the shop and product pages drift from the home page.

The visual language is generic. It could front a SaaS dashboard, a crypto wallet or an AI tool unchanged, and nothing in it says physical objects, layer lines, plastic or an Egyptian maker. Product photography, the brand's only real proof, appears late and small, or not at all (the home "Our Work" grid is gradient squares with a box icon).

**Key Characteristics:**
- Dark navy background, neon cyan accent, violet gradient partner.
- Glassmorphism cards (`backdrop-blur-xl`, 60% card fill, cyan glow shadow) with hover lift.
- Gradient text on most section headings.
- Centered layouts and uniform section padding (80px mobile / 112px desktop) everywhere.
- Blurred radial color blobs and a 60px grid-line background behind heroes.
- Framer Motion fade-up-on-scroll on nearly every block (disabled on mobile in some places).

## Colors

A cold, high-contrast dark palette built around one electric cyan.

### Primary
- **Neon Cyan** (hsl(190 100% 50%)): primary buttons, links, focus ring, active states, glow shadows, the "It" in the wordmark.

### Secondary
- **Electric Violet** (hsl(260 80% 60%)): only appears as the far end of the cyan→violet `gradient-text` and in decorative gradient fills.

### Neutral
- **Void Navy** (hsl(220 20% 4%)): page background.
- **Panel Navy** (hsl(220 18% 8%)): cards, popovers (usually at 60% opacity with blur).
- **Slate Raised / Slate Muted** (hsl(220 16% 14%) / hsl(220 14% 12%)): secondary buttons, hover fills, muted surfaces.
- **Hairline Slate** (hsl(220 16% 16%)): borders and inputs.
- **Frost Text** (hsl(210 20% 92%)): primary text.
- **Fog Gray** (hsl(215 15% 55%)): secondary text. This is low contrast on Panel Navy at small sizes.
- **Alarm Red** (hsl(0 72% 51%)): destructive actions and errors.

**Off-token drift:** the shop and product pages hard-code Tailwind `slate-950/900/800`, `blue-200/300`, `amber-200`, and raw `rgba(37,99,235,…)` / `rgba(34,197,94,…)` radial gradients, so there are effectively two blues and a stray green.

## Typography

**Display Font:** Space Grotesk (system-ui fallback)
**Body Font:** Inter (system-ui fallback)

**Character:** a stock "tech startup" pairing. Space Grotesk's quirks are lost at bold weights under gradient fills, and Inter is the default body face of the category. Neither has Arabic coverage, so Arabic customer names fall back to the system font.

### Hierarchy
- **Display** (700, 36px → 72px, ~1.1): home hero, shop hero ("Ready-made prints, all in one place.").
- **Headline** (700, 30px → 48px): `SectionHeading`, usually with gradient text.
- **Title** (600, 16–20px): card titles.
- **Body** (400, 14–18px): descriptions, mostly `text-muted-foreground`.
- **Label** (600, 10–12px, 0.2–0.35em tracking, uppercase): eyebrows such as "PRODUCTS" and "SHOP PRODUCTS", category labels on cards.

## Layout

Centered single-column composition inside `container` (max 1400px, 2rem padding; the shop uses max-w-6xl). Every marketing section uses `section-padding` (py-20 / md:py-28, px-4 / md:px-8), so the vertical rhythm never changes. Grids are 1 → 2 → 3/4 columns of equal cards. The fixed 64px top bar has a hamburger that opens a left sidebar at every breakpoint, so desktop gets no visible nav links. Mobile handling is mostly "stack the grid".

## Elevation & Depth

Depth comes from glow rather than shadow: `glass-card` adds `0 0 30px -10px` cyan at 8%, hovering raises it to 15% with a 4px lift, and `neon-border` adds outer and inset cyan glows. Backgrounds layer blurred radial blobs (blue, green, violet) and a gradient wash. Nothing reads as a physical surface.

## Shapes

Soft and uniform: 12px radius on cards and buttons (16px on shop cards), pill radius on eyebrows, badges and the cart count. Thin 1px borders at low opacity. There is no shape language tied to printing (no layer, grid or tolerance motifs beyond the generic 60px grid background).

## Components

### Buttons
- **Shape:** 12px radius (`rounded-lg`).
- **Primary:** neon-cyan fill, near-black text, 14×32px padding, semibold. Hover adds a cyan glow (`0 0 30px -5px`).
- **Outline:** 1px hairline border, frost text, hover fills slate.
- **Text link:** cyan or blue-200 with an arrow icon ("Explore products →").

### Cards / Containers
- **Glass card:** Panel Navy at 60%, `backdrop-blur-xl`, hairline border at 50%, 12px radius, cyan glow; the hover variant lifts 4px.
- **Shop product card:** slate-950/70 fill, 16px radius, 176px image well with a dark bottom gradient overlay, uppercase blue category label, title, 2-line clamp, EGP price in blue-200, full-width "Add to cart" plus a "Details" text link.
- **Feature card:** icon in a 40px rounded cyan-tinted square, then title, then one line of copy, repeated six times.

### Navigation
- Fixed translucent blurred top bar: hamburger, logo tile with cyan ring glow, "3D Print **It**" wordmark, cart icon with count badge, Login button or user menu.
- Left slide-in sidebar holds all page links with icons and a highlighted "Get a Quote".

### Eyebrow Pill
Cyan-tinted pill with cyan text ("Next-Gen 3D Printing") above the hero headline.

## Do's and Don'ts

These record what the redesign must move away from, confirmed by the owner's brief.

### Do:
- **Do** keep the functional parts: cart preview, quick-add dialog, color selection, EGP pricing, and the checkout and order flows.
- **Do** keep the real product photography and give it far more space.

### Don't:
- **Don't** carry forward gradient text, the neon cyan/violet pair, glass cards, blurred blobs or glow shadows.
- **Don't** reuse the centered hero with eyebrow pill + headline + subtitle + two buttons.
- **Don't** reuse the six-card icon-in-square feature grid or uniform `section-padding` rhythm.
- **Don't** reuse copy that over-claims (resin/SLA, 0.05mm, "AI-powered", "dedicated project manager") or filler ("Turn Your Ideas Into Reality", "Next-Gen").
