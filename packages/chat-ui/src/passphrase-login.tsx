'use client'

import * as React from 'react'
import { Check, Copy, Dices, Eye, EyeOff, X } from 'lucide-react'

/**
 * Shared two-step login: enter the room passphrase FIRST (wallet-style word grid),
 * then choose a display name. Crypto-free — the app injects `deriveRoom` (with its
 * own salt) and the `wordlist`. Same behavior in every app; brand/intro are slots.
 */
export interface PassphraseLoginProps {
  /**
   * Optional: derive the room id from the passphrase (app supplies its own salt).
   * Provide it when the app needs the roomId up front (e.g. connect routes to
   * /rooms/[roomId]); omit it when the app derives later anyway (e.g. chat's
   * useChat re-derives on join), to avoid a redundant Argon2id pass. When omitted,
   * `onComplete`'s `roomId` is an empty string.
   */
  deriveRoom?: (passphrase: string) => Promise<{ roomId: string }>
  /** Called once both steps are done. */
  onComplete: (result: { passphrase: string; name: string; roomId: string }) => void
  /** EFF (or other) wordlist — enables spell-flagging + the generate button. */
  wordlist?: readonly string[]
  /** Words in the passphrase grid (default 6). */
  wordCount?: number
  /** Prefill the passphrase (e.g. a bounced name-taken retry preserves it). */
  initialPassphrase?: string
  /** Prefill the display name (e.g. the last-used name). */
  initialName?: string
  /** Which step to start on — use 'name' for the name-collision bounce. */
  startStep?: 'passphrase' | 'name'
  /** Show a "name taken" error on the name step. */
  nameTaken?: boolean
  /** External busy (app deriving/connecting after onComplete). */
  busy?: boolean
  /** Fatal error to surface. */
  error?: string | null
  /** Optional random display-name generator (shows a dice button when present). */
  generateName?: () => string
  /**
   * Collect a display name in a second step (default true). Set false when the app
   * collects the name elsewhere (e.g. connect's LiveKit PreJoin, which also picks
   * camera/mic) — then `onComplete` fires straight after the passphrase with name ''.
   */
  collectName?: boolean
  /** Per-app brand/title bar. */
  header?: React.ReactNode
  /** Per-app intro (explanation, badges). */
  intro?: React.ReactNode
  /** Per-app content rendered just above the Continue button (e.g. an encryption note). */
  notice?: React.ReactNode
}

export function PassphraseLogin({
  deriveRoom,
  onComplete,
  wordlist,
  wordCount = 6,
  initialPassphrase,
  initialName,
  startStep = 'passphrase',
  nameTaken,
  busy,
  error,
  generateName,
  collectName = true,
  header,
  intro,
  notice,
}: PassphraseLoginProps) {
  const [step, setStep] = React.useState<'passphrase' | 'name'>(startStep)
  const [words, setWordsState] = React.useState<string[]>(() => {
    const w = initialPassphrase ? initialPassphrase.split(' ') : []
    return Array.from({ length: wordCount }, (_, i) => w[i] ?? '')
  })
  const [name, setName] = React.useState(initialName ?? '')
  const [nameEdited, setNameEdited] = React.useState(false)
  const [reveal, setReveal] = React.useState(true)
  const [copied, setCopied] = React.useState(false)
  const [deriving, setDeriving] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(null)
  const slots = React.useRef<Array<HTMLInputElement | null>>([])
  const nameRef = React.useRef<HTMLInputElement>(null)
  // Cached derived room id; cleared whenever the passphrase changes.
  const roomIdRef = React.useRef('')

  const wordSet = React.useMemo(() => (wordlist ? new Set(wordlist) : null), [wordlist])
  const isWord = React.useCallback((w: string) => (wordSet ? wordSet.has(w) : true), [wordSet])

  const password = React.useMemo(() => words.filter(Boolean).join(' '), [words])
  const passphraseFilled = words.every((w) => w.trim())
  const badCount = React.useMemo(
    () => words.filter((w) => w.trim() !== '' && !isWord(w)).length,
    [words, isWord],
  )

  // Any passphrase mutation invalidates the cached room id + clears derive errors.
  const setWords = React.useCallback((next: string[]) => {
    roomIdRef.current = ''
    setLocalError(null)
    setWordsState(next)
  }, [])

  function setWordAt(i: number, raw: string) {
    const w = raw.replace(/\s+/g, '').toLowerCase()
    setWords(words.map((x, k) => (k === i ? w : x)))
  }

  function pasteWords(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const tokens = e.clipboardData.getData('text').trim().split(/[\s\-_,]+/).filter(Boolean)
    if (tokens.length <= 1) return
    e.preventDefault()
    const next = words.slice()
    tokens.forEach((t, k) => {
      if (i + k < next.length) next[i + k] = t.toLowerCase()
    })
    setWords(next)
    slots.current[Math.min(i + tokens.length, wordCount) - 1]?.focus()
  }

  function advanceOnSpace(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === ' ' || e.key === 'Enter') && i < wordCount - 1) {
      e.preventDefault()
      slots.current[i + 1]?.focus()
    }
  }

  function pickWords(n: number): string[] {
    if (!wordlist || wordlist.length === 0) return []
    const buf = new Uint32Array(n)
    crypto.getRandomValues(buf)
    return Array.from(buf, (r) => wordlist[r % wordlist.length])
  }

  function generatePassphrase() {
    const w = pickWords(wordCount)
    if (!w.length) return
    setWords(w)
    setReveal(true)
  }

  function copyPassphrase() {
    if (!password) return
    navigator.clipboard?.writeText(password).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => {},
    )
  }

  function clearPassphrase() {
    setWords(Array(wordCount).fill(''))
    setReveal(false)
    slots.current[0]?.focus()
  }

  // Derive (once, cached). Returns the room id, '' if no deriveRoom, or throws.
  const ensureRoom = React.useCallback(async () => {
    if (!deriveRoom) return ''
    if (roomIdRef.current) return roomIdRef.current
    const { roomId } = await deriveRoom(password)
    roomIdRef.current = roomId
    return roomId
  }, [deriveRoom, password])

  async function submitPassphrase(e: React.FormEvent) {
    e.preventDefault()
    if (!passphraseFilled || deriving || busy) return
    const advance = () => {
      setStep('name')
      requestAnimationFrame(() => nameRef.current?.focus())
    }
    // No derivation needed AND we still collect a name → just advance.
    if (!deriveRoom && collectName) {
      advance()
      return
    }
    setDeriving(true)
    setLocalError(null)
    try {
      const roomId = await ensureRoom()
      if (collectName) advance()
      else onComplete({ passphrase: password, name: '', roomId })
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'could not derive room')
    } finally {
      setDeriving(false)
    }
  }

  async function submitName(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || deriving || busy) return
    setDeriving(true)
    setLocalError(null)
    try {
      const roomId = await ensureRoom()
      onComplete({ passphrase: password, name: name.trim(), roomId })
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'could not derive room')
    } finally {
      setDeriving(false)
    }
  }

  const shownError = error ?? localError
  const disabled = !!busy || deriving

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {header}
        <div className="rounded-lg border border-[#a5b2ff26] bg-[#0c0e16]/70 p-5 backdrop-blur-sm sm:p-6">
          {intro}

          {step === 'passphrase' ? (
            <form onSubmit={submitPassphrase} className="flex flex-col gap-3.5">
              {/* room passphrase — wallet-style word grid */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] text-[#828dd6]">{'// room passphrase'}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={clearPassphrase}
                      disabled={disabled || !password}
                      title="Clear the passphrase and start over"
                      aria-label="Clear the passphrase and start over"
                      className="rounded p-1 text-[#828dd6] transition-colors hover:text-[#a5b2ff] disabled:opacity-40"
                    >
                      <X className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setReveal((v) => !v)}
                      title={reveal ? 'Hide passphrase' : 'Reveal passphrase'}
                      aria-label={reveal ? 'Hide passphrase' : 'Reveal passphrase'}
                      className="rounded p-1 text-[#828dd6] transition-colors hover:text-[#a5b2ff]"
                    >
                      {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={copyPassphrase}
                      disabled={disabled || !password}
                      title={copied ? 'Copied' : 'Copy passphrase'}
                      aria-label="Copy passphrase"
                      className="rounded p-1 text-[#828dd6] transition-colors hover:text-[#a5b2ff] disabled:opacity-40"
                    >
                      {copied ? (
                        <Check className="size-4 text-[#a5b2ff]" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                    {wordlist && (
                      <button
                        type="button"
                        onClick={generatePassphrase}
                        disabled={disabled}
                        title="Generate a strong passphrase"
                        aria-label="Generate a strong passphrase"
                        className="rounded p-1 text-[#828dd6] transition-colors hover:text-[#a5b2ff] disabled:opacity-50"
                      >
                        <Dices className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {words.map((w, i) => {
                    const bad = w.trim() !== '' && !isWord(w)
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-1.5 rounded border ${bad ? 'border-[#ff5a5a66]' : 'border-[#a5b2ff26]'} bg-[#a5b2ff0d] px-2 transition-colors focus-within:border-[#a5b2ff80]`}
                      >
                        <span className="w-3 shrink-0 select-none text-right text-[10px] tabular-nums text-[#5b639b]">
                          {i + 1}
                        </span>
                        <input
                          ref={(el) => {
                            slots.current[i] = el
                          }}
                          type={reveal ? 'text' : 'password'}
                          value={w}
                          onChange={(e) => setWordAt(i, e.target.value)}
                          onPaste={(e) => pasteWords(i, e)}
                          onKeyDown={(e) => advanceOnSpace(i, e)}
                          disabled={disabled}
                          autoComplete="off"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          aria-label={`word ${i + 1}`}
                          className={`h-9 w-full bg-transparent text-[13px] outline-none disabled:opacity-50 ${bad ? 'text-[#ff8a8a]' : 'text-foreground'}`}
                        />
                      </div>
                    )
                  })}
                </div>
                {badCount > 0 && (
                  <p className="mt-2 text-[11px] text-[#d9b88a]" aria-live="polite">
                    {`⚠ ${badCount} word${badCount > 1 ? 's' : ''} not in the standard list — double-check spelling. Everyone must type the passphrase identically.`}
                  </p>
                )}
              </div>

              {shownError && (
                <p className="rounded border border-[#ff5a5a40] bg-[#ff5a5a14] px-3 py-2 text-[12px] text-[#ff8a8a]">
                  ! {shownError}
                </p>
              )}

              <p className="rounded border border-[#ffb02e26] bg-[#ffb02e0d] px-3 py-2 text-[11px] leading-relaxed text-[#d9b88a]">
                Save this passphrase — it's the only key. Lose it and the conversation is gone forever.
              </p>

              {notice}

              <button
                type="submit"
                disabled={!passphraseFilled || disabled}
                className="mt-1 w-full rounded border border-[#a5b2ff66] bg-[#a5b2ff1a] px-4 py-2.5 text-[13px] text-[#a5b2ff] transition-colors hover:bg-[#a5b2ff2e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deriving ? '◍ deriving key…' : '[ ↵ continue ]'}
              </button>
            </form>
          ) : (
            <form onSubmit={submitName} className="flex flex-col gap-3.5">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="display-name" className="text-[12px] text-[#828dd6]">
                    {'// display name'}
                  </label>
                  {generateName && (
                    <button
                      type="button"
                      onClick={() => {
                        setName(generateName())
                        setNameEdited(true)
                      }}
                      disabled={disabled}
                      title="Generate a random name"
                      aria-label="Generate a random name"
                      className="rounded p-1 text-[#828dd6] transition-colors hover:text-[#a5b2ff] disabled:opacity-50"
                    >
                      <Dices className="size-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded border border-[#a5b2ff26] bg-[#a5b2ff0d] px-2.5 transition-colors focus-within:border-[#a5b2ff80]">
                  <span className="select-none text-[#a5b2ff99]">{'>'}</span>
                  <input
                    id="display-name"
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setNameEdited(true)
                    }}
                    disabled={disabled}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="how others see you"
                    className="h-10 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-[#5b639b] disabled:opacity-50"
                  />
                </div>
                {nameTaken && !nameEdited && (
                  <p className="mt-1 text-[11px] text-[#ff8a8a]">username taken</p>
                )}
              </div>

              {shownError && (
                <p className="rounded border border-[#ff5a5a40] bg-[#ff5a5a14] px-3 py-2 text-[12px] text-[#ff8a8a]">
                  ! {shownError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('passphrase')}
                  disabled={disabled}
                  className="rounded border border-[#a5b2ff26] px-3 py-2.5 text-[13px] text-[#828dd6] transition-colors hover:text-[#a5b2ff] disabled:opacity-40"
                >
                  ← back
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || disabled}
                  className="mt-0 w-full flex-1 rounded border border-[#a5b2ff66] bg-[#a5b2ff1a] px-4 py-2.5 text-[13px] text-[#a5b2ff] transition-colors hover:bg-[#a5b2ff2e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deriving ? '◍ deriving key…' : '[ ↵ enter encrypted room ]'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
