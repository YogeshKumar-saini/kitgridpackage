"use client"

import { forwardRef, type HTMLAttributes, useRef } from "react"
import { useIsomorphicLayoutEffect } from "../hooks/use-isomorphic-layout-effect.js"
import { useComposedRefs } from "../utils/compose-refs.js"
import { cx } from "../utils/cx.js"
import { supportsPopover } from "../utils/env.js"

export type LayerProps = HTMLAttributes<HTMLDivElement>

/**
 * A floating surface promoted to the browser top layer through the Popover API. It escapes
 * `overflow` clipping and stacking contexts without a portal, so it keeps inheriting theme
 * variables from where it is rendered. Older browsers fall back to `position: fixed` + z-index.
 */
export const Layer = forwardRef<HTMLDivElement, LayerProps>(
  ({ className, ...props }, forwardedRef) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)

    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (!node || !supportsPopover()) return
      node.showPopover()
      return () => {
        if (node.matches(":popover-open")) node.hidePopover()
      }
    }, [])

    return (
      <div
        ref={ref}
        popover="manual"
        className={cx("kg-layer", className)}
        {...props}
      />
    )
  },
)

Layer.displayName = "Layer"
