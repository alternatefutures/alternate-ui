'use client'

import * as React from 'react'
import { cn } from '@alternatefutures/ui'

// Auto-resizing textarea — modeled on jakobhoeg/shadcn-chat's ChatInput.
type ChatInputProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

    const resize = React.useCallback(() => {
      const el = innerRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }, [])

    React.useEffect(resize, [resize, props.value])

    return (
      <textarea
        ref={(node) => {
          innerRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
        }}
        rows={1}
        onChange={(e) => {
          resize()
          onChange?.(e)
        }}
        className={cn(
          'af-scroll max-h-40 w-full resize-none rounded-md bg-transparent px-3 py-3 text-base outline-none placeholder:text-muted-foreground md:text-sm',
          className,
        )}
        {...props}
      />
    )
  },
)
ChatInput.displayName = 'ChatInput'
