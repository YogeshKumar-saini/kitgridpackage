import { forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { type BoxSpace, space, vars } from "../box/space.js"

export interface SpacerProps extends HTMLAttributes<HTMLDivElement> {
  /** A fixed gap. Without it the spacer takes all free space in a flex row or column. */
  size?: BoxSpace
  /** The direction a fixed gap runs: `block` is vertical, `inline` horizontal. */
  axis?: "block" | "inline"
}

/** Empty room: a fixed gap, or a flexible one that pushes siblings apart. */
export const Spacer = forwardRef<HTMLDivElement, SpacerProps>(
  ({ size, axis = "block", className, style, ...props }, ref) => {
    const fixed = size !== undefined
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cx(
          "kg-spacer self-stretch",
          !fixed && "flex-[1_1_0]",
          fixed && "shrink-0 grow-0 basis-(--_size)",
          fixed && (axis === "inline" ? "inline-block w-(--_size)" : "h-(--_size)"),
          className,
        )}
        data-axis={axis}
        data-fixed={fixed ? "" : undefined}
        style={{ ...vars({ "--_size": space(size) }), ...style }}
        {...props}
      />
    )
  },
)

Spacer.displayName = "Spacer"
