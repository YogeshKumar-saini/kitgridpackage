"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom } from "../aurora/internal/random.js"
import { rgba, useCanvasStage } from "../backdrop-kit/stage.js"

export interface StarfieldProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of stars, capped at 1200. */
  count?: number
  /** Any CSS color for the stars. Defaults to the foreground. */
  color?: string
  /** Any CSS color for a share of nearer stars. Defaults to ink. */
  accentColor?: string
  /** Travel speed multiplier; 0 holds the field still. */
  speed?: number
  /** Streak length, 0–1: 0 draws points, 1 draws long warp trails. */
  warp?: number
  /** Same seed, same sky. */
  seed?: number
  children?: ReactNode
}

interface Star {
  x: number
  y: number
  z: number
  accent: boolean
}

const DEPTH = 1000

/**
 * Flying through a field of stars: points stream outward from the centre and stretch into warp
 * streaks as they pass. Canvas, DPR-capped, paused offscreen, a still sky under reduced motion.
 */
export const Starfield = forwardRef<HTMLDivElement, StarfieldProps>(
  (
    {
      count = 420,
      color = "var(--kg-fg)",
      accentColor = "var(--kg-ink)",
      speed = 1,
      warp = 0.35,
      seed = 2,
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
    const stars = useRef<Star[]>([])
    const built = useRef("")
    const total = Math.min(Math.max(Math.round(count), 0), 1200)

    if (built.current !== `${total}:${seed}`) {
      built.current = `${total}:${seed}`
      const random = createRandom(seed)
      stars.current = Array.from({ length: total }, () => ({
        x: (random() - 0.5) * 2,
        y: (random() - 0.5) * 2,
        z: random() * DEPTH,
        accent: random() < 0.08,
      }))
    }

    useCanvasStage(root, canvasRef, {
      pointer: false,
      deps: [total, seed],
      draw: ({ ctx, width, height, dt, still, color: resolve }) => {
        const cx = width / 2
        const cy = height / 2
        const spread = Math.max(width, height) * 0.6
        const step = still ? 0 : 4 * speed * dt
        const trail = Math.min(Math.max(warp, 0), 1) * 22
        const base = resolve(color)
        const lit = resolve(accentColor)
        ctx.clearRect(0, 0, width, height)
        ctx.lineCap = "round"
        for (const star of stars.current) {
          const before = star.z
          star.z -= step
          if (star.z <= 1) {
            star.z += DEPTH
            continue
          }
          const k = DEPTH / star.z
          const x = cx + star.x * spread * k * 0.25
          const y = cy + star.y * spread * k * 0.25
          if (x < -20 || x > width + 20 || y < -20 || y > height + 20) {
            star.z = DEPTH
            continue
          }
          const near = 1 - star.z / DEPTH
          const alpha = near * near * 0.7 + 0.04
          const radius = 0.25 + near * 1.15
          ctx.strokeStyle = rgba(star.accent ? lit : base, alpha)
          ctx.lineWidth = radius * 2
          ctx.beginPath()
          if (!still && trail > 0) {
            const kb = DEPTH / Math.min(before + step * trail, DEPTH)
            ctx.moveTo(cx + star.x * spread * kb * 0.25, cy + star.y * spread * kb * 0.25)
          } else {
            ctx.moveTo(x - 0.01, y)
          }
          ctx.lineTo(x, y)
          ctx.stroke()
        }
      },
    })

    return (
      <div ref={ref} {...backdropRoot("kg-starfield absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto", className, wrapper)} {...props}>
        <div className="kg-starfield__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-starfield__canvas block size-full" />
        </div>
        {wrapper && <div className="kg-starfield__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Starfield.displayName = "Starfield"
