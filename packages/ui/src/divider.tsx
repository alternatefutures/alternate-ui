'use client'

import * as React from 'react'
import { cn } from './lib/utils'

/**
 * Horizontal divider. With children, renders a centered label flanked by rules
 * (e.g. "or join with passphrase"); without children, a single hairline rule.
 */
function Divider({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center gap-3 text-sm text-muted-foreground', className)}
      {...props}
    >
      <span className="h-px flex-1 bg-border" />
      {children ? <span className="shrink-0">{children}</span> : null}
      {children ? <span className="h-px flex-1 bg-border" /> : null}
    </div>
  )
}

export { Divider }
