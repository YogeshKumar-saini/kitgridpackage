import { type CSSProperties, type ElementType, forwardRef, type HTMLAttributes } from "react"
import { Slot } from "../../primitives/slot.js"
import { cx } from "../../utils/cx.js"

export type TextSize = "xs" | "sm" | "base" | "md" | "lg" | "xl"
export type TextTone =
  | "default"
  | "muted"
  | "faint"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
export type TextWeight = "regular" | "medium" | "semibold" | "bold"
export type TextLeading = "tight" | "normal" | "relaxed"

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** A `p` by default; `span` for inline runs. */
  as?: ElementType
  asChild?: boolean
  size?: TextSize
  tone?: TextTone
  weight?: TextWeight
  leading?: TextLeading
  align?: "start" | "center" | "end"
  /** One line, cut with an ellipsis. */
  truncate?: boolean
  /** Clamps to this many lines with an ellipsis. */
  lines?: number
  mono?: boolean
  /** Equal-width digits, for figures that line up. */
  tabular?: boolean
}

const SIZE: Record<TextSize, string> = {
  xs: "text-kg-xs",
  sm: "text-kg-sm",
  base: "text-kg-base",
  md: "text-kg-md",
  lg: "text-kg-lg",
  xl: "text-(length:--kg-text-xl) tracking-[-0.01em]",
}

const SIZE_LEADING: Record<TextSize, string> = {
  xs: "leading-[1.5]",
  sm: "leading-[1.5]",
  base: "leading-[1.55]",
  md: "leading-[1.55]",
  lg: "leading-[1.5]",
  xl: "leading-[1.4]",
}

const LEADING: Record<TextLeading, string> = {
  tight: "leading-[1.3]",
  normal: "",
  relaxed: "leading-[1.75]",
}

/* Status hues are pulled toward the text color, so they stay readable in both themes. */
const TONE: Record<TextTone, string> = {
  default: "text-kg-fg",
  muted: "text-kg-fg-muted",
  faint: "text-kg-fg-faint",
  accent: "text-kg-accent-strong",
  success: "text-[color-mix(in_oklab,var(--kg-success)_70%,var(--kg-fg))]",
  warning: "text-[color-mix(in_oklab,var(--kg-warning)_55%,var(--kg-fg))]",
  danger: "text-[color-mix(in_oklab,var(--kg-danger)_72%,var(--kg-fg))]",
  info: "text-[color-mix(in_oklab,var(--kg-info)_70%,var(--kg-fg))]",
}

const WEIGHT: Record<TextWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
}

const ALIGN = { start: "text-start", center: "text-center", end: "text-end" }

/** Body text on the type scale, with tone, weight, truncation and line clamping. */
export const Text = forwardRef<HTMLElement, TextProps>(
  (
    {
      as: Tag = "p",
      asChild = false,
      size = "base",
      tone = "default",
      weight,
      leading,
      align,
      truncate = false,
      lines,
      mono = false,
      tabular = false,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const Component: ElementType = asChild ? Slot : Tag
    return (
      <Component
        ref={ref}
        className={cx(
          "kg-text m-0 text-pretty",
          mono ? "font-kg-mono text-[0.94em]" : SIZE[size],
          leading && leading !== "normal" ? LEADING[leading] : SIZE_LEADING[size],
          TONE[tone],
          weight && WEIGHT[weight],
          align && ALIGN[align],
          truncate && "truncate",
          lines ? "line-clamp-(--_lines)" : null,
          tabular && "tabular-nums",
          className,
        )}
        data-size={size}
        data-tone={tone === "default" ? undefined : tone}
        data-weight={weight}
        data-leading={leading}
        data-align={align}
        data-truncate={truncate || undefined}
        data-clamp={lines ? "" : undefined}
        data-mono={mono || undefined}
        data-tabular={tabular || undefined}
        style={lines ? ({ "--_lines": lines, ...style } as CSSProperties) : style}
        {...props}
      />
    )
  },
)

Text.displayName = "Text"
