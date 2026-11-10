import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { Slot } from "../../primitives/slot.js"
import { cx } from "../../utils/cx.js"
import {
  type BoxAlign,
  type BoxJustify,
  type BoxSpace,
  alignValue,
  justifyValue,
  space,
  vars,
} from "../box/space.js"

export interface ClusterProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  asChild?: boolean
  /** Space between items on a line. */
  gap?: BoxSpace
  /** Space between wrapped lines. Same as `gap` when omitted. */
  rowGap?: BoxSpace
  align?: BoxAlign
  justify?: BoxJustify
}

/** Items of any width that wrap as they need to, such as tags, buttons or meta. */
export const Cluster = forwardRef<HTMLElement, ClusterProps>(
  (
    {
      as: Tag = "div",
      asChild = false,
      gap = 2,
      rowGap,
      align = "center",
      justify = "start",
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
          "kg-cluster m-0 flex min-w-0 list-none flex-wrap p-0",
          "[align-items:var(--_align,center)] [justify-content:var(--_justify,flex-start)]",
          "gap-x-[var(--_gap,calc(var(--kg-space)*2))] gap-y-[var(--_row-gap,var(--_gap,calc(var(--kg-space)*2)))]",
          className,
        )}
        style={{
          ...vars({
            "--_gap": space(gap),
            "--_row-gap": space(rowGap),
            "--_align": alignValue(align),
            "--_justify": justifyValue(justify),
          }),
          ...style,
        }}
        {...props}
      />
    )
  },
)

Cluster.displayName = "Cluster"
