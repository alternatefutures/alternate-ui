# @alternatefutures/ui

Shared React UI primitives for AlternateFutures apps — shadcn-style components
styled entirely through `@alternatefutures/tokens`, so the same buttons, inputs,
cards, and avatars render identically across chat, connect, and the platform.

## Install

```bash
npm install @alternatefutures/ui @alternatefutures/tokens
```

Peers: `react` / `react-dom` 19, and **Tailwind v4** (the consumer processes the
class names).

## Setup (consumer)

```css
/* globals.css */
@import "tailwindcss";
@import "@alternatefutures/tokens/theme.css";

/* Tailwind v4 ignores node_modules by default — tell it to scan this package
   so the primitives' utility classes are generated: */
@source "../node_modules/@alternatefutures/ui/dist";
```

```tsx
import { Button, Input, Card, Avatar, AvatarFallback, Badge, Label, Divider } from "@alternatefutures/ui";
```

## Components

`Button` (variants: default/destructive/outline/secondary/ghost/link; sizes:
default/sm/lg/icon · `asChild`), `Input`, `Card` (+ Header/Title/Description/
Content/Footer), `Avatar` (+ Image/Fallback), `Badge` (default/secondary/success/
outline/destructive), `Label`, `Divider`, and the `cn` class-merge helper.

## Conventions

- **No color literals.** Components reference token CSS vars (`bg-primary`,
  `border-input`, `text-muted-foreground`…). Per-app accent = override the token,
  not the component.
- Components are client-side (`'use client'`) for Next App Router compatibility.
- Chat-specific components live in `@alternatefutures/chat-ui`, not here.
