# Photo shot list

The site is built around square "sleeve" photos on a graphite background. The current product images are renders, so every product needs real photos of the actual print. Placeholders on the site say "Photo on the way" and quote the shot number below.

## How to shoot everything

- **Square (1:1), at least 2000 × 2000 px.** The shop, product page and gallery all crop square.
- **Dark, matte background.** A black or dark-grey card, or the dark desk you already use. Same background for every product so the shelf looks like one set.
- **One soft light from the side** (a window or one lamp with a diffuser). Side light is what makes layer lines read as texture.
- **Real prints only**, in the colours you actually sell (Matte Black, White, Grey, Light Blue, Red, plus any others in the admin).
- **Leave a little space on the left.** The coloured spine sits on the left edge of each photo.
- Phone is fine. Turn off beauty and portrait modes and don't over-sharpen.

For each product, shoot three frames:
- **A: Hero.** The product alone, three-quarter view, filling about 70% of the square.
- **B: In use.** On a real desk with the thing it holds (headphones, controller, phone, mug).
- **C: Detail.** A close-up of the layer lines or the joint or texture that makes the piece.

## The list

| # | Where it's used | What to shoot |
|---|---|---|
| 0 | Home opening, full width (landscape 3:2 or wider, 2400 px+) | A dramatic close-up of layer lines on a real print, lit from one side, subject on the left third and dark empty space on the right for the headline. Currently a crop of the Lumo Stand render (`public/images/hero-lumo-*.webp`). |
| 1 | Home, "A small studio…" (4:3) | The founder at the printers in New Cairo, a print coming off the bed. Natural light, no staging. |
| 2 | Onami Stand | A, B (with headphones), C (the flowing ribs) |
| 3 | ArcEase Stand | A, B, C |
| 4 | Lumo Stand | A, B, C |
| 5 | ArcDock Duo | A, B (phone and watch charging), C |
| 6 | MagDock Duo | A, B, C |
| 7 | ClampCup Mount | A, B (clamped to a desk edge with a mug), C (the clamp) |
| 8 | Organic Flow Vase (shop placeholder) | On a desk with dried stems, soft side light so the layer lines show. Plus A and C. |
| 9 | Geometric Wall Panel (shop placeholder) | Three panels mounted on a plain wall, light raking from one side to show depth. Plus one panel alone. |
| 10 | Halo Catch-All Tray (shop placeholder) | From above, holding keys, a watch and earbuds. Plus A. |
| 11 | Custom prints page (4:3) | A customer's custom print next to their sketch, or the STL open on a laptop. |
| 12 | About page (4:5 portrait) | Portrait of the founder at the desk with a part in hand, printers soft in the background. |
| 13 | Gallery | A batch of the same custom part laid out in rows on the print bed. |
| 14 | Gallery | Close-up of layer lines on a curved print, light raking across it. |
| 15 | Gallery | A custom gift print being packed for delivery. |

## Where to put them

- **Products (2–10):** upload in the admin product editor. The first image becomes the sleeve everywhere.
- **Studio shots (1, 11, 12) and gallery extras (13–15):** send them over and they get wired into the `PhotoPending` slots in `src/pages/Home.tsx`, `Services.tsx`, `About.tsx` and `Gallery.tsx`.
