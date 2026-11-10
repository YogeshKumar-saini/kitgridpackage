"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { rgba, useCanvasStage } from "../backdrop-kit/stage.js"

export type HalftoneMask = BackdropMask

export interface HalftoneProps extends HTMLAttributes<HTMLDivElement> {
  /** Any CSS color for the dots. Defaults to ink. */
  color?: string
  /** Distance between dot centres, in px. */
  spacing?: number
  /** Screen angle, in degrees. */
  angle?: number
  /** Drift speed multiplier; 0 holds the light still. */
  speed?: number
  /** Add a pool of light under the pointer. */
  interactive?: boolean
  mask?: HalftoneMask
  children?: ReactNode
}

const TAU = Math.PI * 2

/**
 * A print halftone screen: a rotated grid of dots whose size follows soft pools of light drifting
 * underneath, plus one under the pointer. Canvas, DPR-capped, paused offscreen.
 */
export const Halftone = forwardRef<HTMLDivElement, HalftoneProps>(
  (
    {
      color = "var(--kg-ink)",
      spacing = 14,
      angle = 18,
      speed = 1,
      interactive = true,
      mask = "none",
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

    useCanvasStage(root, canvasRef, {
      pointer: interactive,
      draw: ({ ctx, width, height, time, pointer, color: resolve }) => {
        const gap = Math.max(spacing, 5)
        const t = (time / 1000) * speed * 0.25
        const theta = (angle * Math.PI) / 180
        const cos = Math.cos(theta)
        const sin = Math.sin(theta)
        const span = Math.hypot(width, height)
        const lights = [
          [0.3 + 0.18 * Math.sin(t * 1.1), 0.35 + 0.2 * Math.cos(t * 0.8), 0.42],
          [0.72 + 0.16 * Math.cos(t * 0.9), 0.6 + 0.18 * Math.sin(t * 1.3), 0.36],
          [0.5 + 0.3 * Math.sin(t * 0.5 + 2), 0.9 + 0.1 * Math.cos(t * 0.7), 0.3],
        ] as const
        const reach = (Math.min(width, height) * 0.3) ** 2
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = rgba(resolve(color), 0.72)
        ctx.beginPath()
        const cx = width / 2
        const cy = height / 2
        for (let gy = -span / 2; gy <= span / 2; gy += gap) {
          for (let gx = -span / 2; gx <= span / 2; gx += gap) {
            const x = cx + gx * cos - gy * sin
            const y = cy + gx * sin + gy * cos
            if (x < -gap || x > width + gap || y < -gap || y > height + gap) continue
            let value = 0
            for (const [lx, ly, size] of lights) {
              const dx = x / width - lx
              const dy = (y / height - ly) * (height / width)
              value += Math.exp(-(dx * dx + dy * dy) / (size * size * 0.18))
            }
            if (pointer.inside) {
              const dx = x - pointer.x
              const dy = y - pointer.y
              value += 0.9 * Math.exp(-(dx * dx + dy * dy) / reach)
            }
            const radius = Math.min(value, 1) * gap * 0.42
            if (radius < 0.35) continue
            ctx.moveTo(x + radius, y)
            ctx.arc(x, y, radius, 0, TAU)
          }
        }
        ctx.fill()
      },
    })

    return (
      <div
        ref={ref}
        {...backdropRoot("kg-halftone absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto", className, wrapper)}
        data-mask={mask}
        {...props}
      >
        <div className="kg-halftone__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-halftone__canvas block size-full" />
        </div>
        {wrapper && <div className="kg-halftone__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Halftone.displayName = "Halftone"
