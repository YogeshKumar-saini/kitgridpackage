import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { variants } from "../../utils/variants.js"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export interface OrbProps extends HTMLAttributes<HTMLDivElement> {
  /** Any CSS color. Defaults to ink, warmed with peach paper. */
  color?: string
  /** Diameter as any CSS length. */
  size?: string
  /** Where the sphere sits inside the section. */
  position?: "center" | "top" | "bottom"
  /** Rotation speed multiplier; 0 holds it still. */
  speed?: number
  /** Strength of the surrounding glow, 0–1. */
  glow?: number
  children?: ReactNode
}

const orbLayer = variants({
  base: "kg-orb__layer pointer-events-none absolute inset-0 z-0 grid overflow-hidden",
  variants: {
    position: {
      center: "place-items-center",
      top: "[place-items:start_center] pt-[6%]",
      bottom: "[place-items:end_center] pb-[6%]",
    },
  },
  defaults: { position: "center" },
})

/**
 * A lit sphere with a slow inner swirl and an orbit light sweeping its rim. Layers of radial and
 * conic gradients turned on transform-only loops. Pure CSS, server safe.
 */
export const Orb = forwardRef<HTMLDivElement, OrbProps>(
  (
    {
      color,
      size = "min(56%, 22rem)",
      position = "center",
      speed = 1,
      glow = 0.6,
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
          "kg-orb absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-orb-color,var(--kg-ink))] [--_warm:color-mix(in_oklab,var(--_c),var(--kg-paper-peach)_50%)] [--_deep:color-mix(in_oklab,var(--_c)_40%,var(--kg-bg))] [--_speed:var(--kg-orb-speed,1)]",
          className,
          wrapper,
        )}
        data-position={position}
        style={
          {
            ...(color ? { "--kg-orb-color": color } : null),
            "--kg-orb-size": size,
            "--kg-orb-speed": Math.max(speed, 0.001),
            "--kg-orb-state": speed === 0 ? "paused" : "running",
            "--kg-orb-glow": Math.min(Math.max(glow, 0), 1),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className={orbLayer({ position })} aria-hidden="true">
          <div className="kg-orb__body relative aspect-square w-[var(--kg-orb-size,22rem)]">
            <div className="kg-orb__halo absolute -inset-[45%] rounded-full opacity-[var(--kg-orb-glow,0.6)]" />
            <div className="kg-orb__sphere absolute inset-0 overflow-hidden rounded-full">
              <div className="kg-orb__swirl absolute -inset-[20%] rounded-full blur-[1.2rem] mix-blend-soft-light" />
              <div className="kg-orb__shine absolute top-[10%] left-[18%] h-[22%] w-[34%] rotate-[-28deg] rounded-full" />
            </div>
            <div className="kg-orb__rim absolute -inset-[3%] rounded-full" />
          </div>
        </div>
        {wrapper && <div className="kg-orb__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Orb.displayName = "Orb"
