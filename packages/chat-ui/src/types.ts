/**
 * Structural mirrors of alt-chat's hook/protocol types, so @alternatefutures/chat-ui
 * stays free of any transport/crypto internals. Each consuming app maps its own
 * decrypted data onto these shapes before handing them to ChatView.
 */
import type { ReactNode } from 'react'

/** Reference to a specific message by author pubkey + per-author sequence. */
export type MsgRef = { p: string; s: number }

export type ConnStatus =
  | 'idle'
  | 'deriving'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

export type ChatMessage = {
  /** Stable unique key (e.g. `${pubkey}:${seq}`). */
  key: string
  pubkey: string
  seq: number
  fingerprint: string
  username: string
  text: string
  ts: number
  /** True if authored by the local user. */
  mine: boolean
  edited?: boolean
  deleted?: boolean
  replyTo?: MsgRef
}

export type Member = {
  pubkey: string
  username: string
  fingerprint: string
  /** Same username claimed by another online pubkey (impersonation flag). */
  spoof: boolean
  pid?: string
}

export type SystemEvent = {
  kind: 'system'
  key: string
  ts: number
  type: 'join' | 'leave'
  username: string
  fingerprint: string
  pubkey: string
}

/** A participant currently composing a message (drives the typing indicator). */
export type TypingUser = { fingerprint: string; username: string }

/** The local user's identity, as ChatView needs it. */
export type Me = { username: string; fingerprint: string; pubkey: string }

/** Injected markdown/text renderer — keeps app-specific markdown deps out of the kit. */
export type RenderBody = (text: string, opts: { myName: string }) => ReactNode
