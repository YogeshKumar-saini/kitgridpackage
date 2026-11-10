import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { type BoxSpace, space, vars } from "../box/space.js"

export type ContainerSize = "sm" | "md" | "lg" | "xl" | "2xl" | "prose" | "full"

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  size?: ContainerSize
  /** Side padding. Grows with the viewport, from 1rem to 2.5rem, when omitted. */
  gutter?: BoxSpace
}

const MAX: Record<ContainerSize, string> = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  "2xl": "96rem",
  prose: "68ch",
  full: "none",
}

const FLUID_GUTTER = "clamp(1rem, 4vw, 2.5rem)"

/**
 * The page column: a centred maximum width with side padding. It is also a size container, so
 * a `Grid` or `Show` inside responds to its width.
 */
export const Container = forwardRef<HTMLElement, ContainerProps>(
  ({ as: Tag = "div", size = "lg", gutter, className, style, ...props }, ref) => {
    const max = MAX[size] ?? MAX.lg
    return (
      <Tag
        ref={ref}
        className={cx(
          "kg-container @container mx-auto box-border w-full max-w-(--_max)",
          "px-[var(--_gutter,clamp(1rem,4vw,2.5rem))]",
          className,
        )}
        data-size={size}
        style={{
          ...vars({
            "--_gutter": space(gutter),
            "--_max":
              max === "none"
                ? "none"
                : `calc(${max} + ${space(gutter) ?? FLUID_GUTTER} * 2)`,
          }),
          ...style,
        }}
        {...props}
      />
    )
  },
)

Container.displayName = "Container"
