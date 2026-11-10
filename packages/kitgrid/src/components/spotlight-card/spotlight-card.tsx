"use client"

import { type CSSProperties, forwardRef, type HTMLAttributes, useRef } from "react"
import { usePointerVars } from "../../hooks/use-pointer-vars.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Any CSS color. Defaults to the sage paper tint. */
  color?: string
  /** Radius of the light, in px. */
  radius?: number
  /** Also light the border under the cursor. */
  border?: boolean
}

/** A paper sheet lit by a soft light that follows the pointer, edge included. CSS-driven, no re-renders. */
export const SpotlightCard = forwardRef<HTMLDivElement, SpotlightCardProps>(
  (
    { color, radius = 360, border = true, className, style, ...props },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    usePointerVars(local)

    return (
      <div
        ref={ref}
        className={cx(
          "kg-spotlight-card relative isolate overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-6 text-kg-fg shadow-kg-md",
          className,
        )}
        data-border={border || undefined}
        style={
          {
            ...(color ? { "--kg-spotlight-color": color } : null),
            "--kg-spotlight-radius": `${radius}px`,
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    )
  },
)

SpotlightCard.displayName = "SpotlightCard"
