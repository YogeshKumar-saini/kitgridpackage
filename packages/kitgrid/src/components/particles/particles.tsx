"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { clamp, lerp } from "../../utils/math.js"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom } from "../aurora/internal/random.js"
import { type CanvasRgb, observeTheme, resolveCanvasColor } from "./canvas.js"

export interface ParticlesProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of particles (capped at 1500). */
  quantity?: number
  /** Smallest and largest particle radius, in px. */
  size?: readonly [min: number, max: number]
  /** Any CSS color, custom properties included. Defaults to the ink. */
  color?: string
  /** Drift speed multiplier. 0 holds the field still. */
  speed?: number
  /** 0–1: how strongly particles lean toward the pointer, nearer and larger ones more. */
  magnetism?: number
  /** Draw lines between particles closer than `linkDistance`. */
  links?: boolean
  /** Maximum length of a link, in px. */
  linkDistance?: number
  /** Any CSS color for links. Defaults to `color`. */
  linkColor?: string
  /** Gently vary each particle's brightness over time. */
  twinkle?: boolean
  /** Same seed, same field. */
  seed?: number
  /** Optional content, painted above the particles. */
  children?: ReactNode
}

interface Engine {
  sync: () => void
  refreshColors: () => void
}

interface Particle {
  u: number
  v: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  /** 0–1: larger particles read as nearer, so they drift and lean further. */
  depth: number
  alpha: number
  phase: number
  rate: number
  ox: number
  oy: number
}

const MAX_PARTICLES = 1500
const MAX_LINKS = 6000
const ALPHA_STEPS = 12
const TAU = Math.PI * 2
const POINTER_RADIUS = 220
const EDGE = 24

/**
 * A canvas particle field: drifting, twinkling dots with optional links and pointer magnetism.
 * DPR-aware, sized by ResizeObserver, paused offscreen and in hidden tabs, and drawn as one still
 * frame under reduced motion. Colors are read from CSS, so the field follows theme changes.
 */
export const Particles = forwardRef<HTMLDivElement, ParticlesProps>(
  (
    {
      quantity = 90,
      size = [0.5, 1.8],
      color = "var(--kg-ink)",
      speed = 0.25,
      magnetism = 0.4,
      links = false,
      linkDistance = 120,
      linkColor,
      twinkle = true,
      seed = 5,
      className,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const root = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(root, forwardedRef)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const engine = useRef<Engine | null>(null)
    const reduced = useReducedMotion()
    const inView = useInView(root, { once: false, amount: 0 })
    const wrapper = hasChildren(children)
    const [minSize, maxSize] = size
    const active = inView && !reduced

    const settings = {
      speed,
      magnetism,
      links,
      linkDistance,
      twinkle,
      color,
      linkColor,
      reduced,
    }
    const latest = useRef(settings)
    latest.current = settings
    const activeRef = useRef(active)
    activeRef.current = active

    useEffect(() => {
      const node = root.current
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!node || !canvas || !ctx) return

      const random = createRandom(seed)
      const low = Math.max(Math.min(minSize, maxSize), 0.1)
      const high = Math.max(minSize, maxSize, low)
      const particles: Particle[] = Array.from(
        { length: clamp(Math.round(quantity), 0, MAX_PARTICLES) },
        () => {
          const depth = random() ** 1.6
          const heading = random() * TAU
          return {
            u: random(),
            v: random(),
            x: 0,
            y: 0,
            vx: Math.cos(heading) * (0.3 + depth * 0.7),
            vy: Math.sin(heading) * (0.3 + depth * 0.7) - 0.15,
            r: lerp(low, high, depth),
            depth,
            alpha: 0.35 + random() * 0.65,
            phase: random() * TAU,
            rate: 0.6 + random() * 1.4,
            ox: 0,
            oy: 0,
          }
        },
      )

      let width = 0
      let height = 0
      let frame = 0
      let last = 0
      let running = false
      let dot: CanvasRgb | null = null
      let line: CanvasRgb | null = null
      const pointer = { inside: false, clientX: 0, clientY: 0 }
      const dotBuckets: number[][] = Array.from({ length: ALPHA_STEPS + 1 }, () => [])
      const lineBuckets: number[][] = Array.from({ length: ALPHA_STEPS + 1 }, () => [])
      let grid: number[][] = []
      let columns = 0

      const paint = (time: number) => {
        ctx.clearRect(0, 0, width, height)
        if (!width || !height || !dot) return
        const settings = latest.current

        if (settings.links && line && particles.length > 1) {
          const reach = Math.max(settings.linkDistance, 1)
          const cols = Math.ceil(width / reach) + 2
          const rows = Math.ceil(height / reach) + 2
          if (cols !== columns || grid.length !== cols * rows) {
            columns = cols
            grid = Array.from({ length: cols * rows }, () => [])
          }
          for (const cell of grid) cell.length = 0
          for (const bucket of lineBuckets) bucket.length = 0
          particles.forEach((p, index) => {
            const cx = clamp(Math.floor((p.x + p.ox) / reach) + 1, 0, cols - 1)
            const cy = clamp(Math.floor((p.y + p.oy) / reach) + 1, 0, rows - 1)
            grid[cy * cols + cx]?.push(index)
          })

          // Each pair is visited once: own cell, then the four neighbours ahead of it.
          const ahead = [0, 1, cols - 1, cols, cols + 1]
          let budget = MAX_LINKS
          for (let cell = 0; cell < grid.length && budget > 0; cell++) {
            const own = grid[cell]
            if (!own || own.length === 0) continue
            for (const offset of ahead) {
              const other = grid[cell + offset]
              if (!other) continue
              for (let i = 0; i < own.length; i++) {
                const a = particles[own[i] as number] as Particle
                for (let j = offset === 0 ? i + 1 : 0; j < other.length; j++) {
                  const b = particles[other[j] as number] as Particle
                  const dx = a.x + a.ox - (b.x + b.ox)
                  const dy = a.y + a.oy - (b.y + b.oy)
                  const distance = Math.hypot(dx, dy)
                  if (distance >= reach) continue
                  const level = Math.round((1 - distance / reach) * ALPHA_STEPS)
                  lineBuckets[level]?.push(
                    a.x + a.ox,
                    a.y + a.oy,
                    b.x + b.ox,
                    b.y + b.oy,
                  )
                  if (--budget <= 0) break
                }
                if (budget <= 0) break
              }
              if (budget <= 0) break
            }
          }

          ctx.strokeStyle = `rgb(${line.r} ${line.g} ${line.b})`
          ctx.lineWidth = 1
          lineBuckets.forEach((segments, level) => {
            if (level === 0 || segments.length === 0) return
            ctx.globalAlpha = (level / ALPHA_STEPS) * 0.45 * (line as CanvasRgb).a
            ctx.beginPath()
            for (let k = 0; k < segments.length; k += 4) {
              ctx.moveTo(segments[k] as number, segments[k + 1] as number)
              ctx.lineTo(segments[k + 2] as number, segments[k + 3] as number)
            }
            ctx.stroke()
          })
        }

        for (const bucket of dotBuckets) bucket.length = 0
        const seconds = time / 1000
        particles.forEach((p, index) => {
          const flicker = settings.twinkle
            ? 0.6 + 0.4 * Math.sin(seconds * p.rate + p.phase)
            : 1
          dotBuckets[Math.round(p.alpha * flicker * ALPHA_STEPS)]?.push(index)
        })
        ctx.fillStyle = `rgb(${dot.r} ${dot.g} ${dot.b})`
        dotBuckets.forEach((indices, level) => {
          if (level === 0 || indices.length === 0) return
          ctx.globalAlpha = (level / ALPHA_STEPS) * (dot as CanvasRgb).a
          ctx.beginPath()
          for (const index of indices) {
            const p = particles[index] as Particle
            const x = p.x + p.ox
            const y = p.y + p.oy
            ctx.moveTo(x + p.r, y)
            ctx.arc(x, y, p.r, 0, TAU)
          }
          ctx.fill()
        })
        ctx.globalAlpha = 1
      }

      const step = (dt: number) => {
        const { speed: drift, magnetism: pull } = latest.current
        const strength = clamp(pull, 0, 1)
        let px = 0
        let py = 0
        const leaning = pointer.inside && strength > 0
        if (leaning) {
          const rect = canvas.getBoundingClientRect()
          px = pointer.clientX - rect.left
          py = pointer.clientY - rect.top
        }
        const ease = 1 - 0.94 ** dt
        const spanX = width + EDGE * 2
        const spanY = height + EDGE * 2

        for (const p of particles) {
          p.x += p.vx * drift * dt
          p.y += p.vy * drift * dt
          if (p.x < -EDGE) p.x += spanX
          else if (p.x > width + EDGE) p.x -= spanX
          if (p.y < -EDGE) p.y += spanY
          else if (p.y > height + EDGE) p.y -= spanY

          let tx = 0
          let ty = 0
          if (leaning) {
            const dx = px - p.x
            const dy = py - p.y
            const distance = Math.hypot(dx, dy)
            const near = Math.max(0, 1 - distance / POINTER_RADIUS)
            const lean = strength * (0.25 + p.depth * 0.75)
            tx = dx * near * near * lean * 0.55 + (px - width / 2) * 0.03 * lean
            ty = dy * near * near * lean * 0.55 + (py - height / 2) * 0.03 * lean
          }
          p.ox += (tx - p.ox) * ease
          p.oy += (ty - p.oy) * ease
        }
      }

      const tick = (now: number) => {
        frame = 0
        const dt = last ? Math.min(now - last, 64) / (1000 / 60) : 1
        last = now
        step(dt)
        paint(now)
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
        }
      }

      const still = () => {
        for (const p of particles) {
          p.ox = 0
          p.oy = 0
        }
        paint(0)
      }

      const resize = () => {
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        if (!w || !h) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        for (const p of particles) {
          if (width && height) {
            p.x *= w / width
            p.y *= h / height
          } else {
            p.x = p.u * w
            p.y = p.v * h
          }
        }
        width = w
        height = h
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        if (!running) paint(0)
      }

      const refreshColors = () => {
        const { color: fillColor, linkColor: strokeColor } = latest.current
        dot = resolveCanvasColor(canvas, fillColor)
        line = strokeColor ? resolveCanvasColor(canvas, strokeColor) : dot
        if (!running) paint(0)
      }

      let themeFrame = 0
      const scheduleColors = () => {
        cancelAnimationFrame(themeFrame)
        themeFrame = requestAnimationFrame(refreshColors)
      }

      const target = node.hasAttribute("data-wrapper")
        ? node
        : (node.parentElement ?? node)
      const handleMove = (event: PointerEvent) => {
        pointer.inside = true
        pointer.clientX = event.clientX
        pointer.clientY = event.clientY
      }
      const handleLeave = () => {
        pointer.inside = false
      }

      dot = resolveCanvasColor(canvas, latest.current.color)
      line = latest.current.linkColor
        ? resolveCanvasColor(canvas, latest.current.linkColor)
        : dot
      resize()

      // Raw listeners rather than usePointerVars: the canvas needs coordinates, not CSS variables,
      // and skipping the style writes keeps the theme observer quiet.
      target.addEventListener("pointermove", handleMove, { passive: true })
      target.addEventListener("pointerleave", handleLeave)
      document.addEventListener("visibilitychange", update)
      const resizer =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize)
      resizer?.observe(canvas)
      const unobserveTheme = observeTheme(node, scheduleColors)

      engine.current = {
        sync: () => {
          update()
          if (latest.current.reduced) still()
        },
        refreshColors,
      }
      update()

      return () => {
        running = false
        cancelAnimationFrame(frame)
        cancelAnimationFrame(themeFrame)
        target.removeEventListener("pointermove", handleMove)
        target.removeEventListener("pointerleave", handleLeave)
        document.removeEventListener("visibilitychange", update)
        resizer?.disconnect()
        unobserveTheme()
        engine.current = null
      }
    }, [quantity, minSize, maxSize, seed])

    useEffect(() => {
      engine.current?.refreshColors()
    }, [color, linkColor])

    useEffect(() => {
      engine.current?.sync()
    }, [active])

    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-particles absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:overflow-visible data-wrapper:isolate data-wrapper:pointer-events-auto",
          className,
          wrapper,
        )}
        {...props}
      >
        <div
          className="kg-particles__layer pointer-events-none absolute inset-0 z-0 overflow-hidden"
          aria-hidden="true"
        >
          <canvas ref={canvasRef} className="kg-particles__canvas block size-full" />
        </div>
        {wrapper && <div className="kg-particles__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Particles.displayName = "Particles"
