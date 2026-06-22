'use client'

import * as React from 'react'
import { Avatar, AvatarFallback, cn } from '@alternatefutures/ui'
import { seedColor } from '@alternatefutures/tokens'

/**
 * Identity avatar — deterministic color from the fingerprint (or an explicit
 * roster-unique override) + initials. Used in message rows and the member list.
 */
export function ChatAvatar({
  seed,
  initials,
  className,
  color,
}: {
  seed: string
  initials: string
  className?: string
  /** Explicit color (e.g. a roster-unique assignment); falls back to seedColor(seed). */
  color?: string
}) {
  return (
    <Avatar className={cn('size-8', className)}>
      <AvatarFallback className="text-black/80" style={{ background: color ?? seedColor(seed) }}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
