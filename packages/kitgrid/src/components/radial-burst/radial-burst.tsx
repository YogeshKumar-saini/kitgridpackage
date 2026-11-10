import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export interface RadialBurstProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of rays, 8–96. */
  rays?: number
  /** Any CSS color. Defaults to ink. */
  color?: string
  /** Where the burst radiates from. */
  origin?: "center" | "top" | "bottom"
  /** Share of each ray period that is lit, 0.1–0.9. */
  duty?: number
  /** Rotation speed multiplier; 0 holds it still. */
  speed?: number
  /** Overall strength, 0–1. */
  intensity?: number
  children?: ReactNode
}

/**
 * A slow-turning sunburst: a repeating conic gradient on an oversized disc, faded toward its
 * rim so it reads as light rather than a pattern. Server-component safe.
 */
export const RadialBurst = forwardRef<HTMLDivElement, RadialBurstProps>(
  (
    {
      rays = 36,
      color,
      origin = "center",
      duty = 0.45,
      speed = 1,
      intensity = 0.5,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const count = Math.round(Math.min(Math.max(rays, 8), 96))
    const period = 360 / count
    const lit = period * Math.min(Math.max(duty, 0.1), 0.9)
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-radial-burst absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-radial-burst-color,var(--kg-ink))] [--_y:50%] data-[origin=top]:[--_y:0%] data-[origin=bottom]:[--_y:100%]",
          className,
          wrapper,
        )}
        data-origin={origin}
        style={
          {
            ...(color ? { "--kg-radial-burst-color": color } : null),
            "--kg-radial-burst-period": `${Math.round(period * 1000) / 1000}deg`,
            "--kg-radial-burst-lit": `${Math.round(lit * 1000) / 1000}deg`,
            "--kg-radial-burst-speed": Math.max(speed, 0.001),
            "--kg-radial-burst-state": speed === 0 ? "paused" : "running",
            "--kg-radial-burst-intensity": Math.min(Math.max(intensity, 0), 1),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-radial-burst__layer pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[var(--kg-radial-burst-intensity,0.5)]" aria-hidden="true">
          <div className="kg-radial-burst__disc absolute top-(--_y) left-1/2 aspect-square -translate-1/2 rounded-full w-[max(160%,160vh)]" />
          <div className="kg-radial-burst__glow absolute top-(--_y) left-1/2 aspect-square -translate-1/2 rounded-full w-3/5" />
        </div>
        {wrapper && <div className="kg-radial-burst__content relative z-1">{children}</div>}
      </div>
    )
  },
)

RadialBurst.displayName = "RadialBurst"
