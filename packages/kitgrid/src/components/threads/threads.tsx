import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { round } from "../aurora/internal/random.js"

export type ThreadsMask = BackdropMask

export interface ThreadsProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of threads, 2–48. */
  count?: number
  /** Any CSS color. Defaults to ink. */
  color?: string
  /** How far the bundle fans open, 0–1. */
  spread?: number
  /** Wave height, 0–1. */
  amplitude?: number
  /** Stroke width, in px. */
  strokeWidth?: number
  /** Drift speed multiplier; 0 holds them still. */
  speed?: number
  mask?: ThreadsMask
  children?: ReactNode
}

const WIDTH = 1200
const HEIGHT = 400

/**
 * One period of the bundle is WIDTH wide; the path spans two so the strip loops seamlessly.
 * The envelope is periodic too, so the threads pinch and fan out at the same place every lap.
 */
const threadPath = (offset: number, amplitude: number, spread: number, phase: number) => {
  const steps = 160
  let d = ""
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * WIDTH * 2
    const t = (x / WIDTH) * Math.PI * 2
    const envelope = 0.5 + 0.5 * Math.cos(t + 1.2)
    const y =
      HEIGHT / 2 +
      offset * spread * HEIGHT * 0.42 * (0.25 + envelope) +
      Math.sin(t * 2 + phase) * amplitude * HEIGHT * 0.12 * (0.4 + envelope)
    d += `${i === 0 ? "M" : " L"}${round(x, 1)} ${round(y, 1)}`
  }
  return d
}

/**
 * A loose bundle of hairline threads that pinch together and fan apart as they drift past.
 * SVG strokes on a seamless, transform-only loop. Server-component safe.
 */
export const Threads = forwardRef<HTMLDivElement, ThreadsProps>(
  (
    {
      count = 18,
      color,
      spread = 0.6,
      amplitude = 0.5,
      strokeWidth = 1,
      speed = 1,
      mask = "edges",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const total = Math.round(Math.min(Math.max(count, 2), 48))
    const fan = Math.min(Math.max(spread, 0), 1)
    const amp = Math.min(Math.max(amplitude, 0), 1)
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-threads absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-threads-color,var(--kg-ink))] [--_speed:var(--kg-threads-speed,1)]",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            ...(color ? { "--kg-threads-color": color } : null),
            "--kg-threads-speed": Math.max(speed, 0.001),
            "--kg-threads-state": speed === 0 ? "paused" : "running",
            "--kg-threads-width": Math.max(strokeWidth, 0.25),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-threads__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="kg-threads__strip absolute top-0 left-0 h-full w-[200%] will-change-transform">
            <svg
              className="block size-full overflow-visible"
              viewBox={`0 0 ${WIDTH * 2} ${HEIGHT}`}
              preserveAspectRatio="none"
              focusable="false"
            >
              {Array.from({ length: total }, (_, index) => {
                const offset = index / (total - 1) - 0.5
                const centre = 1 - Math.abs(offset) * 2
                return (
                  <path
                    key={index}
                    className="kg-threads__line fill-none [stroke-width:var(--kg-threads-width,1)] [vector-effect:non-scaling-stroke]"
                    d={threadPath(offset, amp, fan, index * 0.35)}
                    style={
                      {
                        "--_i": index,
                        "--_alpha": `${round(18 + centre * 70, 1)}%`,
                      } as CSSProperties
                    }
                  />
                )
              })}
            </svg>
          </div>
        </div>
        {wrapper && <div className="kg-threads__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Threads.displayName = "Threads"
