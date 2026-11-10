import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { type BackdropMask, backdropRoot, hasChildren } from "./internal/backdrop.js"

export type AuroraMask = BackdropMask

export interface AuroraProps extends HTMLAttributes<HTMLDivElement> {
  /** Up to three CSS colors. Defaults to the sage, sky and peach papers, so it follows the theme. */
  colors?: readonly string[]
  /** Overall strength, 0–1. */
  intensity?: number
  /** Blur radius of each light, in px. */
  blur?: number
  /** Drift speed multiplier; 1 completes a cycle in roughly 20 seconds. */
  speed?: number
  /** Fade the effect out toward the edges. */
  mask?: AuroraMask
  /** Optional content, painted above the aurora. */
  children?: ReactNode
}

/**
 * Slow, heavily blurred ribbons of light. Each layer drifts on its own transform-only loop, so the
 * compositor does the work and the page never repaints. Pure CSS: server-component safe.
 */
export const Aurora = forwardRef<HTMLDivElement, AuroraProps>(
  (
    {
      colors,
      intensity = 0.6,
      blur = 64,
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
    const [c1, c2, c3] = colors ?? []

    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-aurora absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:overflow-visible data-wrapper:isolate data-wrapper:pointer-events-auto [--_c1:var(--kg-aurora-color-1,var(--kg-paper-sage))] [--_c2:var(--kg-aurora-color-2,var(--kg-paper-sky))] [--_c3:var(--kg-aurora-color-3,var(--kg-paper-peach))]",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            ...(c1 ? { "--kg-aurora-color-1": c1 } : null),
            ...(c2 ? { "--kg-aurora-color-2": c2 } : null),
            ...(c3 ? { "--kg-aurora-color-3": c3 } : null),
            "--kg-aurora-intensity": Math.min(Math.max(intensity, 0), 1),
            "--kg-aurora-blur": `${Math.max(blur, 0)}px`,
            "--kg-aurora-speed": Math.max(speed, 0.01),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div
          className="kg-aurora__layer pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[var(--kg-aurora-intensity)] [container-type:size]"
          aria-hidden="true"
        >
          <div className="kg-aurora__curtain absolute top-[-20%] left-0 h-[95%] w-[250%] origin-top-left opacity-50 blur-[calc(var(--kg-aurora-blur)*0.3)] will-change-transform" />
          <div
            className="kg-aurora__light absolute top-[-32cqmax] left-[-12cqmax] aspect-square w-[70cqmax] rounded-full will-change-transform"
            data-light="1"
          />
          <div
            className="kg-aurora__light absolute top-[-28cqmax] right-[-14cqmax] aspect-square w-[62cqmax] rounded-full opacity-85 will-change-transform"
            data-light="2"
          />
          <div
            className="kg-aurora__light absolute top-[-6cqmax] left-[24cqmax] aspect-square w-[46cqmax] rounded-full opacity-70 will-change-transform"
            data-light="3"
          />
          <div className="kg-aurora__ribbon absolute top-[4%] left-[-20%] h-[42%] w-[140%] opacity-65 blur-[calc(var(--kg-aurora-blur)*0.6)] will-change-transform" />
        </div>
        {wrapper && <div className="kg-aurora__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Aurora.displayName = "Aurora"
