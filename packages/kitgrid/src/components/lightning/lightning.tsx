import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom, round } from "../aurora/internal/random.js"

export interface LightningProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of bolts, 1–5. */
  bolts?: number
  /** Any CSS color. Defaults to ink. */
  color?: string
  /** Seconds between strikes of the same bolt. */
  interval?: number
  /** Add forked side branches. */
  branches?: boolean
  /** Same seed, same bolts. */
  seed?: number
  children?: ReactNode
}

const WIDTH = 1000
const HEIGHT = 600

type Point = readonly [number, number]

/** Midpoint displacement: each pass halves segments and jitters them sideways. */
const strike = (from: Point, to: Point, random: () => number, roughness: number): Point[] => {
  let points: Point[] = [from, to]
  let offset = roughness
  for (let pass = 0; pass < 6; pass++) {
    const next: Point[] = []
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i] as Point
      const b = points[i + 1] as Point
      next.push(a, [
        (a[0] + b[0]) / 2 + (random() - 0.5) * offset,
        (a[1] + b[1]) / 2 + (random() - 0.5) * offset * 0.25,
      ])
    }
    next.push(points[points.length - 1] as Point)
    points = next
    offset /= 2
  }
  return points
}

const toPath = (points: readonly Point[]) =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${round(x, 1)} ${round(y, 1)}`).join("")

/**
 * Seeded SVG bolts that strike in turn with a double flicker and a sky flash. The flashes are
 * CSS opacity keyframes, so nothing runs in JavaScript. Server-component safe.
 */
export const Lightning = forwardRef<HTMLDivElement, LightningProps>(
  (
    {
      bolts = 3,
      color,
      interval = 6,
      branches = true,
      seed = 7,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const random = createRandom(seed)
    const total = Math.round(Math.min(Math.max(bolts, 1), 5))
    const period = Math.max(interval, 1.5)
    const shapes = Array.from({ length: total }, (_, index) => {
      const x = WIDTH * ((index + 0.5) / total) + (random() - 0.5) * (WIDTH / total) * 0.5
      const main = strike([x, -10], [x + (random() - 0.5) * 260, HEIGHT * (0.7 + random() * 0.3)], random, 220)
      const forks: string[] = []
      if (branches) {
        for (let f = 0; f < 2; f++) {
          const at = main[Math.floor(main.length * (0.25 + random() * 0.4))] as Point
          const side = random() > 0.5 ? 1 : -1
          forks.push(
            toPath(
              strike(at, [at[0] + side * (80 + random() * 140), at[1] + 90 + random() * 120], random, 70),
            ),
          )
        }
      }
      return { main: toPath(main), forks, cx: round((x / WIDTH) * 100, 2) }
    })
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-lightning absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-lightning-color,var(--kg-ink))] [--_core:color-mix(in_oklab,var(--_c)_45%,var(--kg-surface))]",
          className,
          wrapper,
        )}
        style={
          {
            ...(color ? { "--kg-lightning-color": color } : null),
            "--kg-lightning-interval": `${period}s`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-lightning__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          {shapes.map((shape, index) => (
            <div
              key={index}
              className="kg-lightning__strike absolute inset-0"
              style={
                {
                  "--_delay": `${round((period / total) * index + random() * 0.6, 2)}s`,
                  "--_x": `${shape.cx}%`,
                } as CSSProperties
              }
            >
              <div className="kg-lightning__flash absolute top-[-30%] left-[var(--_x,50%)] aspect-[1.6] w-[90%] -translate-x-1/2" />
              <svg
                className="absolute inset-0 size-full"
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                preserveAspectRatio="none"
                focusable="false"
              >
                <path className="kg-lightning__glow fill-none [stroke-linecap:round] [stroke-linejoin:round] [vector-effect:non-scaling-stroke] stroke-[color-mix(in_oklab,var(--_c)_35%,transparent)] stroke-7 data-fork:stroke-4" d={shape.main} />
                {shape.forks.map((d, f) => (
                  <path
                    key={`glow-${f}`}
                    className="kg-lightning__glow fill-none [stroke-linecap:round] [stroke-linejoin:round] [vector-effect:non-scaling-stroke] stroke-[color-mix(in_oklab,var(--_c)_35%,transparent)] stroke-7 data-fork:stroke-4"
                    data-fork=""
                    d={d}
                  />
                ))}
                <path className="kg-lightning__bolt fill-none [stroke-linecap:round] [stroke-linejoin:round] [vector-effect:non-scaling-stroke] stroke-(--_core) stroke-[1.6] data-fork:stroke-[0.9] data-fork:opacity-80" d={shape.main} />
                {shape.forks.map((d, f) => (
                  <path
                    key={`bolt-${f}`}
                    className="kg-lightning__bolt fill-none [stroke-linecap:round] [stroke-linejoin:round] [vector-effect:non-scaling-stroke] stroke-(--_core) stroke-[1.6] data-fork:stroke-[0.9] data-fork:opacity-80"
                    data-fork=""
                    d={d}
                  />
                ))}
              </svg>
            </div>
          ))}
        </div>
        {wrapper && <div className="kg-lightning__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Lightning.displayName = "Lightning"
