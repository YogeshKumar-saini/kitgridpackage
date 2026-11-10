import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { round } from "../aurora/internal/random.js"

export interface OrbitRingsProps extends HTMLAttributes<HTMLDivElement> {
  /** Concentric rings, 2–8. */
  rings?: number
  /** Any CSS color for the orbit lights. Defaults to ink. */
  color?: string
  /** Where the system sits: centred, or rising from the bottom edge like a horizon. */
  position?: "center" | "bottom"
  /** Diameter of the outer ring, as any CSS length. */
  size?: string
  /** Orbit speed multiplier; 0 holds the lights still. */
  speed?: number
  /** Draw a small body at the head of each light. */
  bodies?: boolean
  children?: ReactNode
}

/**
 * Hairline concentric rings, each with a conic light
 * sweeping around it at its own pace, alternating direction. Transform-only. Server safe.
 */
export const OrbitRings = forwardRef<HTMLDivElement, OrbitRingsProps>(
  (
    {
      rings = 5,
      color,
      position = "center",
      size = "min(120%, 64rem)",
      speed = 1,
      bodies = true,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const total = Math.round(Math.min(Math.max(rings, 2), 8))
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-orbit-rings absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-orbit-rings-color,var(--kg-ink))] [--_speed:var(--kg-orbit-rings-speed,1)]",
          className,
          wrapper,
        )}
        data-position={position}
        data-bodies={bodies || undefined}
        style={
          {
            ...(color ? { "--kg-orbit-rings-color": color } : null),
            "--kg-orbit-rings-size": size,
            "--kg-orbit-rings-speed": Math.max(speed, 0.001),
            "--kg-orbit-rings-state": speed === 0 ? "paused" : "running",
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-orbit-rings__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div
            className={`kg-orbit-rings__system absolute ${position === "bottom" ? "top-full" : "top-1/2"} left-1/2 aspect-square w-[var(--kg-orbit-rings-size,64rem)] -translate-1/2`}
          >
            <div className="kg-orbit-rings__core absolute inset-[38%] rounded-full" />
            {Array.from({ length: total }, (_, index) => {
              const scale = (index + 1) / total
              return (
                <div
                  key={index}
                  className="kg-orbit-rings__ring absolute inset-(--_inset) rounded-full border border-[color-mix(in_oklab,var(--kg-border)_85%,transparent)]"
                  style={
                    {
                      "--_inset": `${round((1 - scale) * 50, 2)}%`,
                      "--_dur": `${round(10 + index * 6.5, 2)}s`,
                      "--_start": `${(index * 137) % 360}deg`,
                    } as CSSProperties
                  }
                >
                  <div className="kg-orbit-rings__sweep absolute -inset-px rounded-full rotate-(--_start)" />
                </div>
              )
            })}
          </div>
        </div>
        {wrapper && <div className="kg-orbit-rings__content relative z-1">{children}</div>}
      </div>
    )
  },
)

OrbitRings.displayName = "OrbitRings"
