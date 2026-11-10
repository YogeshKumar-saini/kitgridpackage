import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useId,
} from "react"
import {
  type BackdropMask,
  backdropRoot,
  hasChildren,
  svgId,
} from "../aurora/internal/backdrop.js"
import { createRandom, round } from "../aurora/internal/random.js"

export type BackgroundBeamsMask = BackdropMask

export interface BackgroundBeamsProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of beams. */
  count?: number
  /**
   * Up to three CSS colors the travelling light shifts through across the frame. Defaults to ink,
   * sage paper and peach paper.
   */
  colors?: readonly string[]
  /** Average seconds for a light to run the length of its beam. */
  duration?: number
  /** Width of the light, in viewBox units (the frame is 1200 wide). */
  strokeWidth?: number
  /** Seeds the beam shapes and light timings. */
  seed?: number
  /** Fade the beams out toward the edges. */
  mask?: BackgroundBeamsMask
  /** Optional content, painted above the beams. */
  children?: ReactNode
}

const WIDTH = 1200
const HEIGHT = 700

/**
 * One smooth two-segment cubic per beam. The second segment's first control point mirrors the
 * first segment's last, so the curve stays tangent-continuous through its midpoint.
 */
const beamPath = (
  index: number,
  spacing: number,
  jitterX: number,
  jitterY: number,
): string => {
  const ox = index * spacing
  const oy = -index * spacing * 0.72
  const sx = round(-520 + ox, 1)
  const sy = round(-240 + oy, 1)
  const mx = round(170 + ox + jitterX, 1)
  const my = round(420 + oy + jitterY, 1)
  const ex = round(880 + ox, 1)
  const ey = round(1120 + oy, 1)
  return (
    `M${sx} ${sy}C${sx} ${sy} ${round(mx - 580, 1)} ${round(my - 190, 1)} ${mx} ${my}` +
    `C${round(mx + 580, 1)} ${round(my + 190, 1)} ${ex} ${ey} ${ex} ${ey}`
  )
}

/**
 * Gently curved beams with light running along them: each light is a single dash on a path
 * normalised with `pathLength`, travelling through a gradient that spans the frame. CSS keyframes
 * only, server-component safe; under reduced motion each light rests at a seeded point.
 */
export const BackgroundBeams = forwardRef<HTMLDivElement, BackgroundBeamsProps>(
  (
    {
      count = 32,
      colors,
      duration = 9,
      strokeWidth = 1.5,
      seed = 11,
      mask = "radial",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const id = svgId("kg-beams", useId())
    const [c1, c2, c3] = colors ?? []
    const total = Math.max(Math.round(count), 0)
    const spacing = total > 1 ? 820 / total : 0
    const random = createRandom(seed)
    const cycle = Math.max(duration, 0.5)

    const beams = Array.from({ length: total }, (_, index) => {
      const d = beamPath(index, spacing, (random() - 0.5) * 60, (random() - 0.5) * 50)
      const length = round(cycle * (0.6 + random() * 0.8), 2)
      const delay = round(random() * cycle * 0.8, 2)
      const rest = round(-random() * 0.75, 3)
      return { d, length, delay, rest }
    })

    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-background-beams absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:overflow-visible data-wrapper:isolate data-wrapper:pointer-events-auto [--_c1:var(--kg-beams-color-1,var(--kg-ink))] [--_c2:var(--kg-beams-color-2,var(--kg-paper-sage))] [--_c3:var(--kg-beams-color-3,var(--kg-paper-peach))]",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            ...(c1 ? { "--kg-beams-color-1": c1 } : null),
            ...(c2 ? { "--kg-beams-color-2": c2 } : null),
            ...(c3 ? { "--kg-beams-color-3": c3 } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div
          className="kg-background-beams__layer pointer-events-none absolute inset-0 z-0 overflow-hidden"
          aria-hidden="true"
        >
          <svg
            className="kg-background-beams__svg absolute inset-0 block size-full"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id={id}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2={WIDTH}
                y2={HEIGHT}
              >
                <stop
                  offset="0"
                  className="kg-background-beams__stop [stop-color:var(--_c1)]"
                  data-stop="1"
                />
                <stop
                  offset="0.5"
                  className="kg-background-beams__stop [stop-color:var(--_c2)]"
                  data-stop="2"
                />
                <stop
                  offset="1"
                  className="kg-background-beams__stop [stop-color:var(--_c3)]"
                  data-stop="3"
                />
              </linearGradient>
            </defs>
            <g className="kg-background-beams__tracks stroke-[color-mix(in_oklab,var(--kg-fg)_9%,transparent)] stroke-1">
              {beams.map((beam, index) => (
                <path key={index} d={beam.d} />
              ))}
            </g>
            <g
              className="kg-background-beams__lights"
              stroke={`url(#${id})`}
              strokeWidth={Math.max(strokeWidth, 0)}
            >
              {beams.map((beam, index) => (
                <path
                  key={index}
                  d={beam.d}
                  pathLength={1}
                  style={
                    {
                      animationDuration: `${beam.length}s`,
                      animationDelay: `${beam.delay}s`,
                      "--_rest": beam.rest,
                    } as CSSProperties
                  }
                />
              ))}
            </g>
          </svg>
        </div>
        {wrapper && (
          <div className="kg-background-beams__content relative z-1">{children}</div>
        )}
      </div>
    )
  },
)

BackgroundBeams.displayName = "BackgroundBeams"
