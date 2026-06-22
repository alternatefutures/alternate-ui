/**
 * Decoupled spark channel. A composer calls `requestSpark(x, y)` with a
 * viewport-pixel position (the caret); FlameBackground drains the queue each
 * animation frame and ignites a hot ember at that grid cell, which rises with
 * the fire and fades. Keeps the two components independent (no prop drilling).
 */
export type SparkReq = { x: number; y: number }

const queue: SparkReq[] = []

export function requestSpark(x: number, y: number): void {
  queue.push({ x, y })
  // Guard against unbounded growth if no consumer is mounted.
  if (queue.length > 128) queue.splice(0, queue.length - 128)
}

export function drainSparks(): SparkReq[] {
  if (queue.length === 0) return EMPTY
  return queue.splice(0, queue.length)
}

const EMPTY: SparkReq[] = []
