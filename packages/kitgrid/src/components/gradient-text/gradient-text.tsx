import {
  type CSSProperties,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
} from "react"
import { cx } from "../../utils/cx.js"
import type { TextEffectElement } from "../text-reveal/split-text.js"

export interface GradientTextProps extends HTMLAttributes<HTMLElement> {
  as?: TextEffectElement
  /**
   * Any CSS colors, in order. Defaults to ink flowing through peach and sky pulled toward the text
   * colour, so the gradient follows the paper palette and the theme.
   */
  colors?: string[]
  /** Gradient direction, in degrees. */
  angle?: number
  /** One pass across the gradient, in ms. */
  duration?: number
  /** Drift the gradient back and forth. Off renders a static gradient. */
  animate?: boolean
}

/*
 * Display text needs large-text contrast, so the peach and sky stops are pulled more than half
 * way toward the text colour.
 */
const gradientClass = [
  "kg-gradient-text -my-[0.08em] py-[0.08em] text-kg-accent-strong bg-clip-text [-webkit-text-fill-color:transparent]",
  "[--_c1:var(--kg-accent-strong)] [--_c2:color-mix(in_oklab,var(--kg-paper-peach),var(--kg-fg)_58%)] [--_c3:color-mix(in_oklab,var(--kg-paper-sky),var(--kg-fg)_55%)]",
  "bg-[linear-gradient(var(--_angle,90deg),var(--kg-gradient-colors,var(--_c1),var(--_c2),var(--_c3),var(--_c1)))] bg-size-[100%_100%] bg-[position:0%_50%]",
  "data-animate:bg-size-[300%_100%] data-animate:animate-[kg-gradient-text_var(--_duration,6000ms)_var(--kg-ease-in-out)_infinite_alternate]",
  "motion-reduce:animate-none in-data-[kg-motion=reduce]:animate-none",
  "forced-colors:bg-none forced-colors:[-webkit-text-fill-color:currentColor]",
].join(" ")

/** Text filled with a slowly drifting multi-stop gradient. Pure CSS, server component safe. */
export const GradientText = forwardRef<HTMLElement, GradientTextProps>(
  (
    {
      as = "span",
      colors,
      angle = 90,
      duration = 6000,
      animate = true,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const Tag = as as ElementType
    // Ending on the first colour lets the alternating drift turn around without a visible seam.
    const stops =
      colors && colors.length > 0 ? [...colors, colors[0]].join(", ") : undefined

    return (
      <Tag
        ref={ref}
        className={cx(gradientClass, className)}
        data-animate={animate || undefined}
        style={
          {
            "--_angle": `${angle}deg`,
            "--_duration": `${duration}ms`,
            ...(stops ? { "--kg-gradient-colors": stops } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    )
  },
)

GradientText.displayName = "GradientText"
