'use client'

import * as React from 'react'
import { ArrowDown } from 'lucide-react'
import { cn } from '@alternatefutures/ui'

// Textbook chat scroll behavior:
//  - stick to the bottom while the user is at (or near) the bottom
//  - if the user has scrolled up, DON'T yank them — show a "N new messages" pill
//  - sending your own message always scrolls back to the bottom
// Reacts to message COUNT (not children identity), so unrelated re-renders
// (e.g. typing in the composer) never trigger a scroll.
interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of messages — used to detect genuinely-new ones. */
  count: number
  /** Whether the most recent message was sent by me (always stick to bottom). */
  lastIsMine?: boolean
}

const NEAR_BOTTOM_PX = 80

export function ChatMessageList({
  className,
  children,
  count,
  lastIsMine,
  ...props
}: ChatMessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const atBottomRef = React.useRef(true)
  const prevCount = React.useRef(count)
  const rafId = React.useRef<number | null>(null)
  const [atBottom, setAtBottom] = React.useState(true)
  const [newCount, setNewCount] = React.useState(0)

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    atBottomRef.current = true
    setAtBottom(true)
    setNewCount(0)
  }, [])

  React.useLayoutEffect(() => {
    const added = count - prevCount.current
    prevCount.current = count
    if (added <= 0) return
    if (atBottomRef.current || lastIsMine) {
      scrollToBottom('auto')
    } else {
      setNewCount((n) => n + added)
    }
  }, [count, lastIsMine, scrollToBottom])

  const onScroll = React.useCallback(() => {
    if (rafId.current != null) return
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null
      const el = scrollRef.current
      if (!el) return
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
      if (near !== atBottomRef.current) {
        atBottomRef.current = near
        setAtBottom(near)
      }
      if (near) setNewCount(0)
    })
  }, [])

  React.useEffect(
    () => () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
    },
    [],
  )

  return (
    <div className="relative h-full w-full">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={cn(
          'af-scroll flex h-full w-full flex-col overflow-y-auto overscroll-contain px-3 py-4 sm:px-4',
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-auto flex w-full max-w-3xl flex-col">{children}</div>
      </div>
      {(!atBottom || newCount > 0) && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded border border-[#a5b2ff66] bg-[#0a0c14]/90 px-3 py-1.5 text-[12px] text-[#a5b2ff] shadow-lg backdrop-blur-sm transition-colors hover:bg-[#a5b2ff1a]"
          aria-label="Jump to latest"
        >
          <ArrowDown className="size-3.5" />
          {newCount > 0 ? `${newCount} new message${newCount === 1 ? '' : 's'}` : 'jump to latest'}
        </button>
      )}
    </div>
  )
}
