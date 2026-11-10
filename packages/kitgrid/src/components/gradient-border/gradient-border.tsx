import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"

export interface GradientBorderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Up to three CSS colors for the edge. Defaults to ink fading through sage paper into the
   * border, so the light reads as one source travelling around the card.
   */
  colors?: readonly string[]
  /** Border thickness, in px. */
  width?: number
  /** Turn the gradient around the edge. Stops under reduced motion. */
  animated?: boolean
  /** Seconds per lap. */
  duration?: number
  /** A soft shadow under the surface, tinted by the first color. */
  glow?: boolean
  children?: ReactNode
}

const base = [
  "kg-gradient-border relative rounded-kg-xl border-[length:var(--kg-gradient-border-width,1px)] border-solid border-transparent text-kg-fg shadow-kg-sm",
  "[--_c1:var(--kg-gradient-border-color-1,var(--kg-ink))]",
  "[--_c2:var(--kg-gradient-border-color-2,var(--kg-paper-sage))]",
  "[--_c3:var(--kg-gradient-border-color-3,var(--kg-border))]",
  "data-glow:shadow-[var(--kg-shadow-md),0_18px_40px_-22px_color-mix(in_oklab,var(--_c1)_55%,transparent)]",
].join(" ")

/**
 * A card surface whose edge is a conic gradient that orbits the border. The fill and the edge
 * are two backgrounds on one element (`padding-box` over `border-box`), so there is no extra
 * markup and content needs no z-index. Server-component safe.
 */
export const GradientBorder = forwardRef<HTMLDivElement, GradientBorderProps>(
  (
    {
      colors,
      width = 1,
      animated = true,
      duration = 6,
      glow = false,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const [c1, c2, c3] = colors ?? []
    return (
      <div
        ref={ref}
        className={cx(base, className)}
        data-animated={animated || undefined}
        data-glow={glow || undefined}
        style={
          {
            ...(c1 ? { "--kg-gradient-border-color-1": c1 } : null),
            ...(c2 ? { "--kg-gradient-border-color-2": c2 } : null),
            ...(c3 ? { "--kg-gradient-border-color-3": c3 } : null),
            "--kg-gradient-border-width": `${Math.max(width, 0.5)}px`,
            "--kg-gradient-border-duration": `${Math.max(duration, 0.5)}s`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    )
  },
)

GradientBorder.displayName = "GradientBorder"
