import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { round } from "../aurora/internal/random.js"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export type WavesMask = BackdropMask

export interface WavesProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of stacked waves, 1–6. */
  layers?: number
  /** Any CSS color. Defaults to ink. */
  color?: string
  /** Wave height as a fraction of each layer, 0–1. */
  amplitude?: number
  /** Share of the section the waves occupy, 0.1–1. */
  height?: number
  /** Edge the waves rise from. */
  position?: "bottom" | "top"
  /** Drift speed multiplier; 0 holds them still. */
  speed?: number
  mask?: WavesMask
  children?: ReactNode
}

const WIDTH = 1440
const VIEW_HEIGHT = 200

/** Two identical periods side by side, so translating by half the path loops seamlessly. */
const wavePath = (cycles: number, amplitude: number, phase: number, baseline: number) => {
  const total = WIDTH * 2
  const steps = 96 * cycles
  let d = `M0 ${VIEW_HEIGHT}`
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * total
    const angle = (x / WIDTH) * Math.PI * 2 * cycles + phase
    const y =
      baseline -
      amplitude * (Math.sin(angle) * 0.72 + Math.sin(angle * 2 + phase * 1.7) * 0.28)
    d += ` L${round(x, 1)} ${round(y, 1)}`
  }
  return `${d} L${total} ${VIEW_HEIGHT} Z`
}

/**
 * Layered SVG swells that roll across the edge of a section. Each layer is a seamless double
 * period that translates on its own compositor-only loop. Server-component safe.
 */
export const Waves = forwardRef<HTMLDivElement, WavesProps>(
  (
    {
      layers = 4,
      color,
      amplitude = 0.35,
      height = 0.45,
      position = "bottom",
      speed = 1,
      mask = "none",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const count = Math.round(Math.min(Math.max(layers, 1), 6))
    const amp = Math.min(Math.max(amplitude, 0), 1) * 70
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-waves absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_color:var(--kg-waves-color,var(--kg-ink))] [--_speed:var(--kg-waves-speed,1)]",
          className,
          wrapper,
        )}
        data-mask={mask}
        data-position={position}
        style={
          {
            ...(color ? { "--kg-waves-color": color } : null),
            "--kg-waves-height": `${Math.min(Math.max(height, 0.1), 1) * 100}%`,
            "--kg-waves-speed": Math.max(speed, 0.001),
            "--kg-waves-state": speed === 0 ? "paused" : "running",
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-waves__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          {Array.from({ length: count }, (_, index) => {
            const depth = count === 1 ? 1 : index / (count - 1)
            return (
              <div
                key={index}
                className={`kg-waves__band absolute left-0 h-[var(--kg-waves-height,45%)] w-[200%] will-change-transform ${position === "top" ? "top-0 -scale-y-100" : "bottom-0"}`}
                style={
                  {
                    "--_depth": round(depth),
                    "--_i": index,
                  } as CSSProperties
                }
              >
                <svg
                  className="block size-full"
                  viewBox={`0 0 ${WIDTH * 2} ${VIEW_HEIGHT}`}
                  preserveAspectRatio="none"
                  focusable="false"
                >
                  <path
                    className="fill-current"
                    d={wavePath(
                      1 + (index % 3),
                      amp * (0.55 + 0.45 * (1 - depth)),
                      index * 1.3,
                      VIEW_HEIGHT * (0.2 + depth * 0.32),
                    )}
                  />
                </svg>
              </div>
            )
          })}
        </div>
        {wrapper && <div className="kg-waves__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Waves.displayName = "Waves"
