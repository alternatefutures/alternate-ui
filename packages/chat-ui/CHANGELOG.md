# @alternatefutures/chat-ui

## 0.2.0

### Minor Changes

- e6f1673: Initial public release of the shared AlternateFutures UI kits, consumed by alternate-chat and alternate-connect.

  - **tokens** — oklch brand theme (`@theme` CSS variables, accent `#A5B2FF`) + framework-agnostic color helpers.
  - **ui** — brand primitives (Button, Input, Card, Avatar, Badge, Label, Divider), `FlameBackground` (animated flame canvas + spark channel), and `SecurityBadge` (the "ENCRYPTED · How?" indicator + security-layers popup).
  - **chat-ui** — `ChatView` (E2EE chat: grouped messages, replies, edit/delete, mentions, search, members, typing; `hideHeader` option) and `PassphraseLogin` (word-grid passphrase + optional name step; `header`/`intro`/`notice` slots).

### Patch Changes

- Updated dependencies [e6f1673]
  - @alternatefutures/tokens@0.2.0
  - @alternatefutures/ui@0.2.0
