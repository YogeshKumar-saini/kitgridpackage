import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export type MoireMask = BackdropMask

export interface MoireProps extends HTMLAttributes<HTMLDivElement> {
  /** Concentric rings or straight lines. */
  pattern?: "rings" | "lines"
  /** Any CSS color. Defaults to a faint ink. */
  color?: string
  /** Distance between lines, in px. */
  spacing?: number
  /** Drift speed multiplier; 0 holds the interference still. */
  speed?: number
  mask?: MoireMask
  children?: ReactNode
}

/**
 * Two identical hairline patterns drifting against each other, so large interference fringes
 * bloom and dissolve between them. Two gradients, transform only. Server-component safe.
 */
export const Moire = forwardRef<HTMLDivElement, MoireProps>(
  (
    {
      pattern = "rings",
      color,
      spacing = 9,
      speed = 1,
      mask = "radial",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-moire absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-moire-color,color-mix(in_oklab,var(--kg-ink)_22%,transparent))] [--_s:var(--kg-moire-spacing,9px)] [--_speed:var(--kg-moire-speed,1)]",
          className,
          wrapper,
        )}
        data-mask={mask}
        data-pattern={pattern}
        style={
          {
            ...(color ? { "--kg-moire-color": color } : null),
            "--kg-moire-spacing": `${Math.max(spacing, 3)}px`,
            "--kg-moire-speed": Math.max(speed, 0.001),
            "--kg-moire-state": speed === 0 ? "paused" : "running",
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-moire__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="kg-moire__sheet absolute -inset-[30%] will-change-transform" data-sheet="a" />
          <div className="kg-moire__sheet absolute -inset-[30%] will-change-transform" data-sheet="b" />
        </div>
        {wrapper && <div className="kg-moire__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Moire.displayName = "Moire"
