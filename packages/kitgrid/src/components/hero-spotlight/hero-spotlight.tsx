import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export type HeroSpotlightOrigin = "top-left" | "top-right" | "top"

export interface HeroSpotlightProps extends HTMLAttributes<HTMLDivElement> {
  /** Any CSS color for the main beam. Defaults to the sage paper. */
  color?: string
  /** Color of the narrower, brighter core beam, or `false` to drop it. */
  fill?: string | false
  /** Corner the light comes from. */
  origin?: HeroSpotlightOrigin
  /**
   * Beam direction in degrees, clockwise from pointing right (mirrored for `top-right`).
   * Defaults to 28 from a corner and 90 from the top.
   */
  angle?: number
  /** Seconds before the sweep starts. */
  delay?: number
  /** Length of the sweep, in seconds. */
  duration?: number
  /** Optional content, painted above the light. */
  children?: ReactNode
}

/**
 * A large, soft beam of light that sweeps in from a corner on mount and settles into a static
 * glow. Its resting styles are the final frame, so reduced motion simply shows the settled light.
 * Server-component safe.
 */
export const HeroSpotlight = forwardRef<HTMLDivElement, HeroSpotlightProps>(
  (
    {
      color,
      fill,
      origin = "top-left",
      angle,
      delay = 0.25,
      duration = 2,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const direction = angle ?? (origin === "top" ? 90 : 28)
    const beam = cx(
      "absolute top-0 origin-top-left rounded-full will-change-[transform,opacity]",
      origin === "top" ? "left-1/2" : "left-0",
    )

    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-hero-spotlight absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:overflow-visible data-wrapper:isolate data-wrapper:pointer-events-auto [--_color:var(--kg-hero-spotlight-color,var(--kg-paper-sage))] [--_fill:var(--kg-hero-spotlight-fill,color-mix(in_oklab,var(--kg-ink)_18%,transparent))]",
          className,
          wrapper,
        )}
        data-origin={origin}
        style={
          {
            ...(color ? { "--kg-hero-spotlight-color": color } : null),
            ...(fill ? { "--kg-hero-spotlight-fill": fill } : null),
            "--kg-hero-spotlight-angle": `${direction}deg`,
            "--kg-hero-spotlight-delay": `${Math.max(delay, 0)}s`,
            "--kg-hero-spotlight-duration": `${Math.max(duration, 0)}s`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div
          className={cx(
            "kg-hero-spotlight__layer pointer-events-none absolute inset-0 z-0 overflow-hidden [container-type:size]",
            origin === "top-right" && "[scale:-1_1]",
          )}
          aria-hidden="true"
        >
          <div className={cx(beam, "kg-hero-spotlight__beam h-[38cqmax] w-[135cqmax]")} />
          {fill !== false && (
            <div className={cx(beam, "kg-hero-spotlight__core h-[13cqmax] w-[110cqmax]")} />
          )}
        </div>
        {wrapper && <div className="kg-hero-spotlight__content relative z-1">{children}</div>}
      </div>
    )
  },
)

HeroSpotlight.displayName = "HeroSpotlight"
