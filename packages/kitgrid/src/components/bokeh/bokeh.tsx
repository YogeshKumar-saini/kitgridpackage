import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom, round } from "../aurora/internal/random.js"

export type BokehMask = BackdropMask

export interface BokehProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of discs, 3–40. */
  count?: number
  /** CSS colors the discs cycle through. Defaults to sage and peach paper and ink. */
  colors?: readonly string[]
  /** Smallest and largest disc, as a fraction of the larger side. */
  size?: readonly [min: number, max: number]
  /** Drift speed multiplier; 0 holds them still. */
  speed?: number
  /** Same seed, same discs. */
  seed?: number
  mask?: BokehMask
  children?: ReactNode
}

const DEFAULT_COLORS = [
  "var(--kg-paper-sage)",
  "var(--kg-paper-peach)",
  "color-mix(in oklab, var(--kg-ink) 30%, transparent)",
] as const

/**
 * Out-of-focus discs of light floating in front of the lens. Seeded positions, sizes and drift,
 * all on transform and opacity loops. Server-component safe.
 */
export const Bokeh = forwardRef<HTMLDivElement, BokehProps>(
  (
    {
      count = 16,
      colors = DEFAULT_COLORS,
      size = [0.04, 0.16],
      speed = 1,
      seed = 9,
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
    const total = Math.round(Math.min(Math.max(count, 3), 40))
    const [min, max] = size
    const palette = colors.length ? colors : DEFAULT_COLORS
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-bokeh absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            "--kg-bokeh-speed": Math.max(speed, 0.001),
            "--kg-bokeh-state": speed === 0 ? "paused" : "running",
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-bokeh__layer pointer-events-none absolute inset-0 z-0 overflow-hidden [container-type:size]" aria-hidden="true">
          {Array.from({ length: total }, (_, index) => {
            const depth = random()
            return (
              <span
                key={index}
                className="kg-bokeh__disc absolute aspect-square w-[calc(var(--_size)*100cqmax)] -translate-1/2 rounded-full opacity-(--_alpha) will-change-transform"
                style={
                  {
                    left: `${round(random() * 100, 2)}%`,
                    top: `${round(random() * 100, 2)}%`,
                    "--_size": round(min + (max - min) * depth ** 1.5, 4),
                    "--_c": palette[index % palette.length],
                    "--_alpha": round(0.18 + random() * 0.4),
                    "--_dur": `${round(14 + random() * 16, 2)}s`,
                    "--_delay": `${round(-random() * 30, 2)}s`,
                    "--_dx": `${round((random() - 0.5) * 16, 2)}cqw`,
                    "--_dy": `${round(-4 - random() * 12, 2)}cqh`,
                  } as CSSProperties
                }
              />
            )
          })}
        </div>
        {wrapper && <div className="kg-bokeh__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Bokeh.displayName = "Bokeh"
