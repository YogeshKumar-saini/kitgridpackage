import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { round } from "../aurora/internal/random.js"

export type RippleGridMask = BackdropMask

export interface RippleGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Columns, 4–40. */
  columns?: number
  /** Rows, 2–24. */
  rows?: number
  /** Any CSS color for the wave. Defaults to ink. */
  color?: string
  /** Seconds between rings. */
  interval?: number
  /** Where the ripple starts, 0–1 across and down. */
  origin?: readonly [x: number, y: number]
  mask?: RippleGridMask
  children?: ReactNode
}

const MAX_CELLS = 640

/**
 * A grid of hairline cells with a ring of light rippling out from one point. Every cell runs the
 * same keyframes, delayed by its distance from the origin, so the wave is pure CSS. Server safe.
 */
export const RippleGrid = forwardRef<HTMLDivElement, RippleGridProps>(
  (
    {
      columns = 24,
      rows = 12,
      color,
      interval = 4,
      origin = [0.5, 0.5],
      mask = "radial",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    let cols = Math.round(Math.min(Math.max(columns, 4), 40))
    let lines = Math.round(Math.min(Math.max(rows, 2), 24))
    while (cols * lines > MAX_CELLS) {
      cols = Math.max(4, cols - 1)
      lines = Math.max(2, lines - 1)
    }
    const [ox, oy] = origin
    const far = Math.hypot(Math.max(ox, 1 - ox) * cols, Math.max(oy, 1 - oy) * lines) || 1
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-ripple-grid absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-ripple-grid-color,var(--kg-ink))] [--_interval:var(--kg-ripple-grid-interval,4s)]",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            ...(color ? { "--kg-ripple-grid-color": color } : null),
            "--kg-ripple-grid-interval": `${Math.max(interval, 0.5)}s`,
            "--_cols": cols,
            "--_rows": lines,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-ripple-grid__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="kg-ripple-grid__cells absolute -inset-px grid grid-cols-[repeat(var(--_cols),1fr)] grid-rows-[repeat(var(--_rows),1fr)]">
            {Array.from({ length: cols * lines }, (_, index) => {
              const x = (index % cols) + 0.5 - ox * cols
              const y = Math.floor(index / cols) + 0.5 - oy * lines
              return (
                <span
                  key={index}
                  className="kg-ripple-grid__cell relative border-r border-b border-[color-mix(in_oklab,var(--kg-border)_70%,transparent)]"
                  style={{ "--_d": round(Math.hypot(x, y) / far) } as CSSProperties}
                />
              )
            })}
          </div>
        </div>
        {wrapper && <div className="kg-ripple-grid__content relative z-1">{children}</div>}
      </div>
    )
  },
)

RippleGrid.displayName = "RippleGrid"
