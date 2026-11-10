"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { rgba, useCanvasStage } from "../backdrop-kit/stage.js"

export type WavyLinesMask = BackdropMask

export interface WavyLinesProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of lines, 4–80. */
  lines?: number
  /** Any CSS color. Defaults to a faint foreground. */
  color?: string
  /** Any CSS color for lines bent by the pointer. Defaults to ink. */
  activeColor?: string
  /** Wave height, in px. */
  amplitude?: number
  /** Flow speed multiplier; 0 holds the lines still. */
  speed?: number
  /** Radius of the pointer bend, in px. */
  reach?: number
  mask?: WavyLinesMask
  children?: ReactNode
}

const STEP = 10

/**
 * Evenly spaced contour-like lines flowing on layered sine waves, bending apart around the
 * pointer like water around a finger. Canvas, DPR-capped, paused offscreen.
 */
export const WavyLines = forwardRef<HTMLDivElement, WavyLinesProps>(
  (
    {
      lines = 28,
      color = "color-mix(in oklab, var(--kg-fg) 20%, transparent)",
      activeColor = "var(--kg-ink)",
      amplitude = 14,
      speed = 1,
      reach = 160,
      mask = "edges",
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
    const bend = useRef({ x: 0, y: 0, strength: 0 })

    useCanvasStage(root, canvasRef, {
      draw: ({ ctx, width, height, time, dt, still, pointer, color: resolve }) => {
        const total = Math.round(Math.min(Math.max(lines, 4), 80))
        const gap = height / (total + 1)
        const t = (time / 1000) * speed
        const b = bend.current
        const ease = still ? 1 : 1 - 0.9 ** dt
        if (pointer.inside) {
          b.x += (pointer.x - b.x) * ease
          b.y += (pointer.y - b.y) * ease
        }
        b.strength += ((pointer.inside ? 1 : 0) - b.strength) * ease
        const range = Math.max(reach, 20)
        const base = resolve(color)
        const lit = resolve(activeColor)
        ctx.clearRect(0, 0, width, height)
        ctx.lineWidth = 1
        for (let n = 0; n < total; n++) {
          const y0 = gap * (n + 1)
          const rowDistance = Math.abs(y0 - b.y)
          const near = b.strength * Math.max(0, 1 - rowDistance / range)
          ctx.strokeStyle = near > 0.05 ? rgba(lit, 0.3 + near * 0.7) : rgba(base)
          ctx.beginPath()
          for (let x = -STEP; x <= width + STEP; x += STEP) {
            let y =
              y0 +
              Math.sin(x * 0.006 + t * 0.9 + n * 0.22) * amplitude +
              Math.sin(x * 0.013 - t * 0.6 + n * 0.11) * amplitude * 0.45
            if (b.strength > 0.001) {
              const dx = x - b.x
              const dy = y0 - b.y
              const d = Math.hypot(dx, dy)
              if (d < range) {
                const f = 1 - d / range
                y += Math.sign(dy || 1) * f * f * range * 0.32 * b.strength
              }
            }
            if (x === -STEP) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
      },
    })

    return (
      <div
        ref={ref}
        {...backdropRoot("kg-wavy-lines absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto", className, wrapper)}
        data-mask={mask}
        {...props}
      >
        <div className="kg-wavy-lines__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-wavy-lines__canvas block size-full" />
        </div>
        {wrapper && <div className="kg-wavy-lines__content relative z-1">{children}</div>}
      </div>
    )
  },
)

WavyLines.displayName = "WavyLines"
