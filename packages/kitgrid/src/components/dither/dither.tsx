"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { useCanvasStage } from "../backdrop-kit/stage.js"

export interface DitherProps extends HTMLAttributes<HTMLDivElement> {
  /** Any CSS color for lit pixels. Defaults to ink. */
  color?: string
  /** Size of one dither pixel, in CSS px (2–12). */
  pixelSize?: number
  /** Size of the flowing shapes; larger is broader. */
  scale?: number
  /** Flow speed multiplier; 0 holds the field still. */
  speed?: number
  /** Brighten the field around the pointer. */
  interactive?: boolean
  children?: ReactNode
}

/** 8×8 Bayer threshold matrix, normalised to 0–1. */
const BAYER = (() => {
  const m = [0, 2, 3, 1]
  let size = 2
  let matrix = m
  while (size < 8) {
    const next: number[] = new Array(size * size * 4)
    for (let y = 0; y < size * 2; y++) {
      for (let x = 0; x < size * 2; x++) {
        const base = (matrix[(y % size) * size + (x % size)] as number) * 4
        const quadrant = (m[(y >= size ? 2 : 0) + (x >= size ? 1 : 0)] as number)
        next[y * size * 2 + x] = base + quadrant
      }
    }
    matrix = next
    size *= 2
  }
  return matrix.map((v) => (v + 0.5) / 64)
})()

/**
 * A flowing gradient field rendered through an ordered (Bayer) dither at a coarse pixel size,
 * like a print or an early screen. Three tones, written straight into an ImageData buffer at
 * the dither resolution, so it costs a fraction of a full-resolution canvas.
 */
export const Dither = forwardRef<HTMLDivElement, DitherProps>(
  (
    {
      color = "var(--kg-ink)",
      pixelSize = 3,
      scale = 1,
      speed = 1,
      interactive = true,
      className,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const root = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(root, forwardedRef)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapper = hasChildren(children)
    const pixel = Math.min(Math.max(Math.round(pixelSize), 2), 12)
    const buffer = useRef<ImageData | null>(null)

    useCanvasStage(root, canvasRef, {
      dprCap: 1,
      scale: 1 / pixel,
      pointer: interactive,
      deps: [pixel],
      draw: ({ ctx, width, pixelWidth: w, pixelHeight: h, time, pointer, color: resolve }) => {
        if (!buffer.current || buffer.current.width !== w || buffer.current.height !== h) {
          buffer.current = ctx.createImageData(w, h)
        }
        const image = buffer.current
        const data = image.data
        const c = resolve(color)
        const full = Math.round(c.a * 255)
        const half = Math.round(c.a * 120)
        const t = (time / 1000) * speed
        const k = 1 / Math.max(scale, 0.1)
        const aspect = w / Math.max(h, 1)
        const ratio = w / Math.max(width, 1)
        const px = pointer.x * ratio
        const py = pointer.y * ratio
        const reach = (Math.min(w, h) * 0.35) ** 2
        const rowA = new Float32Array(h)
        const rowB = new Float32Array(h)
        for (let y = 0; y < h; y++) {
          const v = y / h
          rowA[y] = Math.cos(v * 2.6 * k - t * 0.4)
          rowB[y] = 1 - v
        }
        for (let x = 0; x < w; x++) {
          const u = (x / w) * aspect
          const colA = Math.sin(u * 2.2 * k + t * 0.55)
          const colB = Math.sin(u * 1.3 * k - t * 0.3)
          for (let y = 0; y < h; y++) {
            let value =
              0.5 +
              0.3 * colA * (rowA[y] as number) +
              0.2 * Math.sin(colB * 2 + (rowB[y] as number) * 3.2 * k + t * 0.7)
            value = value * 0.7 + (rowB[y] as number) * 0.25 - 0.28
            if (pointer.inside) {
              const dx = x - px
              const dy = y - py
              value += 0.5 * Math.exp(-(dx * dx + dy * dy) / reach)
            }
            const threshold = BAYER[(y & 7) * 8 + (x & 7)] as number
            const level = value * 2
            const index = (y * w + x) * 4
            const alpha =
              level - 1 > threshold ? full : level > threshold ? half : 0
            data[index] = c.r
            data[index + 1] = c.g
            data[index + 2] = c.b
            data[index + 3] = alpha
          }
        }
        ctx.putImageData(image, 0, 0)
      },
    })

    return (
      <div ref={ref} {...backdropRoot("kg-dither absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto", className, wrapper)} {...props}>
        <div className="kg-dither__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-dither__canvas block size-full [image-rendering:pixelated]" />
        </div>
        {wrapper && <div className="kg-dither__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Dither.displayName = "Dither"
