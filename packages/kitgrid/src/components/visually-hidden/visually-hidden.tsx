import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { Slot } from "../../primitives/slot.js"
import { cx } from "../../utils/cx.js"

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  asChild?: boolean
  /** Shows the content while something inside has focus, as a skip link does. */
  focusable?: boolean
}

/** Read by screen readers, invisible on screen: labels, live text and table captions. */
export const VisuallyHidden = forwardRef<HTMLElement, VisuallyHiddenProps>(
  ({ as: Tag = "span", asChild = false, focusable = false, className, ...props }, ref) => {
    const Component: ElementType = asChild ? Slot : Tag
    return (
      <Component
        ref={ref}
        className={cx(
          "kg-visually-hidden sr-only",
          focusable && "focus:not-sr-only focus-within:not-sr-only",
          className,
        )}
        data-focusable={focusable || undefined}
        {...props}
      />
    )
  },
)

VisuallyHidden.displayName = "VisuallyHidden"
