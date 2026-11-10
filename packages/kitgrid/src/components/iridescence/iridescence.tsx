import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export type IridescenceMask = BackdropMask

export interface IridescenceProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Up to three CSS colors. Defaults to sage, sky and rose paper, so the sheen stays
   * on-palette instead of turning rainbow.
   */
  colors?: readonly string[]
  /** Shift speed multiplier; 0 holds the sheen still. */
  speed?: number
  /** Overall strength, 0–1. */
  intensity?: number
  /** Fine foil lines over the sheen. */
  foil?: boolean
  mask?: IridescenceMask
  children?: ReactNode
}

/**
 * A pearlescent surface whose sheen slides as if the light source moved. Stacked gradients in
 * the paper colors, animated through `background-position`. Pure CSS, server safe.
 */
export const Iridescence = forwardRef<HTMLDivElement, IridescenceProps>(
  (
    {
      colors,
      speed = 1,
      intensity = 0.7,
      foil = true,
      mask = "none",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const [c1, c2, c3] = colors ?? []
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-iridescence absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c1:var(--kg-iridescence-color-1,var(--kg-paper-sage))] [--_c2:var(--kg-iridescence-color-2,var(--kg-paper-sky))] [--_c3:var(--kg-iridescence-color-3,var(--kg-paper-rose))] [--_speed:var(--kg-iridescence-speed,1)]",
          className,
          wrapper,
        )}
        data-mask={mask}
        data-foil={foil || undefined}
        style={
          {
            ...(c1 ? { "--kg-iridescence-color-1": c1 } : null),
            ...(c2 ? { "--kg-iridescence-color-2": c2 } : null),
            ...(c3 ? { "--kg-iridescence-color-3": c3 } : null),
            "--kg-iridescence-speed": Math.max(speed, 0.001),
            "--kg-iridescence-state": speed === 0 ? "paused" : "running",
            "--kg-iridescence-intensity": Math.min(Math.max(intensity, 0), 1),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-iridescence__layer pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[var(--kg-iridescence-intensity,0.7)]" aria-hidden="true">
          <div className="kg-iridescence__sheen absolute inset-0" />
          <div className="kg-iridescence__glint absolute inset-0 mix-blend-soft-light" />
        </div>
        {wrapper && <div className="kg-iridescence__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Iridescence.displayName = "Iridescence"
