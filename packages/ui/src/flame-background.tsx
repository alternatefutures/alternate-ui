'use client'

import * as React from 'react'
import { drainSparks } from './flame-spark'

/**
 * Ambient "Doom flame" background — ported from ertdfgcvb's oldschool fire effect
 * and adapted to a single <canvas> rendered as a fixed, bottom-anchored backdrop
 * behind the UI. Rises from the floor and fades to transparent at the top, so
 * content stays readable. Honors prefers-reduced-motion. The brand's signature
 * animated background, shared across AlternateFutures apps.
 *
 * Keystroke embers: a composer can call `requestSpark(x, y)` (from this package)
 * to ignite a hot red ember at the caret; FlameBackground drains them each frame.
 */

// Cool "brand blue" palette built around the accent #A5B2FF.
const PALETTE = [
  '#000000', // 0  (top / empty — never drawn)
  '#20264d', // 1  deep indigo (faint)
  '#343c7a', // 2  indigo
  '#4f5bc4', // 3  indigo-blue
  '#6f7fe6', // 4  blue
  '#a5b2ff', // 5  brand accent
  '#cdd6ff', // 6  light periwinkle
  '#ffffff', // 7  white (hottest)
]
// top → bottom intensity mapping
const FLAME = '011222233334444444455566667'.split('').map(Number)

// Original doom-fire ramp (red → orange → gold → white) for the typed sparks, so
// keystrokes ignite RED fire against the cool blue ambient flame.
const SPARK_FIRE = ['#8b0000', '#cc0000', '#ff0000', '#ff3a00', '#ff7a00', '#ffc24a']

const clamp = (x: number, a: number, b: number) => Math.min(Math.max(x, a), b)
const map = (v: number, a: number, b: number, c: number, d: number) =>
  c + ((d - c) * (v - a)) / (b - a)
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
const rndi = (a: number, b = 0) => {
  if (a > b) [a, b] = [b, a]
  return Math.floor(a + Math.random() * (b - a + 1))
}

function valueNoise() {
  const size = 256
  const r = new Array<number>(size)
  const perm = new Array<number>(size * 2)
  for (let k = 0; k < size; k++) {
    r[k] = Math.random()
    perm[k] = k
  }
  for (let k = 0; k < size; k++) {
    const i = Math.floor(Math.random() * size)
    ;[perm[k], perm[i]] = [perm[i], perm[k]]
    perm[k + size] = perm[k]
  }
  return (px: number, py: number) => {
    const xi = Math.floor(px)
    const yi = Math.floor(py)
    const tx = px - xi
    const ty = py - yi
    const rx0 = xi % size
    const rx1 = (rx0 + 1) % size
    const ry0 = yi % size
    const ry1 = (ry0 + 1) % size
    const c00 = r[perm[perm[rx0] + ry0]]
    const c10 = r[perm[perm[rx1] + ry0]]
    const c01 = r[perm[perm[rx0] + ry1]]
    const c11 = r[perm[perm[rx1] + ry1]]
    const sx = smoothstep(0, 1, tx)
    const sy = smoothstep(0, 1, ty)
    return mix(mix(c00, c10, sx), mix(c01, c11, sx), sy)
  }
}

export function FlameBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const noise = valueNoise()

    // Coarse character grid — bigger cells on small screens for performance.
    let fontSize = window.innerWidth < 640 ? 12 : 14
    let cellW = fontSize * 0.6
    let cellH = fontSize
    let cols = 0
    let rows = 0
    let data: number[] = []
    let spark = new Float32Array(0) // per-cell ember intensity from keystrokes
    let start = 0
    let bandStart = 0 // first cell index of the visible band (rest is masked out)
    let sparkFrames = 0 // frames of spark work left; 0 = skip the spark passes
    let running = true // paused while the tab is hidden

    function resize() {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas!.width = w
      canvas!.height = h
      canvas!.style.width = `${w}px`
      canvas!.style.height = `${h}px`
      fontSize = w < 640 ? 12 : 14
      cellW = fontSize * 0.6
      cellH = fontSize
      cols = Math.ceil(w / cellW)
      rows = Math.ceil(h / cellH)
      // The mask hides everything above ~45% from the bottom, so only compute +
      // draw the bottom half of the grid — the rest is invisible.
      bandStart = Math.floor(rows * 0.5) * cols
      data = new Array(cols * rows).fill(0)
      spark = new Float32Array(cols * rows)
      ctx!.font = `${fontSize}px ui-monospace, "SF Mono", Menlo, monospace`
      ctx!.textBaseline = 'top'
    }
    resize()

    let raf = 0
    let lastDraw = 0
    const FRAME_MS = 1000 / 30 // ~30fps is plenty for a backdrop

    function step(now: number) {
      if (!running) return // paused (tab hidden) — no work at all
      raf = requestAnimationFrame(step)
      if (now - lastDraw < FRAME_MS) return
      lastDraw = now
      if (!start) start = now

      // Fill the floor row with animated noise.
      const t = (now - start) * 0.0012
      const last = cols * (rows - 1)
      for (let i = 0; i < cols; i++) {
        // Calmer floor: lower ceiling → shorter, gentler flames.
        const val = Math.floor(map(noise(i * 0.05, t), 0, 1, 4, 34))
        data[last + i] = Math.min(val, data[last + i] + 2)
      }

      // Propagate upward with horizontal jitter and decay — only the visible band.
      for (let i = bandStart; i < data.length; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        const dest = row * cols + clamp(col + rndi(-1, 1), 0, cols - 1)
        const src = Math.min(rows - 1, row + 1) * cols + col
        data[dest] = Math.max(0, data[src] - rndi(0, 2))
      }

      // Sparks: only run the (full-grid) spark passes while embers are alive.
      const newSparks = drainSparks()
      if (newSparks.length) sparkFrames = 20
      if (sparkFrames > 0) {
        for (let i = bandStart; i < spark.length; i++) {
          const row = (i / cols) | 0
          const col = i % cols
          const dest = row * cols + clamp(col + rndi(-1, 1), 0, cols - 1)
          const src = Math.min(rows - 1, row + 1) * cols + col
          spark[dest] = spark[src] * 0.85
        }
        for (const s of newSparks) {
          const sc = clamp((s.x / cellW) | 0, 0, cols - 1)
          const sr = clamp((s.y / cellH) | 0, 0, rows - 1)
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const idx = clamp(sr + dy, 0, rows - 1) * cols + clamp(sc + dx, 0, cols - 1)
              spark[idx] = Math.max(spark[idx], dx === 0 && dy === 0 ? 1 : 0.5)
            }
          }
        }
        if (--sparkFrames === 0) spark.fill(0) // clear residue so we can skip again
      }

      // Render — transparent base so the page gradient shows through empty cells.
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      ctx!.globalCompositeOperation = 'source-over'
      ctx!.globalAlpha = 1
      for (let i = bandStart; i < data.length; i++) {
        const u = data[i]
        const v = FLAME[clamp(u, 0, FLAME.length - 1)]
        if (v === 0) continue
        const col = i % cols
        const row = (i / cols) | 0
        const x = col * cellW
        const y = row * cellH
        ctx!.fillStyle = PALETTE[v]
        ctx!.fillRect(x, y, cellW + 1, cellH + 1)
        ctx!.fillStyle = PALETTE[Math.min(PALETTE.length - 1, v + 1)]
        ctx!.fillText(String(u % 10), x, y)
      }
      // Spark embers — additive RED/orange fire over the cool blue flame.
      if (sparkFrames > 0) {
        ctx!.globalCompositeOperation = 'lighter'
        for (let i = bandStart; i < spark.length; i++) {
          const sp = spark[i]
          if (sp < 0.06) continue
          const col = i % cols
          const row = (i / cols) | 0
          const x = col * cellW
          const y = row * cellH
          ctx!.globalAlpha = Math.min(1, sp)
          ctx!.fillStyle = SPARK_FIRE[Math.min(SPARK_FIRE.length - 1, (sp * SPARK_FIRE.length) | 0)]
          ctx!.fillRect(x, y, cellW + 1, cellH + 1)
          if (sp > 0.5) {
            ctx!.fillStyle = '#fff3d0'
            ctx!.fillText(String((row * 7 + col) % 10), x, y)
          }
        }
        ctx!.globalAlpha = 1
        ctx!.globalCompositeOperation = 'source-over'
      }

      if (reduced) cancelAnimationFrame(raf) // one static frame, then stop
    }
    raf = requestAnimationFrame(step)

    // Pause the whole animation while the tab is hidden (no off-screen burn).
    function onVisibility() {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        lastDraw = 0
        start = 0
        raf = requestAnimationFrame(step)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', resize)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        opacity: 0.22,
        mixBlendMode: 'screen',
        // Strongest at the bottom, fully faded by ~45% up — subtle under the UI.
        WebkitMaskImage: 'linear-gradient(to top, black 0%, black 10%, transparent 45%)',
        maskImage: 'linear-gradient(to top, black 0%, black 10%, transparent 45%)',
      }}
    />
  )
}
