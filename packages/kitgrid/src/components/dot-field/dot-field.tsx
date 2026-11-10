"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { rgba, useCanvasStage } from "../backdrop-kit/stage.js"

export type DotFieldMask = BackdropMask

export interface DotFieldProps extends HTMLAttributes<HTMLDivElement> {
  /** Distance between dots, in px. */
  spacing?: number
  /** Resting dot radius, in px. */
  radius?: number
  /** Any CSS color for resting dots. Defaults to a faint foreground. */
  color?: string
  /** Any CSS color dots take on near the pointer. Defaults to ink. */
  activeColor?: string
  /** Radius of the pointer influence, in px. */
  reach?: number
  /** How far dots are pushed away from the pointer, in px. */
  push?: number
  /** A slow swell travelling across the field when idle. */
  wave?: boolean
  mask?: DotFieldMask
  children?: ReactNode
}

const TAU = Math.PI * 2
const LEVELS = 8

/**
 * A field of dots that swell, light up and part around the pointer, then spring back. Canvas,
 * DPR-capped, paused offscreen; under reduced motion the dots still respond, without easing.
 */
export const DotField = forwardRef<HTMLDivElement, DotFieldProps>(
  (
    {
      spacing = 22,
      radius = 1.3,
      color = "color-mix(in oklab, var(--kg-fg) 28%, transparent)",
      activeColor = "var(--kg-ink)",
      reach = 150,
      push = 14,
      wave = true,
      mask = "radial",
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
    const state = useRef({ cols: 0, rows: 0, gap: 0, ox: new Float32Array(0), oy: new Float32Array(0), heat: new Float32Array(0) })
    const buckets = useRef<number[][]>(Array.from({ length: LEVELS + 1 }, () => []))

    useCanvasStage(root, canvasRef, {
      draw: ({ ctx, width, height, time, dt, still, pointer, color: resolve }) => {
        const gap = Math.max(spacing, 6)
        const cols = Math.ceil(width / gap) + 1
        const rows = Math.ceil(height / gap) + 1
        const s = state.current
        if (s.cols !== cols || s.rows !== rows || s.gap !== gap) {
          s.cols = cols
          s.rows = rows
          s.gap = gap
          s.ox = new Float32Array(cols * rows)
          s.oy = new Float32Array(cols * rows)
          s.heat = new Float32Array(cols * rows)
        }
        const ease = still ? 1 : 1 - 0.86 ** dt
        const startX = (width - (cols - 1) * gap) / 2
        const startY = (height - (rows - 1) * gap) / 2
        const t = time / 1000
        const range = Math.max(reach, 10)
        for (const bucket of buckets.current) bucket.length = 0

        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const index = j * cols + i
            const x = startX + i * gap
            const y = startY + j * gap
            let tx = 0
            let ty = 0
            let target = 0
            if (pointer.inside) {
              const dx = x - pointer.x
              const dy = y - pointer.y
              const distance = Math.hypot(dx, dy)
              if (distance < range) {
                const f = 1 - distance / range
                const falloff = f * f * (3 - 2 * f)
                target = falloff
                if (distance > 0.01) {
                  tx = (dx / distance) * push * falloff
                  ty = (dy / distance) * push * falloff
                }
              }
            }
            s.ox[index] = (s.ox[index] as number) + (tx - (s.ox[index] as number)) * ease
            s.oy[index] = (s.oy[index] as number) + (ty - (s.oy[index] as number)) * ease
            s.heat[index] = (s.heat[index] as number) + (target - (s.heat[index] as number)) * ease
            const swell = wave && !still ? 0.5 + 0.5 * Math.sin(i * 0.35 + j * 0.25 - t * 1.4) : 0
            const level = Math.min(LEVELS, Math.round(Math.max(s.heat[index] as number, swell * 0.18) * LEVELS))
            buckets.current[level]?.push(index)
          }
        }

        ctx.clearRect(0, 0, width, height)
        const rest = resolve(color)
        const lit = resolve(activeColor)
        buckets.current.forEach((indices, level) => {
          if (!indices.length) return
          const k = level / LEVELS
          ctx.fillStyle = level > 1 ? rgba(lit, 0.25 + k * 0.75) : rgba(rest)
          const r = Math.max(radius, 0.4) * (1 + k * 1.6)
          ctx.beginPath()
          for (const index of indices) {
            const i = index % cols
            const j = Math.floor(index / cols)
            const x = startX + i * gap + (s.ox[index] as number)
            const y = startY + j * gap + (s.oy[index] as number)
            ctx.moveTo(x + r, y)
            ctx.arc(x, y, r, 0, TAU)
          }
          ctx.fill()
        })
      },
    })

    return (
      <div
        ref={ref}
        {...backdropRoot("kg-dot-field absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto", className, wrapper)}
        data-mask={mask}
        {...props}
      >
        <div className="kg-dot-field__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-dot-field__canvas block size-full" />
        </div>
        {wrapper && <div className="kg-dot-field__content relative z-1">{children}</div>}
      </div>
    )
  },
)

DotField.displayName = "DotField"
