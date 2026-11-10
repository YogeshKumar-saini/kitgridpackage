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

export type StackDirection = "vertical" | "horizontal"

export interface StackProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  asChild?: boolean
  direction?: StackDirection
  /** Space between children: a spacing step or a CSS length. */
  gap?: BoxSpace
  align?: BoxAlign
  justify?: BoxJustify
  /** Lets a horizontal stack wrap onto new lines. */
  wrap?: boolean
  /** Draws a hairline between children. */
  dividers?: boolean
}

const DIRECTION: Record<StackDirection, string> = {
  vertical: "flex-col [align-items:var(--_align,stretch)]",
  horizontal: "flex-row [align-items:var(--_align,center)]",
}

/* The rule sits in the middle of the gap, so spacing stays what `gap` says. */
const DIVIDERS: Record<StackDirection, string> = {
  vertical: [
    "[&>*+*]:relative [&>*+*]:before:pointer-events-none [&>*+*]:before:absolute [&>*+*]:before:inset-x-0",
    "[&>*+*]:before:top-[calc(var(--_gap,calc(var(--kg-space)*3))/-2)] [&>*+*]:before:border-t [&>*+*]:before:border-kg-border",
  ].join(" "),
  horizontal: [
    "[&>*+*]:relative [&>*+*]:before:pointer-events-none [&>*+*]:before:absolute [&>*+*]:before:inset-y-0",
    "[&>*+*]:before:start-[calc(var(--_gap,calc(var(--kg-space)*3))/-2)] [&>*+*]:before:border-s [&>*+*]:before:border-kg-border",
  ].join(" "),
}

/** Children in one column or one row, evenly spaced. */
export const Stack = forwardRef<HTMLElement, StackProps>(
  (
    {
      as: Tag = "div",
      asChild = false,
      direction = "vertical",
      gap = 3,
      align,
      justify,
      wrap = false,
      dividers = false,
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
          "kg-stack m-0 flex min-w-0 list-none p-0",
          "[justify-content:var(--_justify,flex-start)] gap-[var(--_gap,calc(var(--kg-space)*3))]",
          DIRECTION[direction] ?? DIRECTION.vertical,
          wrap && "flex-wrap",
          dividers && (DIVIDERS[direction] ?? DIVIDERS.vertical),
          className,
        )}
        data-direction={direction}
        data-wrap={wrap || undefined}
        data-dividers={dividers || undefined}
        style={{
          ...vars({
            "--_gap": space(gap),
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

Stack.displayName = "Stack"
