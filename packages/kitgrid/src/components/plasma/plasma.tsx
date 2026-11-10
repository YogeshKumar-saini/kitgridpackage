"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useRef,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { type StageRgb, useCanvasStage } from "../backdrop-kit/stage.js"

export type PlasmaMask = BackdropMask

export interface PlasmaProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Up to three CSS colors from low to high energy. Defaults to faint ink, sage paper and a peach
   * highlight.
   */
  colors?: readonly string[]
  /** Size of the plasma cells; larger is broader. */
  scale?: number
  /** Flow speed multiplier; 0 holds it still. */
  speed?: number
  /** Overall opacity, 0–1. */
  intensity?: number
  mask?: PlasmaMask
  children?: ReactNode
}

const DEFAULT_COLORS = [
  "color-mix(in oklab, var(--kg-ink) 10%, transparent)",
  "color-mix(in oklab, var(--kg-paper-sage) 75%, transparent)",
  "color-mix(in oklab, var(--kg-paper-peach) 85%, transparent)",
] as const

/** Upscaling a tiny buffer is the blur: the browser interpolates it for free. */
const RESOLUTION = 1 / 8

const mix = (a: StageRgb, b: StageRgb, t: number, out: number[]) => {
  out[0] = a.r + (b.r - a.r) * t
  out[1] = a.g + (b.g - a.g) * t
  out[2] = a.b + (b.b - a.b) * t
  out[3] = (a.a + (b.a - a.a) * t) * 255
}

/**
 * Classic sum-of-sines plasma, computed into a buffer one eighth the size of the section and
 * smoothed by the browser on the way up, so it is soft, cheap and on-palette.
 */
export const Plasma = forwardRef<HTMLDivElement, PlasmaProps>(
  (
    {
      colors = DEFAULT_COLORS,
      scale = 1,
      speed = 1,
      intensity = 0.85,
      mask = "none",
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const root = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(root, forwardedRef)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapper = hasChildren(children)
    const buffer = useRef<ImageData | null>(null)
    const [low = DEFAULT_COLORS[0], mid = DEFAULT_COLORS[1], high = DEFAULT_COLORS[2]] = colors

    useCanvasStage(root, canvasRef, {
      dprCap: 1,
      scale: RESOLUTION,
      pointer: false,
      draw: ({ ctx, pixelWidth: w, pixelHeight: h, time, color: resolve }) => {
        if (!buffer.current || buffer.current.width !== w || buffer.current.height !== h) {
          buffer.current = ctx.createImageData(w, h)
        }
        const data = buffer.current.data
        const a = resolve(low)
        const b = resolve(mid)
        const c = resolve(high)
        const t = (time / 1000) * speed * 0.6
        const k = 0.09 / Math.max(scale, 0.1)
        const out = [0, 0, 0, 0]
        for (let y = 0; y < h; y++) {
          const sy = Math.sin(y * k * 1.3 + t * 0.7)
          for (let x = 0; x < w; x++) {
            const dx = x - w / 2 + Math.sin(t * 0.4) * w * 0.25
            const dy = y - h / 2 + Math.cos(t * 0.3) * h * 0.25
            const v =
              (Math.sin(x * k + t) +
                sy +
                Math.sin((x + y) * k * 0.7 - t * 0.8) +
                Math.sin(Math.sqrt(dx * dx + dy * dy) * k * 1.4 - t * 1.2)) /
              4
            const n = (v + 1) / 2
            if (n < 0.6) mix(a, b, Math.max(0, (n - 0.2) / 0.4), out)
            else mix(b, c, (n - 0.6) / 0.4, out)
            const i = (y * w + x) * 4
            data[i] = out[0] as number
            data[i + 1] = out[1] as number
            data[i + 2] = out[2] as number
            data[i + 3] = out[3] as number
          }
        }
        ctx.putImageData(buffer.current, 0, 0)
      },
    })

    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-plasma absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            "--kg-plasma-intensity": Math.min(Math.max(intensity, 0), 1),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-plasma__layer pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[var(--kg-plasma-intensity,0.85)]" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-plasma__canvas block size-full scale-[1.04] blur-[6px]" />
        </div>
        {wrapper && <div className="kg-plasma__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Plasma.displayName = "Plasma"
