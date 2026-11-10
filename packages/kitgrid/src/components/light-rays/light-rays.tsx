import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom, round } from "../aurora/internal/random.js"

export type LightRaysOrigin = "top" | "top-left" | "top-right"

export interface LightRaysProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of rays, 3–24. */
  count?: number
  /** Any CSS color. Defaults to ink. */
  color?: string
  /** Fan width, in degrees. */
  spread?: number
  /** Where the light enters. */
  origin?: LightRaysOrigin
  /** How far the rays reach, as a fraction of the section height. */
  length?: number
  /** Sway speed multiplier; 0 holds them still. */
  speed?: number
  /** Overall strength, 0–1. */
  intensity?: number
  /** Same seed, same rays. */
  seed?: number
  children?: ReactNode
}

const ANGLES: Record<LightRaysOrigin, number> = { top: 0, "top-left": -38, "top-right": 38 }

/**
 * Soft shafts of light falling from above, each swaying and breathing on its own loop like
 * light through moving leaves. Seeded, transform and opacity only. Server-component safe.
 */
export const LightRays = forwardRef<HTMLDivElement, LightRaysProps>(
  (
    {
      count = 9,
      color,
      spread = 70,
      origin = "top",
      length = 1.2,
      speed = 1,
      intensity = 0.7,
      seed = 3,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const total = Math.round(Math.min(Math.max(count, 3), 24))
    const random = createRandom(seed)
    const centre = ANGLES[origin]
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-light-rays absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-light-rays-color,var(--kg-ink))] [--_speed:var(--kg-light-rays-speed,1)] [--_x:50%] data-[origin=top-left]:[--_x:8%] data-[origin=top-right]:[--_x:92%]",
          className,
          wrapper,
        )}
        data-origin={origin}
        style={
          {
            ...(color ? { "--kg-light-rays-color": color } : null),
            "--kg-light-rays-speed": Math.max(speed, 0.001),
            "--kg-light-rays-state": speed === 0 ? "paused" : "running",
            "--kg-light-rays-length": `${Math.max(length, 0.2) * 100}%`,
            "--kg-light-rays-intensity": Math.min(Math.max(intensity, 0), 1),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-light-rays__layer pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[var(--kg-light-rays-intensity,0.7)]" aria-hidden="true">
          <div className="kg-light-rays__source absolute top-[-18%] left-(--_x) aspect-2/1 w-3/5 -translate-x-1/2" />
          {Array.from({ length: total }, (_, index) => {
            const t = total === 1 ? 0.5 : index / (total - 1)
            const angle = centre + (t - 0.5) * spread + (random() - 0.5) * (spread / total)
            return (
              <span
                key={index}
                className="kg-light-rays__ray absolute top-[-4%] left-(--_x) ml-[calc(var(--_width)/-2)] h-[var(--kg-light-rays-length,120%)] w-(--_width) origin-top rotate-(--_angle) opacity-(--_alpha)"
                style={
                  {
                    "--_angle": `${round(angle, 2)}deg`,
                    "--_width": `${round(2 + random() * 7, 2)}%`,
                    "--_alpha": round(0.35 + random() * 0.65),
                    "--_dur": `${round(6 + random() * 8, 2)}s`,
                    "--_delay": `${round(-random() * 12, 2)}s`,
                  } as CSSProperties
                }
              />
            )
          })}
        </div>
        {wrapper && <div className="kg-light-rays__content relative z-1">{children}</div>}
      </div>
    )
  },
)

LightRays.displayName = "LightRays"
