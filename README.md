# alternate-ui

The AlternateFutures design system. A **layered graph of independently-versioned
packages** published to the public `@alternatefutures/*` npm scope and consumed by
every product (the cloud platform, video/comms, chat) from its own repo.

This mirrors how GitHub Primer, Adobe Spectrum, and Shopify Polaris ship: the
design system is developed in **one monorepo** (shared tooling, atomic
cross-layer changes, a single Changesets pipeline) but each package is versioned
and published independently. See
`handoffs/2026-06-21_ui-packaging-research-and-decision.md` in the workspace root
for the research and rationale.

## Layers (dependency flow is acyclic: lower never depends on upper)

```
@alternatefutures/tokens      CSS @theme vars + JS color helpers. The SSOT.   ← exists
        ▲
@alternatefutures/ui          shadcn-style React primitives (depends on tokens). ← when a 2nd app needs it
@alternatefutures/icons       standalone icon set.                              ← when needed
        ▲
@alternatefutures/<product>-ui  product-specific composed components.          ← extract per rule-of-three
  (clouds-ui · connect-ui · chat-ui)
```

**Promotion rule:** build product UI in the product app first; extract to a
shared package only when a **second** consumer needs it. Don't build `ui` /
`icons` / product kits speculatively.

## Packages

| Package | Status | Purpose |
|---|---|---|
| [`@alternatefutures/tokens`](packages/tokens) | ✅ initial | Tailwind v4 `@theme` brand tokens + JS color helpers |

## Develop

```bash
npm install            # installs workspace + shared dev tooling
npm run build          # build all packages
npm run typecheck      # typecheck all packages
npm run changeset      # record a version bump after a change
```

## Release

Independent per-package semver via [Changesets](https://github.com/changesets/changesets):

1. Add a changeset (`npm run changeset`) in your PR.
2. On merge to `main`, the version workflow bumps + commits the affected packages.
3. Cut a GitHub Release (or run the publish workflow) → `changeset publish`
   publishes any package whose version isn't yet on npm, with provenance.

Requires the `NPM_TOKEN` Actions secret (same setup as `alternate-e2ee`).

## Conventions

- Name by **architectural layer**, not visual concept: `tokens`, `ui`, `icons`,
  `<product>-ui`. Add a framework suffix (`-react`) only if a second framework
  target ever appears.
- Web-only stack → Tailwind v4 `@theme` is the canonical token source. Only adopt
  DTCG + Style Dictionary if a non-CSS consumer (Figma sync, native) appears.
- Declare `react` / `react-dom` / `tailwindcss` / Radix as **peerDependencies**
  in `ui` and product kits to avoid duplicate runtimes in consumer apps.
