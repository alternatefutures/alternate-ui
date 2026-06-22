'use client'

import * as React from 'react'
import { seedColor } from '@alternatefutures/tokens'
import type { TypingUser } from './types'

/**
 * "X is typing…" indicator, rendered above the composer. Purely presentational —
 * it's driven by the `typing` prop; each app supplies/decays that list from its
 * own transport (relay frame for chat, data channel for connect).
 */
export function TypingIndicator({
  typing,
  colorOf,
}: {
  typing: TypingUser[]
  colorOf?: (fp: string) => string
}) {
  if (!typing.length) return null
  const color = (u: TypingUser) => colorOf?.(u.fingerprint) ?? seedColor(u.fingerprint)
  const name = (u: TypingUser) => (
    <span key={u.fingerprint} className="font-medium" style={{ color: color(u) }}>
      {u.username}
    </span>
  )

  let label: React.ReactNode
  if (typing.length === 1) label = <>{name(typing[0])} is typing</>
  else if (typing.length === 2)
    label = (
      <>
        {name(typing[0])} and {name(typing[1])} are typing
      </>
    )
  else {
    const extra = typing.length - 2
    label = (
      <>
        {name(typing[0])}, {name(typing[1])} and {extra} other{extra === 1 ? '' : 's'} are typing
      </>
    )
  }

  return (
    <div className="flex items-center gap-2 px-1 pb-1 text-[12px] text-white/60" aria-live="polite">
      <span className="flex items-end gap-0.5">
        <span className="size-1 animate-bounce rounded-full bg-[#a5b2ff] [animation-delay:-0.3s]" />
        <span className="size-1 animate-bounce rounded-full bg-[#a5b2ff] [animation-delay:-0.15s]" />
        <span className="size-1 animate-bounce rounded-full bg-[#a5b2ff]" />
      </span>
      <span className="truncate">{label}</span>
    </div>
  )
}
