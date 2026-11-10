import { forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"

export interface AspectRatioProps extends HTMLAttributes<HTMLDivElement> {
  /** Width over height: `16 / 9`, `1`, `4 / 5`. */
  ratio?: number
}

/** Holds a width-to-height ratio; its child fills the box, so embeds and maps never jump. */
export const AspectRatio = forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ ratio = 16 / 9, className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cx(
        "kg-aspect-ratio relative w-full overflow-hidden",
        "*:absolute *:inset-0 *:size-full [&>:is(img,video)]:object-cover [&>iframe]:border-0",
        className,
      )}
      style={{ aspectRatio: String(ratio > 0 ? ratio : 1), ...style }}
      {...props}
    />
  ),
)

AspectRatio.displayName = "AspectRatio"
