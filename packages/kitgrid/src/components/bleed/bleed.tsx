import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { type BoxSpace, space, vars } from "../box/space.js"

export interface BleedProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  /** Pulls past the parent's side padding by this much. */
  inline?: BoxSpace
  /** Pulls past the parent's top and bottom padding by this much. */
  block?: BoxSpace
  /** Breaks out to the full viewport width, whatever the parent. */
  full?: boolean
}

/** Lets a child escape its container's padding, for edge-to-edge images and bands. */
export const Bleed = forwardRef<HTMLElement, BleedProps>(
  ({ as: Tag = "div", inline, block, full = false, className, style, ...props }, ref) => (
    <Tag
      ref={ref}
      className={cx(
        "kg-bleed my-[calc(var(--_block,0px)*-1)]",
        full ? "mx-[calc(50%-50vw)] w-screen max-w-[100vw]" : "mx-[calc(var(--_inline,0px)*-1)]",
        className,
      )}
      data-full={full || undefined}
      style={{ ...vars({ "--_inline": space(inline), "--_block": space(block) }), ...style }}
      {...props}
    />
  ),
)

Bleed.displayName = "Bleed"
