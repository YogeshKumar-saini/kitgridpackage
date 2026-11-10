"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom } from "../aurora/internal/random.js"
import { rgba, useCanvasStage } from "../backdrop-kit/stage.js"

export interface BallPitProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of balls, capped at 120. */
  count?: number
  /** CSS colors the balls cycle through. Defaults to the five paper colours. */
  colors?: readonly string[]
  /** Smallest and largest radius, in px. */
  size?: readonly [min: number, max: number]
  /** Gravity multiplier; 0 lets them float. */
  gravity?: number
  /** Same seed, same balls. */
  seed?: number
  children?: ReactNode
}

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  tone: number
}

const DEFAULT_COLORS = [
  "var(--kg-paper-sage)",
  "var(--kg-paper-peach)",
  "var(--kg-paper-sky)",
  "var(--kg-paper-butter)",
  "var(--kg-paper-rose)",
] as const

const TAU = Math.PI * 2
const POINTER_RADIUS = 70

/**
 * A small physics toy: balls fall, stack and collide, and the pointer shoves them around. Plain
 * canvas 2D with a fixed-step solver. Under reduced motion it renders the settled pile once.
 */
export const BallPit = forwardRef<HTMLDivElement, BallPitProps>(
  (
    {
      count = 46,
      colors = DEFAULT_COLORS,
      size = [16, 34],
      gravity = 1,
      seed = 6,
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
    const balls = useRef<Ball[]>([])
    const bounds = useRef({ width: 0, height: 0 })
    const settled = useRef(false)
    const total = Math.min(Math.max(Math.round(count), 1), 120)
    const [min, max] = size

    const step = (width: number, height: number, pointer: { x: number; y: number; inside: boolean }) => {
      const list = balls.current
      const g = 0.35 * gravity
      for (const ball of list) {
        ball.vy += g
        ball.vx *= 0.995
        ball.vy *= 0.995
        ball.x += ball.vx
        ball.y += ball.vy
        if (ball.x < ball.r) {
          ball.x = ball.r
          ball.vx = Math.abs(ball.vx) * 0.6
        } else if (ball.x > width - ball.r) {
          ball.x = width - ball.r
          ball.vx = -Math.abs(ball.vx) * 0.6
        }
        if (ball.y > height - ball.r) {
          ball.y = height - ball.r
          ball.vy = -Math.abs(ball.vy) * 0.45
          ball.vx *= 0.96
        } else if (ball.y < ball.r && gravity <= 0) {
          ball.y = ball.r
          ball.vy = Math.abs(ball.vy) * 0.6
        }
        if (pointer.inside) {
          const dx = ball.x - pointer.x
          const dy = ball.y - pointer.y
          const reach = ball.r + POINTER_RADIUS
          const d2 = dx * dx + dy * dy
          if (d2 < reach * reach && d2 > 0.01) {
            const d = Math.sqrt(d2)
            const force = (1 - d / reach) * 2.4
            ball.vx += (dx / d) * force
            ball.vy += (dy / d) * force
          }
        }
      }
      for (let i = 0; i < list.length; i++) {
        const a = list[i] as Ball
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j] as Ball
          const dx = b.x - a.x
          const dy = b.y - a.y
          const reach = a.r + b.r
          const d2 = dx * dx + dy * dy
          if (d2 >= reach * reach || d2 === 0) continue
          const d = Math.sqrt(d2)
          const nx = dx / d
          const ny = dy / d
          const overlap = (reach - d) / 2
          a.x -= nx * overlap
          a.y -= ny * overlap
          b.x += nx * overlap
          b.y += ny * overlap
          const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
          if (relative < 0) {
            const impulse = relative * 0.85
            a.vx += impulse * nx
            a.vy += impulse * ny
            b.vx -= impulse * nx
            b.vy -= impulse * ny
          }
        }
      }
    }

    useCanvasStage(root, canvasRef, {
      deps: [total, seed, min, max],
      resize: (width, height) => {
        const previous = bounds.current
        if (balls.current.length === total && previous.width) {
          for (const ball of balls.current) {
            ball.x *= width / previous.width
            ball.y = Math.min(ball.y, height - ball.r)
          }
        } else {
          const random = createRandom(seed)
          const low = Math.max(Math.min(min, max), 4)
          const high = Math.max(min, max, low)
          balls.current = Array.from({ length: total }, (_, index) => {
            const r = low + (high - low) * random()
            return {
              x: r + random() * Math.max(width - r * 2, 1),
              y: -random() * height * 0.9 + height * 0.15,
              vx: (random() - 0.5) * 3,
              vy: 0,
              r,
              tone: index,
            }
          })
          settled.current = false
        }
        bounds.current = { width, height }
      },
      draw: ({ ctx, width, height, dt, still, pointer, color: resolve }) => {
        if (still && !settled.current) {
          for (let i = 0; i < 480; i++) step(width, height, { x: 0, y: 0, inside: false })
          settled.current = true
        } else if (!still) {
          const steps = Math.min(Math.round(dt), 3) || 1
          for (let i = 0; i < steps; i++) step(width, height, pointer)
        }
        ctx.clearRect(0, 0, width, height)
        const palette = (colors.length ? colors : DEFAULT_COLORS).map((value) => resolve(value))
        const shine = resolve("var(--kg-surface)")
        const edge = resolve("var(--kg-ink)")
        ctx.lineWidth = 1
        for (const ball of balls.current) {
          const tone = palette[ball.tone % palette.length]
          if (!tone) continue
          ctx.fillStyle = rgba(tone)
          ctx.strokeStyle = rgba(edge)
          ctx.beginPath()
          ctx.arc(ball.x, ball.y, ball.r, 0, TAU)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = rgba(shine, 0.35)
          ctx.beginPath()
          ctx.arc(ball.x - ball.r * 0.35, ball.y - ball.r * 0.38, ball.r * 0.28, 0, TAU)
          ctx.fill()
        }
      },
    })
    return (
      <div ref={ref} {...backdropRoot("kg-ball-pit absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto", className, wrapper)} {...props}>
        <div className="kg-ball-pit__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-ball-pit__canvas block size-full" />
        </div>
        {wrapper && <div className="kg-ball-pit__content relative z-1">{children}</div>}
      </div>
    )
  },
)

BallPit.displayName = "BallPit"
