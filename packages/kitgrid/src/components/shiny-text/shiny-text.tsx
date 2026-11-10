import {
  type CSSProperties,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
} from "react"
import { cx } from "../../utils/cx.js"
import type { TextEffectElement } from "../text-reveal/split-text.js"

export interface ShinyTextProps extends HTMLAttributes<HTMLElement> {
  as?: TextEffectElement
  /** One sweep plus the rest before the next, in ms. Lower is faster. */
  duration?: number
  /** Width of the light band, as a percentage of the text's width. */
  width?: number
  /** Any CSS color. Defaults to the muted foreground. */
  baseColor?: string
  /** Any CSS color. Defaults to the foreground, so it reads as light in both themes. */
  shineColor?: string
  /** Render plain text in the base color without the sweep. */
  disabled?: boolean
}

/**
 * A band of light that sweeps across text through `background-clip: text`. Pure CSS, server
 * component safe, and still under reduced motion.
 */
export const ShinyText = forwardRef<HTMLElement, ShinyTextProps>(
  (
    {
      as = "span",
      duration = 2800,
      width = 32,
      baseColor,
      shineColor,
      disabled = false,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const Tag = as as ElementType
    return (
      <Tag
        ref={ref}
        className={cx(
          "kg-shiny-text -my-[0.08em] py-[0.08em] text-(--_base) bg-clip-text [-webkit-text-fill-color:transparent]",
          "[--_base:var(--kg-shiny-base,var(--kg-fg-muted))] [--_shine:var(--kg-shiny-shine,var(--kg-fg))]",
          "animate-[kg-shiny-text_var(--_duration,2800ms)_var(--kg-ease-in-out)_infinite] rtl:[animation-direction:reverse]",
          className,
        )}
        data-disabled={disabled || undefined}
        style={
          {
            "--_duration": `${duration}ms`,
            "--_band": Math.min(Math.max(width, 1), 100) / 100,
            ...(baseColor ? { "--kg-shiny-base": baseColor } : null),
            ...(shineColor ? { "--kg-shiny-shine": shineColor } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    )
  },
)

ShinyText.displayName = "ShinyText"
