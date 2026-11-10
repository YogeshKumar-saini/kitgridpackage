"use client"

import { type RefObject, useEffect, useRef } from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { type CanvasRgb, observeTheme, resolveCanvasColor } from "../particles/canvas.js"

export type StageRgb = CanvasRgb

export interface StagePointer {
  /** Pixels from the canvas's top-left corner. */
  x: number
  y: number
  inside: boolean
}

export interface StageFrame {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  /** Backing-store size, for effects that write pixels directly. */
  pixelWidth: number
  pixelHeight: number
  /** Milliseconds of animated time; frozen while paused. */
  time: number
  /** Frame delta in 60 fps frames, capped so a stalled tab never jumps. */
  dt: number
  pointer: StagePointer
  /** True when this is a single still frame (reduced motion, paused or resized while idle). */
  still: boolean
  /** Resolves any CSS color against the canvas, cached until the theme changes. */
  color: (value: string) => StageRgb
}

export interface StageOptions {
  /** Called every animated frame, and once for each still frame. */
  draw: (frame: StageFrame) => void
  /** Called after every resize, before the next draw. */
  resize?: (width: number, height: number) => void
  /** Highest device pixel ratio the canvas renders at. */
  dprCap?: number
  /** Scales the backing store, for effects that read better (and run cheaper) at low resolution. */
  scale?: number
  /** Disables pointer tracking. */
  pointer?: boolean
  /** Changing any of these rebuilds the stage. */
  deps?: readonly unknown[]
}

const FALLBACK: StageRgb = { r: 128, g: 128, b: 128, a: 1 }

export const rgba = (c: StageRgb, alpha = 1): string =>
  `rgb(${c.r} ${c.g} ${c.b} / ${Math.max(0, Math.min(1, c.a * alpha))})`

/**
 * The shared engine behind every canvas background: DPR-capped sizing through ResizeObserver,
 * a rAF loop that only runs while the element is on screen and the tab is visible, live reduced
 * motion (one still frame instead of a loop), theme-aware color resolution and pointer tracking
 * on the section the background fills.
 */
export const useCanvasStage = (
  root: RefObject<HTMLElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  { draw, resize, dprCap = 2, scale = 1, pointer: track = true, deps = [] }: StageOptions,
): void => {
  const reduced = useReducedMotion()
  const inView = useInView(root, { once: false, amount: 0 })
  const active = inView && !reduced
  const latest = useRef({ draw, resize })
  latest.current = { draw, resize }
  const activeRef = useRef(active)
  activeRef.current = active
  const sync = useRef<(() => void) | null>(null)
  const repaint = useRef<(() => void) | null>(null)

  useEffect(() => {
    const node = root.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!node || !canvas || !ctx) return

    let width = 0
    let height = 0
    let frame = 0
    let last = 0
    let time = 0
    let running = false
    const cache = new Map<string, StageRgb>()
    const pointer: StagePointer = { x: 0, y: 0, inside: false }
    let clientX = 0
    let clientY = 0

    const color = (value: string): StageRgb => {
      const hit = cache.get(value)
      if (hit) return hit
      const resolved = resolveCanvasColor(canvas, value) ?? FALLBACK
      cache.set(value, resolved)
      return resolved
    }

    const paint = (dt: number, still: boolean) => {
      if (!width || !height) return
      if (pointer.inside) {
        const rect = canvas.getBoundingClientRect()
        pointer.x = clientX - rect.left
        pointer.y = clientY - rect.top
      }
      latest.current.draw({
        ctx,
        width,
        height,
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
        time,
        dt,
        pointer,
        still,
        color,
      })
    }

    const tick = (now: number) => {
      frame = 0
      const dt = last ? Math.min(now - last, 64) / (1000 / 60) : 1
      if (last) time += now - last
      last = now
      paint(dt, false)
      if (running) frame = requestAnimationFrame(tick)
    }

    const update = () => {
      const next = activeRef.current && !document.hidden
      if (next === running) return
      running = next
      if (running) {
        last = 0
        frame = requestAnimationFrame(tick)
      } else {
        cancelAnimationFrame(frame)
        frame = 0
        paint(0, true)
      }
    }

    const measure = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap) * scale
      width = w
      height = h
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      latest.current.resize?.(w, h)
      if (!running) paint(0, true)
    }

    let themeFrame = 0
    const retheme = () => {
      cancelAnimationFrame(themeFrame)
      themeFrame = requestAnimationFrame(() => {
        cache.clear()
        if (!running) paint(0, true)
      })
    }

    const target = node.hasAttribute("data-wrapper") ? node : (node.parentElement ?? node)
    const handleMove = (event: PointerEvent) => {
      pointer.inside = true
      clientX = event.clientX
      clientY = event.clientY
      if (!running) paint(0, true)
    }
    const handleLeave = () => {
      pointer.inside = false
      if (!running) paint(0, true)
    }

    measure()
    if (track) {
      target.addEventListener("pointermove", handleMove, { passive: true })
      target.addEventListener("pointerleave", handleLeave)
    }
    document.addEventListener("visibilitychange", update)
    const resizer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    resizer?.observe(canvas)
    const unobserve = observeTheme(node, retheme)
    sync.current = update
    repaint.current = () => {
      if (!running) paint(0, true)
    }
    update()
    if (!running) paint(0, true)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      cancelAnimationFrame(themeFrame)
      if (track) {
        target.removeEventListener("pointermove", handleMove)
        target.removeEventListener("pointerleave", handleLeave)
      }
      document.removeEventListener("visibilitychange", update)
      resizer?.disconnect()
      unobserve()
      sync.current = null
      repaint.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dprCap, scale, track, ...deps])

  useEffect(() => {
    sync.current?.()
  }, [active])

  // Props read inside `draw` (colors, density) change without rebuilding: refresh a still frame.
  useEffect(() => {
    repaint.current?.()
  })
}
