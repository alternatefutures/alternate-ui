'use client'

import * as React from 'react'
import { cn } from './lib/utils'

// The security layers explained in the popup — generic across chat + video,
// since both ride the same @alternatefutures/e2ee protocol.
const LAYERS: Array<{ title: string; body: string }> = [
  {
    title: 'End-to-end encrypted',
    body: 'Only people with the passphrase can read messages or join the call. The server and relay only ever see ciphertext — never your content.',
  },
  {
    title: 'Your passphrase is the key',
    body: 'The key is derived from your passphrase in your browser with Argon2id — a slow, memory-hard function — and never leaves your device.',
  },
  {
    title: 'AES-256-GCM',
    body: 'Every message and media stream is sealed with authenticated AES-256-GCM encryption: confidential and tamper-evident.',
  },
  {
    title: 'Ed25519 signatures',
    body: 'Each participant has an Ed25519 identity key and signs what they send, so messages can’t be forged or silently altered.',
  },
]

/**
 * A live "● ENCRYPTED · How?" indicator. The pulse dot signals an active secure
 * session; "How?" opens a popup explaining every layer of the protocol. Shared
 * across all screens of both apps (chat + connect).
 */
export function SecurityBadge({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <span className={cn('flex items-center gap-2 text-[12px]', className)}>
        <span className="inline-block size-2 shrink-0 animate-pulse rounded-full bg-[#a5b2ff]" />
        <span className="whitespace-nowrap text-[#828dd6]">
          ENCRYPTED <span className="text-[#5b639b]">·</span>{' '}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[#a5b2ff] underline decoration-[#a5b2ff]/30 underline-offset-2 transition-colors hover:decoration-[#a5b2ff]"
          >
            How?
          </button>
        </span>
      </span>
      {open ? <SecurityInfo onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function SecurityInfo({ onClose }: { onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How this is encrypted"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left text-[13px]"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-[#a5b2ff26] bg-[#0c0e16] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[#a5b2ff]">
            <span className="inline-block size-2 animate-pulse rounded-full bg-[#a5b2ff]" />
            <span className="font-medium">{'// how this is encrypted'}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="-mr-1 rounded px-1.5 py-0.5 text-[15px] leading-none text-white/60 transition-colors hover:bg-[#a5b2ff1a] hover:text-white"
          >
            ✕
          </button>
        </div>
        <ul className="flex flex-col gap-3.5">
          {LAYERS.map(({ title, body }) => (
            <li key={title} className="flex gap-2.5">
              <span aria-hidden className="mt-0.5 select-none text-[#a5b2ff]">
                ▸
              </span>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{title}</p>
                <p className="mt-0.5 leading-relaxed text-[#9aa2d4]">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-[#a5b2ff1a] pt-3 text-[11px] leading-relaxed text-[#5b639b]">
          The passphrase is the room. Lose it and the conversation is gone — no one, including us, can
          recover it.
        </p>
      </div>
    </div>
  )
}
