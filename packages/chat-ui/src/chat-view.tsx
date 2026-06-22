'use client'

import * as React from 'react'
import {
  Hash,
  Users,
  Search,
  LogOut,
  X,
  Reply,
  Pencil,
  Trash2,
  CornerUpLeft,
  Crown,
} from 'lucide-react'
import { cn } from '@alternatefutures/ui'
import { ChatMessageList } from './chat-message-list'
import { ChatAvatar } from './chat-avatar'
import { ChatInput } from './chat-input'
import { TypingIndicator } from './typing-indicator'
import { initials, makeColorOf, seedColor } from './colors'
import type {
  ChatMessage,
  ConnStatus,
  Me,
  Member,
  MsgRef,
  RenderBody,
  SystemEvent,
  TypingUser,
} from './types'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const msgRef = (m: ChatMessage): MsgRef => ({ p: m.pubkey, s: m.seq })

// Split text on the query (case-insensitive) and highlight matches.
function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text
  const parts: React.ReactNode[] = []
  const lower = text.toLowerCase()
  const ql = q.toLowerCase()
  let i = 0
  let n = 0
  while (i < text.length) {
    const hit = lower.indexOf(ql, i)
    if (hit === -1) {
      parts.push(text.slice(i))
      break
    }
    if (hit > i) parts.push(text.slice(i, hit))
    parts.push(
      <mark key={n++} className="rounded bg-[#a5b2ff]/40 px-0.5 text-white">
        {text.slice(hit, hit + q.length)}
      </mark>,
    )
    i = hit + q.length
  }
  return parts
}

// Find the @mention token the caret is currently inside (for autocomplete).
function activeMention(
  text: string,
  caret: number,
): { query: string; start: number; end: number } | null {
  let i = caret - 1
  while (i >= 0 && /[\w-]/.test(text[i])) i--
  if (i < 0 || text[i] !== '@') return null
  if (i > 0 && /\S/.test(text[i - 1])) return null // '@' must follow whitespace/start
  return { query: text.slice(i + 1, caret), start: i, end: caret }
}

function DateDivider({ ts }: { ts: number }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-[#a5b2ff1a]" />
      <span className="text-[11px] text-white/70">{formatDate(ts)}</span>
      <div className="h-px flex-1 bg-[#a5b2ff1a]" />
    </div>
  )
}

// Discord-style hover actions, top-right of a message: reply (anyone),
// edit + delete (your own only).
function MessageActions({
  mine,
  onReply,
  onEdit,
  onDelete,
}: {
  mine: boolean
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const btn =
    'flex size-7 items-center justify-center text-white/70 transition-colors hover:bg-[#a5b2ff1a] hover:text-[#a5b2ff]'
  return (
    <div className="absolute -top-3 right-2 z-10 hidden overflow-hidden rounded border border-[#a5b2ff26] bg-[#0c0e16] shadow-lg group-hover:flex">
      <button onClick={onReply} title="Reply" aria-label="Reply" className={btn}>
        <Reply className="size-3.5" />
      </button>
      {mine && (
        <button onClick={onEdit} title="Edit" aria-label="Edit" className={btn}>
          <Pencil className="size-3.5" />
        </button>
      )}
      {mine && (
        <button
          onClick={onDelete}
          title="Delete"
          aria-label="Delete"
          className="flex size-7 items-center justify-center text-white/70 transition-colors hover:bg-[#ff5a5a1a] hover:text-[#ff8a8a]"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// A quoted reference shown above a reply (clickable → scrolls to the original).
function ReplyQuote({
  m,
  byKey,
  colorOf,
}: {
  m: ChatMessage
  byKey: Map<string, ChatMessage>
  colorOf: (fp: string) => string
}) {
  if (!m.replyTo) return null
  const target = byKey.get(`${m.replyTo.p}:${m.replyTo.s}`)
  return (
    <button
      onClick={() => {
        if (target) document.getElementById(`msg-${target.key}`)?.scrollIntoView({ block: 'center' })
      }}
      className="mb-0.5 flex max-w-full items-center gap-1.5 text-left text-[12px] text-white/60 transition-colors hover:text-white/90"
    >
      <CornerUpLeft className="size-3 shrink-0 text-[#a5b2ff]" />
      {target ? (
        <>
          <span className="shrink-0 font-medium" style={{ color: colorOf(target.fingerprint) }}>
            {target.username}
          </span>
          <span className="truncate">{target.deleted ? 'message deleted' : target.text}</span>
        </>
      ) : (
        <span className="italic text-white/40">original message</span>
      )}
    </button>
  )
}

// Message body: deleted tombstone, inline editor, or rendered text + (edited).
// MODULE-LEVEL on purpose — defined inside ChatView it would be a new component
// type every render, remounting the <textarea> on each keystroke (lost focus).
function MessageBody({
  m,
  editing,
  setEditing,
  onSave,
  onCancel,
  myName,
  renderBody,
}: {
  m: ChatMessage
  editing: { key: string; draft: string } | null
  setEditing: (e: { key: string; draft: string } | null) => void
  onSave: () => void
  onCancel: () => void
  myName: string
  renderBody: RenderBody
}) {
  if (m.deleted) {
    return <span className="text-[13px] italic text-white/40">message deleted</span>
  }
  if (editing?.key === m.key) {
    return (
      <div className="mt-0.5">
        <textarea
          autoFocus
          onFocus={(e) => {
            const n = e.currentTarget.value.length
            e.currentTarget.setSelectionRange(n, n)
          }}
          value={editing.draft}
          onChange={(e) => setEditing({ key: m.key, draft: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSave()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
          rows={1}
          className="af-scroll w-full resize-none rounded border border-[#a5b2ff40] bg-[#0a0c14]/85 px-2 py-1 text-[13px] text-foreground outline-none focus:border-[#a5b2ff99]"
        />
        <div className="mt-1 text-[11px] text-white/50">
          <span className="text-[#cdd6ff]">↵</span> save ·{' '}
          <button onClick={onCancel} className="text-[#cdd6ff] hover:underline">
            esc
          </button>{' '}
          cancel
        </div>
      </div>
    )
  }
  return <RenderedBody text={m.text} myName={myName} edited={m.edited} renderBody={renderBody} />
}

// Memoized so the body is rendered once per (text, myName), not on every hover.
const RenderedBody = React.memo(function RenderedBody({
  text,
  myName,
  edited,
  renderBody,
}: {
  text: string
  myName: string
  edited?: boolean
  renderBody: RenderBody
}) {
  const body = React.useMemo(() => renderBody(text, { myName }), [text, myName, renderBody])
  return (
    <span>
      {body}
      {edited && <span className="ml-1 text-[10px] text-white/40">(edited)</span>}
    </span>
  )
})

// Consecutive messages from the same sender within this window are grouped.
const GROUP_WINDOW_MS = 5 * 60_000

const STATUS_DOT: Record<ConnStatus, string> = {
  connected: 'bg-[#a5b2ff] animate-pulse',
  deriving: 'bg-amber-400 animate-pulse',
  connecting: 'bg-amber-400 animate-pulse',
  reconnecting: 'bg-amber-400 animate-pulse',
  error: 'bg-[#ff5a5a]',
  idle: 'bg-[#5b639b]',
}

const STATUS_TEXT: Record<ConnStatus, string> = {
  connected: 'CONNECTED',
  deriving: 'DERIVING',
  connecting: 'CONNECTING',
  reconnecting: 'RECONNECTING',
  error: 'ERROR',
  idle: 'IDLE',
}

export interface ChatViewProps {
  roomLabel: string
  status: ConnStatus
  messages: ChatMessage[]
  events: SystemEvent[]
  members: Member[]
  /** The local user's identity. */
  me: Me
  creatorPubkey: string
  undecryptable: number
  /** Participants currently typing (the local user is filtered out automatically). */
  typing?: TypingUser[]
  /** Injected text/markdown renderer — keeps app-specific markdown deps out of the kit. */
  renderBody: RenderBody
  onSend: (text: string, replyTo?: MsgRef) => void
  onEdit: (target: MsgRef, newText: string) => void
  onDelete: (target: MsgRef) => void
  onLeave: () => void
  /** Fired as the composer gains/loses content; the app debounces + transports it. */
  onTypingChange?: (active: boolean) => void
  /** Optional flair: called with screen coords as characters are typed (e.g. flame ember). */
  onCaretSpark?: (x: number, y: number) => void
  /** Hide the built-in header bar (room label, search, members, leave) so the host
   *  app can supply its own chrome — e.g. connect's meeting panel. Default false. */
  hideHeader?: boolean
}

export function ChatView({
  roomLabel,
  status,
  messages,
  events,
  members,
  me,
  creatorPubkey,
  undecryptable,
  typing = [],
  renderBody,
  onSend,
  onEdit,
  onDelete,
  onLeave,
  onTypingChange,
  onCaretSpark,
  hideHeader = false,
}: ChatViewProps) {
  const [draft, setDraft] = React.useState('')
  const [showMembers, setShowMembers] = React.useState(false)
  const [searchInput, setSearchInput] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [replyingTo, setReplyingTo] = React.useState<ChatMessage | null>(null)
  const [editing, setEditing] = React.useState<{ key: string; draft: string } | null>(null)
  const [mention, setMention] = React.useState<{ query: string; start: number; end: number } | null>(
    null,
  )
  const [mIdx, setMIdx] = React.useState(0)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const lastMentionQuery = React.useRef<string | null>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const controlsRef = React.useRef<HTMLDivElement>(null)
  const slug = roomLabel

  // Assign each identity a UNIQUE color so no two participants ever share one.
  const colorOf = React.useMemo(() => {
    const fps: string[] = []
    for (const m of members) fps.push(m.fingerprint)
    for (const m of messages) fps.push(m.fingerprint)
    return makeColorOf(fps)
  }, [members, messages])

  // Click outside an open popup (members or search results) closes it.
  React.useEffect(() => {
    if (!showMembers && !query) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || controlsRef.current?.contains(t)) return
      setShowMembers(false)
      setQuery('')
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [showMembers, query])

  // Resolve a reply target → its message, for the quoted preview.
  const byKey = React.useMemo(() => {
    const map = new Map<string, ChatMessage>()
    for (const m of messages) map.set(m.key, m)
    return map
  }, [messages])

  // Mention candidates: everyone online + everyone who has spoken.
  const namePool = React.useMemo(() => {
    const set = new Map<string, string>()
    for (const mem of members) set.set(mem.username.toLowerCase(), mem.username)
    for (const m of messages) set.set(m.username.toLowerCase(), m.username)
    return [...set.values()]
  }, [members, messages])

  const mentionItems = React.useMemo(() => {
    if (!mention) return []
    const q = mention.query.toLowerCase()
    return namePool.filter((n) => n.toLowerCase().includes(q)).slice(0, 8)
  }, [mention, namePool])
  const mentionOpen = !!mention && mentionItems.length > 0
  const activeIdx = mentionItems.length ? Math.min(mIdx, mentionItems.length - 1) : 0

  // Messages matching the submitted search query (text or sender).
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return messages.filter(
      (m) => !m.deleted && (m.text.toLowerCase().includes(q) || m.username.toLowerCase().includes(q)),
    )
  }, [messages, query])
  const prevLen = React.useRef(0)
  const charW = React.useRef(0)

  // Each typed character can ignite a spark at the caret's screen position (opt-in).
  function caretSpark(ta: HTMLTextAreaElement) {
    if (!onCaretSpark) return
    if (!charW.current) {
      const m = document.createElement('canvas').getContext('2d')
      if (m) {
        const cs = getComputedStyle(ta)
        m.font = `${cs.fontSize} ${cs.fontFamily}`
        charW.current = m.measureText('M').width || 8
      } else {
        charW.current = 8
      }
    }
    const rect = ta.getBoundingClientRect()
    const padL = parseFloat(getComputedStyle(ta).paddingLeft) || 0
    const caret = ta.selectionStart ?? ta.value.length
    const rawX = rect.left + padL + caret * charW.current - ta.scrollLeft
    const x = Math.min(Math.max(rawX, rect.left), rect.right)
    onCaretSpark(x, rect.top + rect.height / 2)
  }

  function updateMention(ta: HTMLTextAreaElement) {
    const m = activeMention(ta.value, ta.selectionStart ?? ta.value.length)
    setMention(m)
    const q = m ? m.query : null
    if (q !== lastMentionQuery.current) {
      setMIdx(0)
      lastMentionQuery.current = q
    }
  }

  function pickMention(name: string) {
    if (!mention) return
    const before = draft.slice(0, mention.start)
    const after = draft.slice(mention.end)
    const inserted = `@${name} `
    const next = before + inserted + after
    setDraft(next)
    setMention(null)
    const caret = before.length + inserted.length
    requestAnimationFrame(() => {
      const ta = inputRef.current
      if (ta) {
        ta.focus()
        ta.setSelectionRange(caret, caret)
      }
    })
  }

  function send() {
    const text = draft.trim()
    if (!text) return
    onSend(text, replyingTo ? msgRef(replyingTo) : undefined)
    setDraft('')
    setReplyingTo(null)
    setMention(null)
    prevLen.current = 0
    onTypingChange?.(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMIdx((i) => (i + 1) % mentionItems.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMIdx((i) => (i - 1 + mentionItems.length) % mentionItems.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pickMention(mentionItems[activeIdx])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMention(null)
        return
      }
    }
    if (e.key === 'Escape' && replyingTo) {
      e.preventDefault()
      setReplyingTo(null)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function startReply(m: ChatMessage) {
    setReplyingTo(m)
    setEditing(null)
    inputRef.current?.focus()
  }

  function startEdit(m: ChatMessage) {
    setEditing({ key: m.key, draft: m.text })
    setReplyingTo(null)
  }

  function saveEdit() {
    if (!editing) return
    const t = editing.draft.trim()
    const target = byKey.get(editing.key)
    if (t && target && t !== target.text) onEdit(msgRef(target), t)
    setEditing(null)
  }

  // Merge chat messages + presence (join/leave) events into one time-ordered feed.
  type FeedItem =
    | { kind: 'msg'; ts: number; m: ChatMessage; showDate: boolean }
    | (SystemEvent & { showDate: boolean })
  const feed = React.useMemo<FeedItem[]>(() => {
    const items: Array<{ kind: 'msg'; ts: number; m: ChatMessage } | SystemEvent> = [
      ...messages.map((m) => ({ kind: 'msg' as const, ts: m.ts, m })),
      ...events,
    ]
    items.sort((a, b) => a.ts - b.ts)
    let lastDay = ''
    return items.map((it) => {
      const day = new Date(it.ts).toDateString()
      const showDate = day !== lastDay
      lastDay = day
      return { ...it, showDate }
    })
  }, [messages, events])

  const typingOthers = typing.filter((t) => t.fingerprint !== me.fingerprint)

  return (
    <div className="relative flex h-full w-full flex-col text-[13px]">
      {/* ── header — FULL-WIDTH gradient scrim. Hidden when the host app supplies
          its own chrome (hideHeader), e.g. connect's meeting panel. ── */}
      {!hideHeader && (
      <header className="w-full bg-gradient-to-b from-background via-background to-transparent">
        <div
          className="mx-auto w-full max-w-3xl px-3 pb-4 sm:px-4"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Hash className="size-4 shrink-0 text-[#a5b2ff]/80" />
              <span className="truncate font-medium text-[#a5b2ff]">{slug}</span>
              <span
                className={cn('ml-1.5 inline-block size-2 shrink-0 rounded-full', STATUS_DOT[status])}
                title={`${STATUS_TEXT[status]} · end-to-end encrypted`}
              />
            </div>
            <div ref={controlsRef} className="flex shrink-0 items-center gap-2">
              <button
                onClick={onLeave}
                title="Leave room"
                className="p-1 text-[#5b639b] transition-colors hover:text-[#a5b2ff]"
              >
                <LogOut className="size-4" />
              </button>
              <span className="select-none text-[#5b639b]/40">|</span>
              <button
                onClick={() => {
                  setQuery('')
                  setShowMembers((v) => !v)
                }}
                aria-pressed={showMembers}
                title="Members"
                className={cn(
                  'flex items-center gap-1 px-1 py-1 text-[12px] text-[#5b639b] transition-colors hover:text-[#a5b2ff]',
                  showMembers && 'text-[#a5b2ff]',
                )}
              >
                <Users className="size-4" />
                <span className="tabular-nums">{members.length}</span>
              </button>
              <span className="hidden select-none text-[#5b639b]/40 sm:inline">|</span>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setQuery(searchInput.trim())
                  if (searchInput.trim()) setShowMembers(false)
                }}
                className="group ml-1 hidden items-center gap-1.5 rounded border border-[#5b639b] bg-[#0a0c14]/60 px-2 py-1 transition-colors focus-within:border-[#a5b2ff] sm:flex"
              >
                <Search className="size-3.5 shrink-0 text-[#5b639b] transition-colors group-focus-within:text-[#a5b2ff]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search"
                  aria-label="Search messages"
                  className="w-24 bg-transparent text-[12px] text-[#5b639b] outline-none transition-colors placeholder:text-[#5b639b]/60 group-focus-within:text-[#a5b2ff] md:w-32"
                />
              </form>
            </div>
          </div>
        </div>
      </header>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* ── search results panel ── */}
        {query && (
          <div ref={panelRef} className="absolute inset-x-0 top-0 z-20 mx-auto max-w-3xl px-3 pb-3 sm:px-4">
            <div className="rounded border border-[#a5b2ff40] bg-[#0c0e16]/95 p-3 shadow-[0_16px_28px_-12px_rgba(0,0,0,0.85)] backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[12px] text-white/70">
                  {results.length} result{results.length === 1 ? '' : 's'} for{' '}
                  <span className="text-white">“{query}”</span>
                </p>
                <button
                  onClick={() => {
                    setQuery('')
                    setSearchInput('')
                  }}
                  title="Close search"
                  className="rounded p-0.5 text-white/70 transition-colors hover:bg-[#a5b2ff1a] hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
              {results.length === 0 && <p className="text-[12px] text-white/45">no matches.</p>}
              <div className="af-scroll flex max-h-72 flex-col gap-2 overflow-y-auto">
                {results.map((m) => (
                  <div key={m.key} className="text-[12px]">
                    <span className="font-medium" style={{ color: colorOf(m.fingerprint) }}>
                      {m.username}
                    </span>{' '}
                    <span className="text-white/60">{formatTime(m.ts)}</span>
                    <div className="whitespace-pre-wrap break-words text-white/90">
                      {highlight(m.text, query)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── members panel ── */}
        {showMembers && (
          <div ref={panelRef} className="absolute inset-x-0 top-0 z-20 mx-auto max-w-3xl px-3 pb-3 sm:px-4">
            <div className="rounded border border-[#a5b2ff40] bg-[#0c0e16]/95 p-3 shadow-[0_16px_28px_-12px_rgba(0,0,0,0.85)] backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[12px] text-[#828dd6]">{'// users'}</p>
                <button
                  onClick={() => setShowMembers(false)}
                  title="Close"
                  className="rounded p-0.5 text-white/70 transition-colors hover:bg-[#a5b2ff1a] hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
              {members.length === 0 ? (
                <p className="text-[12px] text-white/70">no one has spoken yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4">
                  {members.map((m) => (
                    <div
                      key={m.pubkey}
                      className="flex min-w-0 items-center gap-2"
                      title={`${m.username} · ${m.fingerprint}`}
                    >
                      <ChatAvatar
                        seed={m.fingerprint}
                        color={colorOf(m.fingerprint)}
                        initials={initials(m.username)}
                        className="shrink-0"
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="flex min-w-0 items-center gap-1">
                          <span
                            className="truncate text-[12px] font-medium"
                            style={{ color: colorOf(m.fingerprint) }}
                          >
                            {m.username}
                          </span>
                          {!!creatorPubkey && m.pubkey === creatorPubkey && (
                            <Crown className="size-3 shrink-0 text-[#f5c542]" />
                          )}
                        </span>
                        <span className="truncate text-[10px] tabular-nums text-white/45">
                          {m.fingerprint}
                        </span>
                        {m.spoof && <span className="text-[10px] text-[#ff8a8a]">! name reused</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {me.fingerprint && (
                <p className="mt-3 border-t border-[#a5b2ff1a] pt-2 text-[12px] text-white/70">
                  you · {me.fingerprint}
                </p>
              )}
            </div>
          </div>
        )}

        {undecryptable > 0 && (
          <div className="mx-auto w-full max-w-3xl px-3 pb-2 sm:px-4">
            <div className="rounded border border-[#ffb02e40] bg-[#ffb02e14] px-3 py-2 text-[12px] text-[#ffcf7a]">
              ! {undecryptable} message{undecryptable === 1 ? '' : 's'} could not be decrypted — likely
              a different room password.
            </div>
          </div>
        )}

        {/* ── messages ── */}
        <div className="min-h-0 flex-1">
          <ChatMessageList
            count={feed.length}
            lastIsMine={
              feed[feed.length - 1]?.kind === 'msg' &&
              (feed[feed.length - 1] as { m: ChatMessage }).m.mine
            }
            className="py-2"
          >
            {feed.length === 0 && (
              <p className="py-12 text-center text-[13px] text-white/45">no messages yet.</p>
            )}
            {feed.map((it, i) => {
              if (it.kind === 'system') {
                return (
                  <React.Fragment key={it.key}>
                    {it.showDate && <DateDivider ts={it.ts} />}
                    <div className="flex items-center gap-3 pt-2 pl-[13px] text-[12px] text-white/70">
                      <span
                        className={cn(
                          'flex w-8 shrink-0 justify-center text-base leading-none',
                          it.type === 'join' ? 'text-[#a5b2ff]' : 'text-white/50',
                        )}
                      >
                        {it.type === 'join' ? '→' : '←'}
                      </span>
                      <span>
                        <span style={{ color: colorOf(it.fingerprint) }}>{it.username}</span>{' '}
                        {it.type === 'join' ? 'joined' : 'left'}{' '}
                        <span className="text-white/80">· {formatTime(it.ts)}</span>
                      </span>
                    </div>
                  </React.Fragment>
                )
              }

              const m = it.m
              const prev = feed[i - 1]
              const grouped =
                !m.replyTo &&
                prev &&
                prev.kind === 'msg' &&
                prev.m.pubkey === m.pubkey &&
                m.ts - prev.m.ts < GROUP_WINDOW_MS &&
                !it.showDate
              const spoof = members.find((mem) => mem.pubkey === m.pubkey)?.spoof

              return (
                <React.Fragment key={m.key}>
                  {it.showDate && <DateDivider ts={it.ts} />}
                  <div
                    id={`msg-${m.key}`}
                    className={cn(
                      'group relative rounded pl-[13px] pr-2 hover:bg-[#a5b2ff0a]',
                      grouped ? 'py-0.5' : 'py-2',
                      m.replyTo?.p === me.pubkey &&
                        !m.mine &&
                        'my-1.5 pl-[11px] border-l-2 border-[#a5b2ff] bg-[#a5b2ff14] hover:bg-[#a5b2ff1f]',
                    )}
                  >
                    {!m.deleted && (
                      <MessageActions
                        mine={m.mine}
                        onReply={() => startReply(m)}
                        onEdit={() => startEdit(m)}
                        onDelete={() => onDelete(msgRef(m))}
                      />
                    )}
                    {grouped ? (
                      <div className="flex gap-3">
                        <span className="w-8 shrink-0" />
                        <div className="min-w-0 flex-1 whitespace-pre-wrap break-words pb-0.5 text-[13px] text-white">
                          <MessageBody
                            m={m}
                            editing={editing}
                            setEditing={setEditing}
                            onSave={saveEdit}
                            onCancel={() => setEditing(null)}
                            myName={me.username}
                            renderBody={renderBody}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <ChatAvatar
                          seed={m.fingerprint}
                          color={colorOf(m.fingerprint)}
                          initials={initials(m.username)}
                        />
                        <div className="min-w-0 flex-1">
                          <ReplyQuote m={m} byKey={byKey} colorOf={colorOf} />
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span
                              className="text-[13px] font-semibold"
                              style={{ color: colorOf(m.fingerprint) }}
                            >
                              {m.username}
                            </span>
                            {!!creatorPubkey && m.pubkey === creatorPubkey && (
                              <Crown className="size-3.5 shrink-0 self-center text-[#f5c542]" />
                            )}
                            {spoof && <span className="text-[11px] text-[#ff8a8a]">! name reused</span>}
                            <span className="text-[11px] text-white/80">{formatTime(m.ts)}</span>
                          </div>
                          <div className="whitespace-pre-wrap break-words text-[13px] text-white">
                            <MessageBody
                              m={m}
                              editing={editing}
                              setEditing={setEditing}
                              onSave={saveEdit}
                              onCancel={() => setEditing(null)}
                              myName={me.username}
                              renderBody={renderBody}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )
            })}
          </ChatMessageList>
        </div>
      </div>

      {/* ── composer ── */}
      <div
        className="mx-auto w-full max-w-3xl px-3 pb-3 pt-1 sm:px-4"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* reply context bar */}
        {replyingTo && (
          <div className="flex items-center gap-2 rounded-t border border-b-0 border-[#a5b2ff40] bg-[#0a0c14]/85 px-3 py-1.5 text-[12px] backdrop-blur-sm">
            <Reply className="size-3.5 shrink-0 text-[#a5b2ff]" />
            <span className="text-white/60">replying to</span>
            <span className="font-medium" style={{ color: colorOf(replyingTo.fingerprint) }}>
              {replyingTo.username}
            </span>
            <span className="min-w-0 flex-1 truncate text-white/50">
              {replyingTo.deleted ? 'message deleted' : replyingTo.text}
            </span>
            <button
              onClick={() => setReplyingTo(null)}
              title="Cancel reply"
              className="shrink-0 rounded p-0.5 text-white/60 transition-colors hover:bg-[#a5b2ff1a] hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* mention autocomplete */}
        {mentionOpen && (
          <div className="mb-1 overflow-hidden rounded border border-[#a5b2ff40] bg-[#0c0e16] shadow-lg">
            <p className="border-b border-[#a5b2ff1a] px-3 py-1 text-[10px] uppercase tracking-wide text-white/45">
              members matching @{mention?.query}
            </p>
            {mentionItems.map((name, i) => (
              <button
                key={name}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pickMention(name)
                }}
                onMouseEnter={() => setMIdx(i)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors',
                  i === activeIdx ? 'bg-[#a5b2ff1a]' : 'hover:bg-[#a5b2ff14]',
                )}
              >
                <span
                  className="flex size-5 items-center justify-center rounded-full text-[10px] text-black/80"
                  style={{ background: seedColor(name) }}
                >
                  {initials(name)}
                </span>
                <span className="text-white/90">{name}</span>
              </button>
            ))}
          </div>
        )}

        {/* typing indicator */}
        <TypingIndicator typing={typingOthers} colorOf={colorOf} />

        <div
          className={cn(
            'flex items-center gap-2 border border-[#a5b2ff40] bg-[#0a0c14]/85 py-1 pl-5 pr-2 backdrop-blur-sm transition-colors focus-within:border-[#a5b2ff99]',
            replyingTo ? 'rounded-b' : 'rounded',
          )}
        >
          <span className="flex w-4 shrink-0 select-none justify-center self-center text-[15px] leading-none text-[#a5b2ff99]">
            {'>'}
          </span>
          <ChatInput
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              const ta = e.target
              const grew = ta.value.length > prevLen.current
              prevLen.current = ta.value.length
              setDraft(ta.value)
              updateMention(ta)
              if (grew) caretSpark(ta)
              onTypingChange?.(ta.value.trim().length > 0)
            }}
            onKeyUp={(e) => {
              if (!['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
                updateMention(e.currentTarget)
              }
            }}
            onClick={(e) => updateMention(e.currentTarget)}
            onKeyDown={onKeyDown}
            placeholder={`Message #${slug}`}
            aria-label="Message"
            className="text-[13px] text-foreground placeholder:text-white/40"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || status === 'error'}
            aria-label="Send"
            className="flex size-9 shrink-0 items-center justify-center self-center text-[20px] leading-none text-[#a5b2ff] transition-colors hover:text-[#cdd6ff] disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
