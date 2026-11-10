"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom } from "../aurora/internal/random.js"
import { rgba, useCanvasStage } from "../backdrop-kit/stage.js"

export type StarrySkyMask = BackdropMask

export interface StarrySkyProps extends HTMLAttributes<HTMLDivElement> {
  /** Stars per 10,000 px² of sky. */
  density?: number
  /** Any CSS color for the stars. Defaults to the foreground. */
  color?: string
  /** Any CSS color for shooting stars. Defaults to ink. */
  trailColor?: string
  /** Average seconds between shooting stars; 0 disables them. */
  interval?: number
  /** Same seed, same sky. */
  seed?: number
  mask?: StarrySkyMask
  children?: ReactNode
}

interface Star {
  u: number
  v: number
  r: number
  phase: number
  rate: number
  base: number
}

interface Streak {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

const TAU = Math.PI * 2

/**
 * A quiet night sky: seeded stars that twinkle at their own pace, crossed now and then by a
 * shooting star with a fading tail. Canvas, DPR-capped, paused offscreen.
 */
export const StarrySky = forwardRef<HTMLDivElement, StarrySkyProps>(
  (
    {
      density = 1.6,
      color = "var(--kg-fg)",
      trailColor = "var(--kg-ink)",
      interval = 3.5,
      seed = 12,
      mask = "top",
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
    const streaks = useRef<Streak[]>([])
    const next = useRef(1200)
    const random = useRef(createRandom(seed))

    useCanvasStage(root, canvasRef, {
      pointer: false,
      deps: [density, seed],
      resize: (width, height) => {
        const wanted = Math.min(Math.round(((width * height) / 10000) * Math.max(density, 0)), 1500)
        if (stars.current.length === wanted) return
        const rand = createRandom(seed)
        stars.current = Array.from({ length: wanted }, () => {
          const r = rand() ** 3
          return {
            u: rand(),
            v: rand(),
            r: 0.4 + r * 1.3,
            phase: rand() * TAU,
            rate: 0.5 + rand() * 1.8,
            base: 0.25 + rand() * 0.6,
          }
        })
        random.current = createRandom(seed + 1)
      },
      draw: ({ ctx, width, height, time, dt, still, color: resolve }) => {
        const t = time / 1000
        const star = resolve(color)
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = `rgb(${star.r} ${star.g} ${star.b})`
        for (const s of stars.current) {
          const twinkle = still ? 1 : 0.55 + 0.45 * Math.sin(t * s.rate + s.phase)
          ctx.globalAlpha = s.base * twinkle * star.a
          ctx.beginPath()
          ctx.arc(s.u * width, s.v * height, s.r, 0, TAU)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        if (still || interval <= 0) return

        if (time >= next.current) {
          const rand = random.current
          const angle = Math.PI * (0.12 + rand() * 0.1)
          const velocity = 9 + rand() * 6
          streaks.current.push({
            x: width * (0.1 + rand() * 0.7),
            y: height * rand() * 0.35,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            life: 1,
          })
          next.current = time + interval * 1000 * (0.6 + rand() * 0.8)
        }
        const tail = resolve(trailColor)
        ctx.lineCap = "round"
        streaks.current = streaks.current.filter((streak) => {
          streak.x += streak.vx * dt
          streak.y += streak.vy * dt
          streak.life -= 0.012 * dt
          if (streak.life <= 0 || streak.x > width + 60 || streak.y > height + 60) return false
          const length = 18
          const gradient = ctx.createLinearGradient(
            streak.x,
            streak.y,
            streak.x - streak.vx * length,
            streak.y - streak.vy * length,
          )
          gradient.addColorStop(0, rgba(tail, streak.life))
          gradient.addColorStop(1, rgba(tail, 0))
          ctx.strokeStyle = gradient
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(streak.x, streak.y)
          ctx.lineTo(streak.x - streak.vx * length, streak.y - streak.vy * length)
          ctx.stroke()
          return true
        })
      },
    })

    return (
      <div
        ref={ref}
        {...backdropRoot("kg-starry-sky absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto", className, wrapper)}
        data-mask={mask}
        {...props}
      >
        <div className="kg-starry-sky__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-starry-sky__canvas block size-full" />
        </div>
        {wrapper && <div className="kg-starry-sky__content relative z-1">{children}</div>}
      </div>
    )
  },
)

StarrySky.displayName = "StarrySky"
