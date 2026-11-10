import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export type StripesMask = BackdropMask

export interface StripesProps extends HTMLAttributes<HTMLDivElement> {
  /** Any CSS color. Defaults to a faint ink. */
  color?: string
  /** Stripe angle, in degrees. */
  angle?: number
  /** Stripe thickness, in px. */
  width?: number
  /** Space between stripes, in px. */
  gap?: number
  /** Scroll speed multiplier; 0 holds them still. */
  speed?: number
  mask?: StripesMask
  children?: ReactNode
}

/**
 * Hairline diagonal stripes that scroll along their own axis, like a caution band or a loading
 * surface. One repeating gradient whose position slides by exactly one period per loop. Server-component safe.
 */
export const Stripes = forwardRef<HTMLDivElement, StripesProps>(
  (
    {
      color,
      angle = -45,
      width = 1,
      gap = 10,
      speed = 1,
      mask = "radial",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const stripe = Math.max(width, 0.5)
    const period = stripe + Math.max(gap, 1)
    // Shifting by exactly one period along the gradient line lands on an identical frame.
    const radians = (angle * Math.PI) / 180
    const dx = Math.round(Math.sin(radians) * period * 1000) / 1000
    const dy = Math.round(-Math.cos(radians) * period * 1000) / 1000
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-stripes absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-stripes-color,color-mix(in_oklab,var(--kg-ink)_14%,transparent))] [--_period:var(--kg-stripes-period,11px)]",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            ...(color ? { "--kg-stripes-color": color } : null),
            "--kg-stripes-angle": `${angle}deg`,
            "--kg-stripes-width": `${stripe}px`,
            "--kg-stripes-period": `${period}px`,
            "--kg-stripes-shift-x": `${dx}px`,
            "--kg-stripes-shift-y": `${dy}px`,
            "--kg-stripes-speed": Math.max(speed, 0.001),
            "--kg-stripes-state": speed === 0 ? "paused" : "running",
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-stripes__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="kg-stripes__band absolute inset-0" />
        </div>
        {wrapper && <div className="kg-stripes__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Stripes.displayName = "Stripes"
