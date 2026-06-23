# CAF — Coffee at Friends — Café Website

Cinematic one-page site for **CAF (Coffee at Friends)** — a warm, easy corner in New Delhi for honest coffee and good company.

> _Good coffee, better company._

## Stack

- Hand-written **HTML / CSS / JavaScript** — no build step, no framework.
- Google Fonts (Fraunces, Cormorant Garamond, Inter, DM Mono).
- Unsplash imagery loaded directly from their CDN.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup, sections, copy. |
| `styles.css` | Design system, layout, animations. |
| `script.js` | Loader, scroll reveals, reservation timetable, form. |
| `logo.webp` | Legacy favicon image — replace with a CAF icon. |

## Run locally

Any static server works. For example:

```bash
python3 -m http.server 5173
# then open http://localhost:5173
```

## Sections

1. Hero — good coffee & good company in warm afternoon light.
2. Story / brand pillars.
3. Signature menu items.
4. Full menu (filterable).
5. Spaces gallery.
6. Reservation form.
7. Visit / contact.

## Loader

Animated scene — three friends raising a coffee toast (two hot cups with rising steam, one iced glass with a straw), with a halo glow and a brand reveal. Respects `prefers-reduced-motion`.

## Brand

- Instagram: [@coffeeatfriends_delhi](https://www.instagram.com/coffeeatfriends_delhi/)
- Map: https://www.google.com/maps/place/Coffee+at+Friends/@28.6320841,77.0960299,17z/
- Phone / email / address in `index.html` are placeholders — replace with the verified café details.
