# @alternatefutures/tokens

The single source of truth for the AlternateFutures brand: a Tailwind v4 CSS-first
`@theme` token system (oklch dark terminal palette, radius scale, brand accent
`#A5B2FF`) plus framework-agnostic JS color helpers.

## Install

```bash
npm install @alternatefutures/tokens
```

## Usage

### Full brand chrome (instant match)

In your app's global stylesheet:

```css
@import "tailwindcss";
@import "@alternatefutures/tokens/theme.css";
```

This gives you the tokens **and** the opinionated base layer: monospace body
font, the ambient brand glow, the CRT scanline overlay, and the `.af-scroll`
brand scrollbar utility.

### Tokens only (variables, no global chrome)

```css
@import "tailwindcss";
@import "@alternatefutures/tokens/tokens.css";
```

You then get the brand colors as Tailwind utilities — `bg-background`,
`text-foreground`, `bg-primary`, `text-term`, `border-term-faint`,
`rounded-lg`, etc. — without the body font / ambient effects.

### JS color helpers

```ts
import { BRAND, AVATAR_COLORS, seedColor } from "@alternatefutures/tokens";

const accent = BRAND.term;           // "#a5b2ff"
const color = seedColor(fingerprint); // stable per-identity oklch color
```

Use these where CSS variables can't reach (canvas, charts, inline styles,
server-computed colors).

## What's in here

- `tokens.css` — `:root`/`.dark` CSS variables + Tailwind v4 `@theme inline` map. Values only.
- `theme.css` — `@import "./tokens.css"` + the base layer (body font, glow, CRT, scrollbar).
- `dist/` — JS exports (`BRAND`, `AVATAR_COLORS`, `seedColor`), ESM + CJS + types.

## Conventions

This package is **values + brand chrome only** — no React, no components. Shared
React primitives belong in `@alternatefutures/ui`; product-specific components in
`@alternatefutures/<product>-ui`. To change a token: edit the CSS (and the JS
mirror if relevant), add a changeset (adding a token = minor; renaming/removing =
major via deprecate → alias → remove), and let CI version + publish.
