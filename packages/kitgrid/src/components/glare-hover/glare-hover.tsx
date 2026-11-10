import { type CSSProperties, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"

export interface GlareHoverProps extends HTMLAttributes<HTMLDivElement> {
  /** Direction of the sheen band, in degrees. */
  angle?: number
  /** Time for one sweep, in ms. */
  duration?: number
  /** Width of the bright band, as a percentage of the surface. */
  size?: number
  /** Sweep back when the pointer leaves, instead of resetting silently. */
  reverse?: boolean
}

/**
 * A surface that catches a band of light sweeping across it when hovered or focused within.
 * Pure CSS on a pseudo element, so it is server-safe and never covers the content's events.
 */
export const GlareHover = forwardRef<HTMLDivElement, GlareHoverProps>(
  (
    { angle = -45, duration = 750, size = 28, reverse = false, className, style, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={cx("kg-glare-hover relative isolate overflow-hidden rounded-kg-xl", className)}
      data-reverse={reverse || undefined}
      style={
        {
          "--_angle": `${angle}deg`,
          "--_duration": `${duration}ms`,
          "--_size": `${size}%`,
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  ),
)

GlareHover.displayName = "GlareHover"
