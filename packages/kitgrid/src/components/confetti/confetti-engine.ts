import { canUseDOM, supportsPopover } from "../../utils/env.js"

export type ConfettiShape = "rect" | "circle" | "star"

/** A point in client (viewport) pixels. */
export interface ConfettiPoint {
  x: number
  y: number
}

/** Where a burst starts: an element (its centre) or a point in client pixels. */
export type ConfettiOrigin = Element | ConfettiPoint

export interface ConfettiOptions {
  particleCount?: number
  /** Width of the cone, in degrees. */
  spread?: number
  /** Launch direction in degrees: 90 is straight up, 0 is to the right. */
  angle?: number
  /** Initial speed in px per frame (at 60 fps). */
  startVelocity?: number
  /** 1 is natural; 0 floats. */
  gravity?: number
  /** Sideways wind, in px per frame. */
  drift?: number
  /** Fraction of speed kept each frame, 0–1. */
  decay?: number
  /** Lifetime in frames at 60 fps. */
  ticks?: number
  /** Particle size multiplier. */
  scalar?: number
  /** CSS colours, including `var(--token)` and `color-mix()`. Defaults to the accent family. */
  colors?: string[]
  shapes?: ConfettiShape[]
  /** Origin as a fraction of the viewport (0–1). Ignored when an element or point is given. */
  origin?: { x: number; y: number }
  zIndex?: number
  /** Skip the burst when the user prefers reduced motion. On by default. */
  disableForReducedMotion?: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  drift: number
  decay: number
  wobble: number
  wobbleSpeed: number
  tilt: number
  tiltSpeed: number
  spin: number
  spinSpeed: number
  size: number
  color: string
  shape: ConfettiShape
  life: number
  ttl: number
  burst: Burst
}

interface Burst {
  alive: number
  resolve: () => void
}

// The accent, two neighbours within 25° of it, and two graphite flecks for contrast, so a
// burst reads as the brand rather than a rainbow and still shows on light and dark pages.
const DEFAULT_COLORS = [
  "var(--kg-accent)",
  "var(--kg-accent)",
  "var(--kg-accent-strong)",
  "color-mix(in oklch, var(--kg-accent), var(--kg-warning) 50%)",
  "color-mix(in oklch, var(--kg-accent), var(--kg-danger) 35%)",
  "var(--kg-fg)",
  "var(--kg-fg-faint)",
]

// Used only when the kitgrid tokens are not on the page at all.
const FALLBACK_COLORS = [
  "#f07a2a",
  "#f07a2a",
  "#a8501a",
  "#f5a524",
  "#e0552c",
  "#24262b",
  "#8a8f99",
]

const SENTINEL = "#010203"

const DEFAULT_SHAPES: ConfettiShape[] = ["rect", "rect", "circle", "star"]

let canvas: HTMLCanvasElement | null = null
let context: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let frame = 0
let last = 0
let ratio = 1

const prefersReducedMotion = (scope: Element) =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true ||
  scope.closest('[data-kg-motion="reduce"]') !== null

const resize = () => {
  if (!canvas || !context) return
  // Capped: confetti is soft-edged and moves fast, so 3x density only costs fill rate.
  ratio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(window.innerWidth * ratio)
  canvas.height = Math.round(window.innerHeight * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
}

const mount = (zIndex: number): CanvasRenderingContext2D | null => {
  if (!canvas) {
    const node = document.createElement("canvas")
    const ctx = node.getContext("2d")
    if (!ctx) return null
    node.className = "kg-confetti"
    node.setAttribute("aria-hidden", "true")
    // Inline so it works without the stylesheet and beats the UA [popover] box.
    Object.assign(node.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      maxWidth: "none",
      maxHeight: "none",
      margin: "0",
      padding: "0",
      border: "0",
      background: "transparent",
      overflow: "visible",
      pointerEvents: "none",
    })
    if (supportsPopover()) node.setAttribute("popover", "manual")
    document.body.append(node)
    canvas = node
    context = ctx
    resize()
    window.addEventListener("resize", resize)
  }
  canvas.style.zIndex = String(zIndex)
  // Re-promote on every burst so it lands above any dialog opened since the last one.
  if (canvas.hasAttribute("popover") && typeof canvas.showPopover === "function") {
    if (canvas.matches(":popover-open")) canvas.hidePopover()
    canvas.showPopover()
  }
  return context
}

const unmount = () => {
  cancelAnimationFrame(frame)
  frame = 0
  window.removeEventListener("resize", resize)
  canvas?.remove()
  canvas = null
  context = null
}

const resolveColors = (
  colors: string[],
  scope: Element,
  ctx: CanvasRenderingContext2D,
) => {
  const host = scope === document.documentElement ? document.body : scope
  const themed = getComputedStyle(host).getPropertyValue("--kg-accent").trim() !== ""
  const source = colors === DEFAULT_COLORS && !themed ? FALLBACK_COLORS : colors
  // Resolve tokens where the burst starts, so scoped themes colour their own confetti.
  const probe = document.createElement("span")
  probe.style.display = "none"
  host.append(probe)
  const resolved = source.map((color, index) => {
    probe.style.color = ""
    probe.style.color = color
    const computed = getComputedStyle(probe).color || color
    // A canvas that cannot parse the colour space keeps the sentinel: fall back per slot.
    ctx.fillStyle = SENTINEL
    ctx.fillStyle = computed
    const parsed = String(ctx.fillStyle)
    if (parsed !== SENTINEL) return parsed
    return FALLBACK_COLORS[index % FALLBACK_COLORS.length] as string
  })
  probe.remove()
  return resolved
}

const drawStar = (ctx: CanvasRenderingContext2D, radius: number) => {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.45
    const a = (Math.PI / 5) * i - Math.PI / 2
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fill()
}

const step = (now: number) => {
  const ctx = context
  if (!ctx || !canvas) return
  // Clamped so a backgrounded tab resumes mid-flight instead of teleporting.
  const k = Math.min((now - last) / (1000 / 60), 2) || 1
  last = now
  const width = window.innerWidth
  const height = window.innerHeight
  ctx.clearRect(0, 0, width, height)

  const survivors: Particle[] = []
  for (const p of particles) {
    const keep = p.decay ** k
    p.vx *= keep
    p.vy *= keep
    p.wobble += p.wobbleSpeed * k
    p.tilt += p.tiltSpeed * k
    p.spin += p.spinSpeed * k
    p.x += (p.vx + p.drift + Math.cos(p.wobble) * 0.6) * k
    p.y += (p.vy + p.gravity * 3) * k
    p.life += k

    if (p.life >= p.ttl || p.y > height + 40) {
      if (--p.burst.alive === 0) p.burst.resolve()
      continue
    }
    survivors.push(p)

    const fadeFrom = p.ttl * 0.65
    ctx.globalAlpha =
      p.life > fadeFrom ? 1 - (p.life - fadeFrom) / (p.ttl - fadeFrom) : 1
    ctx.fillStyle = p.color
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.spin)
    // Squashing one axis with the tilt reads as paper turning over in the air.
    ctx.scale(1, Math.cos(p.tilt))
    if (p.shape === "circle") {
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size * 0.45, p.size * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.shape === "star") {
      drawStar(ctx, p.size * 0.6)
    } else {
      ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6)
    }
    ctx.restore()
  }
  ctx.globalAlpha = 1
  particles = survivors

  if (particles.length === 0) {
    unmount()
    return
  }
  frame = requestAnimationFrame(step)
}

const centreOf = (origin: ConfettiOrigin): ConfettiPoint => {
  if (origin instanceof Element) {
    const rect = origin.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }
  return origin
}

/**
 * Fires a burst of confetti on a shared, lazily created canvas overlay that is removed again as
 * soon as the last particle lands. Resolves when this burst has finished. A no-op on the server
 * and, by default, under reduced motion.
 */
export const launchConfetti = (
  options: ConfettiOptions = {},
  from?: ConfettiOrigin,
): Promise<void> => {
  if (!canUseDOM) return Promise.resolve()
  const {
    particleCount = 80,
    spread = 70,
    angle = 90,
    startVelocity = 42,
    gravity = 1,
    drift = 0,
    decay = 0.9,
    ticks = 220,
    scalar = 1,
    colors = DEFAULT_COLORS,
    shapes = DEFAULT_SHAPES,
    origin = { x: 0.5, y: 0.6 },
    zIndex = 1700,
    disableForReducedMotion = true,
  } = options
  const scope = from instanceof Element ? from : document.documentElement
  if (disableForReducedMotion && prefersReducedMotion(scope)) return Promise.resolve()
  const count = Math.max(0, Math.round(particleCount))
  if (count === 0 || colors.length === 0 || shapes.length === 0)
    return Promise.resolve()

  const ctx = mount(zIndex)
  if (!ctx) return Promise.resolve()

  const palette = resolveColors(colors, scope, ctx)
  const start = from
    ? centreOf(from)
    : { x: origin.x * window.innerWidth, y: origin.y * window.innerHeight }
  const direction = (-angle * Math.PI) / 180
  const cone = (spread * Math.PI) / 180

  return new Promise<void>((resolve) => {
    const burst: Burst = { alive: count, resolve }
    for (let i = 0; i < count; i++) {
      const heading = direction + (Math.random() - 0.5) * cone
      const speed = startVelocity * (0.5 + Math.random() * 0.7)
      particles.push({
        x: start.x,
        y: start.y,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        gravity,
        drift,
        decay,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.07,
        tilt: Math.random() * Math.PI,
        tiltSpeed: 0.08 + Math.random() * 0.12,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.3,
        size: (7 + Math.random() * 5) * scalar,
        color: palette[i % palette.length] ?? "currentColor",
        shape: shapes[Math.floor(Math.random() * shapes.length)] ?? "rect",
        life: 0,
        ttl: ticks * (0.8 + Math.random() * 0.4),
        burst,
      })
    }
    if (!frame) {
      last = performance.now()
      frame = requestAnimationFrame(step)
    }
  })
}

/** Stops every burst in flight and removes the overlay. */
export const resetConfetti = (): void => {
  const pending = new Set(particles.map((p) => p.burst))
  particles = []
  for (const burst of pending) burst.resolve()
  if (canUseDOM) unmount()
}

/**
 * `confetti({ particleCount: 120, spread: 90 })` fires from `origin` (a viewport fraction).
 * `confetti.reset()` clears the sky.
 */
export const confetti: ((options?: ConfettiOptions) => Promise<void>) & {
  reset: () => void
} = Object.assign((options?: ConfettiOptions) => launchConfetti(options), {
  reset: resetConfetti,
})
