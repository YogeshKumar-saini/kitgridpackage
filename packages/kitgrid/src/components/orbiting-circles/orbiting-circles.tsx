import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"

export interface OrbitingCirclesProps extends HTMLAttributes<HTMLDivElement> {
  /** The satellites, spaced evenly around the orbit. */
  children: ReactNode
  /** Content pinned at the centre, such as a logo. */
  center?: ReactNode
  /** Orbit radius, in px. */
  radius?: number
  /** One revolution, in seconds. */
  duration?: number
  reverse?: boolean
  /** Draw the orbit track. */
  path?: boolean
}

/**
 * Satellites circling a centre on an orbit, each kept upright by a counter-rotation. Stack
 * several with different radii for a system. Pure CSS: server-safe, and still under reduced
 * motion.
 */
export const OrbitingCircles = forwardRef<HTMLDivElement, OrbitingCirclesProps>(
  (
    {
      children,
      center,
      radius = 120,
      duration = 24,
      reverse = false,
      path = true,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const items = Children.toArray(children)
    return (
      <div
        ref={ref}
        className={cx(
          "kg-orbiting-circles relative grid aspect-square w-[calc(var(--_r)_*_2_+_var(--_size))] max-w-full place-items-center [--_size:var(--kg-orbiting-circles-item,2.75rem)]",
          className,
        )}
        data-reverse={reverse || undefined}
        style={
          {
            "--_r": `${radius}px`,
            "--_duration": `${duration}s`,
            "--_n": Math.max(items.length, 1),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {path ? <span
            className="kg-orbiting-circles__path pointer-events-none absolute aspect-square w-[calc(var(--_r)*2)] rounded-full border border-dashed border-kg-border-strong"
            aria-hidden="true"
          /> : null}
        {center !== undefined ? (
          <div className="kg-orbiting-circles__center relative z-1 grid place-items-center">{center}</div>
        ) : null}
        <div
          className={cx(
            "kg-orbiting-circles__ring absolute inset-0 motion-reduce:animate-none [[data-kg-motion=reduce]_&]:animate-none",
            reverse
              ? "animate-[kg-orbit_var(--_duration)_linear_infinite_reverse]"
              : "animate-[kg-orbit_var(--_duration)_linear_infinite]",
          )}
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="kg-orbiting-circles__slot absolute top-[calc(50%_-_var(--_size)_/_2)] left-[calc(50%_-_var(--_size)_/_2)] size-(--_size) rotate-[calc(var(--_i)_*_360deg_/_var(--_n))] [transform:translateX(var(--_r))]"
              style={{ "--_i": i } as CSSProperties}
            >
              <div
                className={cx(
                  "kg-orbiting-circles__item grid size-full rotate-[calc(var(--_i)_*_-360deg_/_var(--_n))] place-items-center rounded-full border-2 border-kg-ink bg-kg-surface-raised text-kg-fg shadow-kg-xs motion-reduce:animate-none [[data-kg-motion=reduce]_&]:animate-none [&_svg]:size-[45%]",
                  reverse
                    ? "animate-[kg-orbit_var(--_duration)_linear_infinite]"
                    : "animate-[kg-orbit_var(--_duration)_linear_infinite_reverse]",
                )}
              >
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
)

OrbitingCircles.displayName = "OrbitingCircles"
