import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { type BoxSpace, space, vars } from "../box/space.js"

export interface CenterProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  /** The widest the content may grow: any CSS length. */
  max?: string
  /** Space kept on either side once the viewport is narrower than `max`. */
  gutters?: BoxSpace
  /** Centres children narrower than `max` too, not just the column. */
  intrinsic?: boolean
  /** Centres the text as well. */
  text?: boolean
}

/** A column centred horizontally with a readable maximum width. */
export const Center = forwardRef<HTMLElement, CenterProps>(
  (
    {
      as: Tag = "div",
      max = "60ch",
      gutters,
      intrinsic = false,
      text = false,
      className,
      style,
      ...props
    },
    ref,
  ) => (
    <Tag
      ref={ref}
      className={cx(
        "kg-center mx-auto box-content max-w-[var(--_max,60ch)] px-[var(--_gutters,0)]",
        intrinsic && "flex flex-col items-center",
        text && "text-center",
        className,
      )}
      data-intrinsic={intrinsic || undefined}
      data-text={text || undefined}
      style={{ ...vars({ "--_max": max, "--_gutters": space(gutters) }), ...style }}
      {...props}
    />
  ),
)

Center.displayName = "Center"
