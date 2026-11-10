import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export interface LightConeProps extends HTMLAttributes<HTMLDivElement> {
  /** Any CSS color. Defaults to ink. */
  color?: string
  /** Width of the lit bar: an absolute or `cqw` length (percentages would resolve per axis). */
  width?: string
  /** Distance of the source from the top, as any CSS length. */
  top?: string
  /** Opening angle of the cone, in degrees. */
  angle?: number
  /** Seconds the cone takes to open on mount; 0 renders it open. */
  duration?: number
  children?: ReactNode
}

/**
 * A stage light: a thin glowing bar near the top casts a soft cone of light down onto the content.
 * Opens once on mount, then rests; its resting styles are the final frame. Server-component safe.
 */
export const LightCone = forwardRef<HTMLDivElement, LightConeProps>(
  (
    {
      color,
      width = "min(70cqw, 34rem)",
      top = "18%",
      angle = 70,
      duration = 1.2,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const half = Math.min(Math.max(angle, 10), 170) / 2
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-light-cone absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-light-cone-color,var(--kg-ink))] [--_top:var(--kg-light-cone-top,18%)] [--_half:var(--kg-light-cone-half,35deg)]",
          className,
          wrapper,
        )}
        data-animated={duration > 0 || undefined}
        style={
          {
            ...(color ? { "--kg-light-cone-color": color } : null),
            "--kg-light-cone-width": width,
            "--kg-light-cone-top": top,
            "--kg-light-cone-half": `${half}deg`,
            "--kg-light-cone-duration": `${Math.max(duration, 0)}s`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-light-cone__layer pointer-events-none absolute inset-0 z-0 overflow-hidden [container-type:size]" aria-hidden="true">
          <div className="kg-light-cone__beam absolute left-1/2 -translate-x-1/2 origin-top w-[240%]" />
          <div className="kg-light-cone__pool absolute top-(--_top) left-1/2 aspect-[3.2] w-[calc(var(--kg-light-cone-width,34rem)*1.3)] origin-top -translate-1/2" />
          <div className="kg-light-cone__bar absolute left-1/2 -translate-x-1/2 origin-top top-(--_top) h-[2px] w-[var(--kg-light-cone-width,34rem)] rounded-full" />
        </div>
        {wrapper && <div className="kg-light-cone__content relative z-1">{children}</div>}
      </div>
    )
  },
)

LightCone.displayName = "LightCone"
