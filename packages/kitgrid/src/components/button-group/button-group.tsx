import { forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"

export type ButtonGroupOrientation = "horizontal" | "vertical"

/*
 * Attached segments share one 2px ink edge. The selectors are qualified so they outrank the
 * children's own radius utilities; hovered and focused segments rise above their neighbours.
 */
const groupClass = [
  "kg-button-group inline-flex gap-2 data-[orientation=vertical]:flex-col",
  "data-attached:isolate data-attached:gap-0",
  "[&[data-attached]>*]:relative [&[data-attached]>*:hover]:z-1 [&[data-attached]>*:focus-visible]:z-2",
  "[&[data-attached][data-orientation=horizontal]>*:not(:first-child)]:-ms-[2px]",
  "[&[data-attached][data-orientation=horizontal]>*:not(:first-child)]:rounded-s-none",
  "[&[data-attached][data-orientation=horizontal]>*:not(:last-child)]:rounded-e-none",
  "[&[data-attached][data-orientation=vertical]>*:not(:first-child)]:-mt-[2px]",
  "[&[data-attached][data-orientation=vertical]>*:not(:first-child)]:rounded-t-none",
  "[&[data-attached][data-orientation=vertical]>*:not(:last-child)]:rounded-b-none",
]

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: ButtonGroupOrientation
  /** Fuse the buttons into one control with shared borders. Off leaves a small gap. */
  attached?: boolean
}

/** Groups related buttons under one accessible name. Pass `aria-label` to name the group. */
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ orientation = "horizontal", attached = true, className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      className={cx(groupClass, className)}
      data-orientation={orientation}
      data-attached={attached || undefined}
      {...props}
    />
  ),
)

ButtonGroup.displayName = "ButtonGroup"
