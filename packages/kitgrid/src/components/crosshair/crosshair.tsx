"use client"

import { forwardRef, type HTMLAttributes, useRef } from "react"
import { usePointerVars } from "../../hooks/use-pointer-vars.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface CrosshairProps extends HTMLAttributes<HTMLDivElement> {
  /** Print the pointer position, in px from the top-left corner, beside the crosshair. */
  coordinates?: boolean
  /** Hide the system cursor inside the area. */
  hideCursor?: boolean
}

/**
 * Hairlines that track the pointer across an area, like a measuring tool. The lines are moved
 * by CSS variables written once per frame, so the area never re-renders.
 */
export const Crosshair = forwardRef<HTMLDivElement, CrosshairProps>(
  ({ coordinates = false, hideCursor = false, className, children, ...props }, forwardedRef) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const readout = useRef<HTMLSpanElement>(null)

    usePointerVars(local, {
      onMove: ({ x, y }) => {
        if (readout.current) readout.current.textContent = `${Math.round(x)}, ${Math.round(y)}`
      },
    })

    return (
      <div
        ref={ref}
        className={cx(
          "kg-crosshair group/crosshair relative overflow-hidden [--_line:var(--kg-crosshair-color,color-mix(in_oklab,var(--kg-ink)_45%,transparent))] data-hide-cursor:cursor-none",
          className,
        )}
        data-hide-cursor={hideCursor || undefined}
        {...props}
      >
        {children}
        <span
          className="kg-crosshair__layer pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-(--kg-duration-base) ease-kg-out group-data-[pointer=in]/crosshair:opacity-100"
          aria-hidden="true"
        >
          <span
            className="kg-crosshair__line absolute top-0 left-0 h-px w-full bg-(--_line) [transform:translateY(var(--kg-pointer-y,50%))]"
            data-axis="x"
          />
          <span
            className="kg-crosshair__line absolute top-0 left-0 h-full w-px bg-(--_line) [transform:translateX(var(--kg-pointer-x,50%))]"
            data-axis="y"
          />
          <span className="kg-crosshair__dot absolute -top-[5px] -left-[5px] size-[11px] rounded-full border-[1.5px] border-kg-ink [transform:translate(var(--kg-pointer-x,0),var(--kg-pointer-y,0))]" />
          {coordinates ? (
            <span
              ref={readout}
              className="kg-crosshair__readout absolute top-0 left-0 whitespace-nowrap rounded-kg-sm border-2 border-kg-ink bg-kg-surface-raised px-1.5 py-0.5 font-kg-mono text-kg-xs text-kg-fg tabular-nums shadow-kg-xs [transform:translate(calc(var(--kg-pointer-x,0px)+12px),calc(var(--kg-pointer-y,0px)+12px))]"
            />
          ) : null}
        </span>
      </div>
    )
  },
)

Crosshair.displayName = "Crosshair"
