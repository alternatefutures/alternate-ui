'use client'

import * as React from 'react'
import { cn } from './lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-11 w-full min-w-0 rounded-md border border-input bg-input/30 px-3 py-2 text-base shadow-sm transition-colors outline-none',
          'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40',
          'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
