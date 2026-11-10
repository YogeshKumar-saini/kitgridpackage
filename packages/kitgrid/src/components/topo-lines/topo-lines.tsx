import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom, round } from "../aurora/internal/random.js"

export type TopoLinesMask = BackdropMask

export interface TopoLinesProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of summits, 1–6. */
  peaks?: number
  /** Contour lines around each summit, 3–24. */
  rings?: number
  /** Any CSS color for the contours. Defaults to a faint ink. */
  color?: string
  /** Any CSS color for the highlighted index contours. Defaults to a strong ink. */
  accentColor?: string
  /** Slow rotation of every summit. */
  animated?: boolean
  /** Same seed, same map. */
  seed?: number
  mask?: TopoLinesMask
  children?: ReactNode
}

const WIDTH = 1200
const HEIGHT = 720
const POINTS = 90
const TAU = Math.PI * 2

/**
 * Every ring around a summit shares the same harmonics, scaled with its radius, so contours nest
 * like a real elevation map instead of crossing.
 */
const contour = (
  cx: number,
  cy: number,
  radius: number,
  harmonics: readonly (readonly [amp: number, phase: number])[],
  drift: number,
) => {
  let d = ""
  for (let i = 0; i < POINTS; i++) {
    const theta = (i / POINTS) * TAU
    let wobble = 1
    harmonics.forEach(([amp, phase], j) => {
      wobble += amp * Math.sin((j + 2) * theta + phase + drift)
    })
    const x = cx + Math.cos(theta) * radius * wobble
    const y = cy + Math.sin(theta) * radius * wobble * 0.82
    d += `${i === 0 ? "M" : "L"}${round(x, 1)} ${round(y, 1)}`
  }
  return `${d}Z`
}

/**
 * A seeded topographic map: nested, organic contour lines around a few summits, with every
 * fifth line drawn as an index contour. Static SVG, optionally turning very slowly. Server safe.
 */
export const TopoLines = forwardRef<HTMLDivElement, TopoLinesProps>(
  (
    {
      peaks = 3,
      rings = 12,
      color,
      accentColor,
      animated = true,
      seed = 11,
      mask = "none",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const random = createRandom(seed)
    const summits = Math.round(Math.min(Math.max(peaks, 1), 6))
    const levels = Math.round(Math.min(Math.max(rings, 3), 24))
    const groups = Array.from({ length: summits }, (_, index) => {
      const cx = WIDTH * ((index + 0.5) / summits + (random() - 0.5) * (0.6 / summits))
      const cy = HEIGHT * (0.15 + random() * 0.7)
      const reach = 170 + random() * 150
      const harmonics = Array.from(
        { length: 3 },
        (_, j) => [(0.11 + random() * 0.06) / (j + 1), random() * TAU] as const,
      )
      const paths = Array.from({ length: levels }, (_, level) => {
        const radius = (reach * (level + 1)) / levels
        return contour(cx, cy, radius, harmonics, level * 0.06)
      })
      return { cx, cy, paths, key: index }
    })
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-topo-lines absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-topo-lines-color,color-mix(in_oklab,var(--kg-ink)_16%,transparent))] [--_accent:var(--kg-topo-lines-accent,color-mix(in_oklab,var(--kg-ink)_70%,transparent))]",
          className,
          wrapper,
        )}
        data-mask={mask}
        data-animated={animated || undefined}
        style={
          {
            ...(color ? { "--kg-topo-lines-color": color } : null),
            ...(accentColor ? { "--kg-topo-lines-accent": accentColor } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-topo-lines__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <svg
            className="block size-full"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            {groups.map((group) => (
              <g
                key={group.key}
                className="kg-topo-lines__summit"
                style={{
                  transformOrigin: `${round(group.cx, 1)}px ${round(group.cy, 1)}px`,
                }}
              >
                {group.paths.map((d, level) => (
                  <path
                    key={level}
                    d={d}
                    className="kg-topo-lines__line fill-none stroke-(--_c) [stroke-width:1] [vector-effect:non-scaling-stroke] data-index:stroke-(--_accent) data-index:[stroke-width:1.4]"
                    data-index={(level + 1) % 5 === 0 || undefined}
                  />
                ))}
              </g>
            ))}
          </svg>
        </div>
        {wrapper && <div className="kg-topo-lines__content relative z-1">{children}</div>}
      </div>
    )
  },
)

TopoLines.displayName = "TopoLines"
