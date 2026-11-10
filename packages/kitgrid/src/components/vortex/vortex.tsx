"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom } from "../aurora/internal/random.js"
import { rgba, useCanvasStage } from "../backdrop-kit/stage.js"

export interface VortexProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of particles, capped at 1500. */
  count?: number
  /** Any CSS color. Defaults to ink. */
  color?: string
  /** Any CSS color for a share of slower outer particles. Defaults to a faint foreground. */
  secondaryColor?: string
  /** Spin speed multiplier; 0 holds the vortex still. */
  speed?: number
  /** Trail persistence, 0–1: higher leaves longer light trails. */
  trail?: number
  /** Same seed, same vortex. */
  seed?: number
  children?: ReactNode
}

interface Mote {
  angle: number
  radius: number
  rate: number
  size: number
  secondary: boolean
}

/**
 * A slow whirlpool of light: particles spiral inward, faster near the eye, leaving fading trails,
 * and are reborn at the rim. Canvas, DPR-capped, paused offscreen, a still spiral under reduced
 * motion.
 */
export const Vortex = forwardRef<HTMLDivElement, VortexProps>(
  (
    {
      count = 700,
      color = "var(--kg-ink)",
      secondaryColor = "color-mix(in oklab, var(--kg-fg) 40%, transparent)",
      speed = 1,
      trail = 0.85,
      seed = 8,
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
    const motes = useRef<Mote[]>([])
    const built = useRef("")
    const total = Math.min(Math.max(Math.round(count), 0), 1500)

    if (built.current !== `${total}:${seed}`) {
      built.current = `${total}:${seed}`
      const random = createRandom(seed)
      motes.current = Array.from({ length: total }, () => ({
        angle: random() * Math.PI * 2,
        radius: 0.06 + random() ** 0.7 * 0.94,
        rate: 0.6 + random() * 0.8,
        size: 0.5 + random() * 1.3,
        secondary: random() < 0.35,
      }))
    }

    useCanvasStage(root, canvasRef, {
      pointer: false,
      deps: [total, seed],
      draw: ({ ctx, width, height, dt, still, color: resolve }) => {
        const cx = width / 2
        const cy = height / 2
        const reach = Math.hypot(width, height) * 0.55
        const fade = 1 - Math.min(Math.max(trail, 0), 0.97)
        if (still) {
          ctx.clearRect(0, 0, width, height)
        } else {
          ctx.globalCompositeOperation = "destination-out"
          ctx.fillStyle = `rgb(0 0 0 / ${fade * dt})`
          ctx.fillRect(0, 0, width, height)
          ctx.globalCompositeOperation = "source-over"
        }
        const primary = resolve(color)
        const secondary = resolve(secondaryColor)
        ctx.lineCap = "round"
        for (const mote of motes.current) {
          const spin = (0.0045 * mote.rate * speed * dt) / Math.max(mote.radius, 0.05) ** 0.8
          const r0 = mote.radius * reach
          const x0 = cx + Math.cos(mote.angle) * r0
          const y0 = cy + Math.sin(mote.angle) * r0 * 0.62
          let x1 = x0
          let y1 = y0
          if (still) {
            const back = mote.angle - 0.08 / Math.max(mote.radius, 0.05) ** 0.6
            x1 = cx + Math.cos(back) * r0
            y1 = cy + Math.sin(back) * r0 * 0.62
          } else {
            mote.angle += spin
            mote.radius -= 0.0007 * mote.rate * speed * dt
            if (mote.radius < 0.04) mote.radius = 1
            const r1 = mote.radius * reach
            x1 = cx + Math.cos(mote.angle) * r1
            y1 = cy + Math.sin(mote.angle) * r1 * 0.62
          }
          const glow = 1 - mote.radius
          ctx.strokeStyle = rgba(mote.secondary ? secondary : primary, 0.25 + glow * 0.75)
          ctx.lineWidth = mote.size
          ctx.beginPath()
          ctx.moveTo(x0, y0)
          ctx.lineTo(x1, y1)
          ctx.stroke()
        }
      },
    })

    return (
      <div ref={ref} {...backdropRoot("kg-vortex absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto", className, wrapper)} {...props}>
        <div className="kg-vortex__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-vortex__canvas block size-full" />
        </div>
        {wrapper && <div className="kg-vortex__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Vortex.displayName = "Vortex"
