# @alternatefutures/chat-ui

The shared, **presentation-only** chat room for AlternateFutures apps. `ChatView`
renders the full experience — message feed (grouping, replies, edits, deletes,
mentions, search), member roster, undecryptable banner, composer, and a typing
indicator — while every app injects its own transport and crypto.

It owns **no** WebSocket, no LiveKit, no keys. You pass it decrypted `messages`
and callbacks; it calls `onSend`/`onEdit`/`onDelete`/`onTypingChange` back.

## Install

```bash
npm install @alternatefutures/chat-ui @alternatefutures/ui @alternatefutures/tokens
```

Peers: `react`/`react-dom` 19, `lucide-react`, Tailwind v4. Add the kit to your
Tailwind sources:

```css
@import "tailwindcss";
@import "@alternatefutures/tokens/theme.css";
@source "../node_modules/@alternatefutures/ui/dist";
@source "../node_modules/@alternatefutures/chat-ui/dist";
```

## Usage

```tsx
import { ChatView } from "@alternatefutures/chat-ui";

<ChatView
  roomLabel={label}
  status={status}
  messages={messages}      // ChatMessage[] — your decrypted data mapped to the kit's shape
  events={events}          // join/leave SystemEvent[]
  members={members}
  me={{ username, fingerprint, pubkey }}
  creatorPubkey={creatorPubkey}
  undecryptable={undecryptable}
  typing={typing}          // TypingUser[] — the local user is filtered out
  renderBody={(text, { myName }) => renderMarkdown(text, myName)}  // injected — keeps markdown deps per-app
  onSend={(text, replyTo) => hook.send(text, replyTo)}
  onEdit={(ref, text) => hook.editMessage(ref, text)}
  onDelete={(ref) => hook.deleteMessage(ref)}
  onLeave={leave}
  onTypingChange={(active) => transport.setTyping(active)}  // for the is-typing feature
  footer={<BrandFooter />}  // per-app brand/logo
/>
```

## What's shared vs per-app

- **Shared (here):** the entire view + interaction logic, identity colors
  (`makeColorOf`/`seedColor` re-exported from tokens), the typing indicator UI.
- **Per-app (injected):** transport (relay hook for chat, LiveKit data adapter for
  connect), crypto, `renderBody` (markdown), the footer/brand, and the optional
  `onCaretSpark` flair.

## Exports

`ChatView`, `ChatMessageList`, `ChatInput`, `ChatAvatar`, `TypingIndicator`,
`makeColorOf`, `seedColor`, `AVATAR_COLORS`, `initials`, and the structural types
(`ChatMessage`, `Member`, `SystemEvent`, `TypingUser`, `Me`, `MsgRef`, `ConnStatus`,
`RenderBody`).
