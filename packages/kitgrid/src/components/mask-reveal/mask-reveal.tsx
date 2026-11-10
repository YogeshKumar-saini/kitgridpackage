"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useRef,
} from "react"
import { usePointerVars } from "../../hooks/use-pointer-vars.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface MaskRevealProps extends HTMLAttributes<HTMLDivElement> {
  /** The layer underneath, seen through the spotlight. Decorative: it is hidden from assistive tech, so keep essential content in `children`. */
  reveal: ReactNode
  /** Spotlight diameter while hovering, in px. */
  size?: number
}

/**
 * A surface with a second layer hidden beneath it, uncovered through a soft circular window
 * that follows the pointer and swells open on hover.
 */
export const MaskReveal = forwardRef<HTMLDivElement, MaskRevealProps>(
  ({ reveal, size = 260, className, style, children, ...props }, forwardedRef) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    usePointerVars(local)

    return (
      <div
        ref={ref}
        className={cx("kg-mask-reveal relative grid overflow-hidden rounded-kg-xl", className)}
        style={{ "--_size": `${size}px`, ...style } as CSSProperties}
        {...props}
      >
        <div className="kg-mask-reveal__base min-w-0 [grid-area:1/1]">{children}</div>
        <div className="kg-mask-reveal__reveal pointer-events-none min-w-0 [grid-area:1/1]" aria-hidden="true">
          {reveal}
        </div>
      </div>
    )
  },
)

MaskReveal.displayName = "MaskReveal"
