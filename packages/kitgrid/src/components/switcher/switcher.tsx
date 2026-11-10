import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { type BoxAlign, type BoxSpace, alignValue, space, vars } from "../box/space.js"

export interface SwitcherProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  /** Below this container width every child takes a full row. Any CSS length. */
  threshold?: string
  gap?: BoxSpace
  align?: BoxAlign
}

/**
 * Children side by side in equal columns, or all stacked once the container is narrower than
 * `threshold`. No breakpoints: it reacts to its own width, wherever it is placed. Each child
 * gets a huge positive basis below the threshold and a huge negative one above, so all wrap
 * or none do.
 */
export const Switcher = forwardRef<HTMLElement, SwitcherProps>(
  (
    { as: Tag = "div", threshold = "30rem", gap = 4, align, className, style, ...props },
    ref,
  ) => (
    <Tag
      ref={ref}
      className={cx(
        "kg-switcher m-0 flex min-w-0 list-none flex-wrap p-0",
        "[align-items:var(--_align,stretch)] gap-[var(--_gap,calc(var(--kg-space)*4))]",
        "*:min-w-0 *:grow *:basis-[calc((var(--_threshold,30rem)-100%)*999)]",
        className,
      )}
      style={{
        ...vars({
          "--_threshold": threshold,
          "--_gap": space(gap),
          "--_align": alignValue(align),
        }),
        ...style,
      }}
      {...props}
    />
  ),
)

Switcher.displayName = "Switcher"
