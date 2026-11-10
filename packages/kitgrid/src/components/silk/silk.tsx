import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export type SilkMask = BackdropMask

export interface SilkProps extends HTMLAttributes<HTMLDivElement> {
  /** Any CSS color for the fabric. Defaults to ink. */
  color?: string
  /** Flow speed multiplier; 0 holds the folds still. */
  speed?: number
  /** Softness of each fold, in px. */
  softness?: number
  /** Fold angle, in degrees. */
  angle?: number
  /** Overall strength, 0–1. */
  intensity?: number
  mask?: SilkMask
  children?: ReactNode
}

/**
 * Soft folds of light sliding over each other like draped fabric. Three blurred, repeating
 * gradient sheets drift at different speeds, with a slow sheen on top. Pure CSS, server safe.
 */
export const Silk = forwardRef<HTMLDivElement, SilkProps>(
  (
    {
      color,
      speed = 1,
      softness = 18,
      angle = -28,
      intensity = 0.7,
      mask = "none",
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
          "kg-silk absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-silk-color,var(--kg-ink))] [--_deep:color-mix(in_oklab,var(--_c)_35%,var(--kg-bg))] [--_speed:var(--kg-silk-speed,1)]",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            ...(color ? { "--kg-silk-color": color } : null),
            "--kg-silk-speed": Math.max(speed, 0.001),
            "--kg-silk-state": speed === 0 ? "paused" : "running",
            "--kg-silk-softness": `${Math.max(softness, 0)}px`,
            "--kg-silk-angle": `${angle}deg`,
            "--kg-silk-intensity": Math.min(Math.max(intensity, 0), 1),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-silk__layer pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[var(--kg-silk-intensity,0.7)]" aria-hidden="true">
          <div
            className="kg-silk__fold absolute left-[-50%] h-[180%] w-[300%] will-change-transform top-[-40%] rotate-[var(--kg-silk-angle,-28deg)] opacity-90 blur-[var(--kg-silk-softness,18px)]"
            data-fold="1"
          />
          <div
            className="kg-silk__fold absolute left-[-50%] h-[180%] w-[300%] will-change-transform top-[-30%] rotate-[calc(var(--kg-silk-angle,-28deg)+9deg)] opacity-55 blur-[var(--kg-silk-softness,18px)]"
            data-fold="2"
          />
          <div
            className="kg-silk__fold absolute left-[-50%] h-[180%] w-[300%] will-change-transform top-[-50%] rotate-[calc(var(--kg-silk-angle,-28deg)-7deg)] opacity-40 blur-[calc(var(--kg-silk-softness,18px)*2.2)]"
            data-fold="3"
          />
          <div className="kg-silk__sheen absolute left-[-50%] h-[180%] w-[300%] will-change-transform top-[-40%] rotate-[var(--kg-silk-angle,-28deg)] mix-blend-soft-light blur-[calc(var(--kg-silk-softness,18px)*1.4)]" />
        </div>
        {wrapper && <div className="kg-silk__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Silk.displayName = "Silk"
