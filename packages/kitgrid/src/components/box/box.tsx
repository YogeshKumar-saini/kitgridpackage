import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { Slot } from "../../primitives/slot.js"
import { cx } from "../../utils/cx.js"
import { type BoxSpace, space, vars } from "./space.js"

export type BoxSurface = "none" | "surface" | "raised" | "sunken" | "muted" | "accent"
export type BoxRadius = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full"
export type BoxShadow = "none" | "xs" | "sm" | "md" | "lg"

export interface BoxProps extends HTMLAttributes<HTMLElement> {
  /** The element to render. */
  as?: ElementType
  /** Merges the box onto its only child instead of rendering an element. */
  asChild?: boolean
  /** Padding on every side: a spacing step or a CSS length. */
  padding?: BoxSpace
  paddingX?: BoxSpace
  paddingY?: BoxSpace
  surface?: BoxSurface
  radius?: BoxRadius
  /** A hairline border; `strong` draws the 2px ink edge of a paper sheet. */
  border?: boolean | "strong"
  shadow?: BoxShadow
}

const SURFACE: Record<BoxSurface, string> = {
  none: "",
  surface: "bg-kg-surface",
  raised: "bg-kg-surface-raised",
  sunken: "bg-kg-surface-sunken",
  muted: "bg-kg-muted",
  accent: "bg-kg-paper-sage text-kg-fg",
}

const RADIUS: Record<BoxRadius, string> = {
  none: "rounded-none",
  sm: "rounded-kg-sm",
  md: "rounded-kg-md",
  lg: "rounded-kg-lg",
  xl: "rounded-kg-xl",
  "2xl": "rounded-kg-2xl",
  full: "rounded-full",
}

const SHADOW: Record<BoxShadow, string> = {
  none: "",
  xs: "shadow-kg-xs",
  sm: "shadow-kg-sm",
  md: "shadow-kg-md",
  lg: "shadow-kg-lg",
}

/** The base layout block: padding, surface, radius, border and shadow from tokens. */
export const Box = forwardRef<HTMLElement, BoxProps>(
  (
    {
      as: Tag = "div",
      asChild = false,
      padding,
      paddingX,
      paddingY,
      surface,
      radius,
      border,
      shadow,
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
          "kg-box box-border min-w-0 py-[var(--_py,var(--_p,0))] px-[var(--_px,var(--_p,0))]",
          surface && SURFACE[surface],
          radius && RADIUS[radius],
          border === "strong" ? "border-2 border-kg-ink" : border && "border border-kg-border",
          shadow && SHADOW[shadow],
          className,
        )}
        data-surface={surface && surface !== "none" ? surface : undefined}
        data-radius={radius}
        data-border={border === true ? "" : border || undefined}
        data-shadow={shadow && shadow !== "none" ? shadow : undefined}
        style={{
          ...vars({
            "--_p": space(padding),
            "--_px": space(paddingX),
            "--_py": space(paddingY),
          }),
          ...style,
        }}
        {...props}
      />
    )
  },
)

Box.displayName = "Box"
