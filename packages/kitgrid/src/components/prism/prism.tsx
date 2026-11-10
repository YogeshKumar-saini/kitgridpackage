import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export interface PrismProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Up to three CSS colors for the split beam. Defaults to sage, peach and sky paper, so it
   * reads as a refraction without turning into a rainbow.
   */
  colors?: readonly string[]
  /** Edge length of the prism, as any CSS length. */
  size?: string
  /** Shimmer speed multiplier; 0 holds it still. */
  speed?: number
  children?: ReactNode
}

/**
 * A glass prism splitting a single beam into a fan of paper-colored light. The glass carries a
 * slowly turning conic caustic; each band of the fan breathes on its own loop. Server safe.
 */
export const Prism = forwardRef<HTMLDivElement, PrismProps>(
  ({ colors, size = "min(34%, 15rem)", speed = 1, className, style, children, ...props }, ref) => {
    const wrapper = hasChildren(children)
    const [c1, c2, c3] = colors ?? []
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-prism absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c1:var(--kg-prism-color-1,var(--kg-paper-sage))] [--_c2:var(--kg-prism-color-2,var(--kg-paper-peach))] [--_c3:var(--kg-prism-color-3,var(--kg-paper-sky))] [--_size:var(--kg-prism-size,15rem)] [--_speed:var(--kg-prism-speed,1)]",
          className,
          wrapper,
        )}
        style={
          {
            ...(c1 ? { "--kg-prism-color-1": c1 } : null),
            ...(c2 ? { "--kg-prism-color-2": c2 } : null),
            ...(c3 ? { "--kg-prism-color-3": c3 } : null),
            "--kg-prism-size": size,
            "--kg-prism-speed": Math.max(speed, 0.001),
            "--kg-prism-state": speed === 0 ? "paused" : "running",
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-prism__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="kg-prism__stage absolute top-1/2 left-1/2 aspect-[1/0.866] w-(--_size) -translate-1/2">
            <div className="kg-prism__beam absolute top-[52%] right-[72%] h-[2px] w-screen origin-right rotate-[-10deg]" />
            <div className="kg-prism__fan absolute top-1/2 left-[62%] h-[26%] w-screen -translate-y-1/2">
              <span
                className="kg-prism__band absolute inset-0 origin-left rotate-(--_turn) [--_band:var(--_c2)] [--_delay:0s] [--_turn:-2deg]"
                data-band="1"
              />
              <span
                className="kg-prism__band absolute inset-0 origin-left rotate-(--_turn) [--_band:var(--_c1)] [--_delay:-3s] [--_turn:6deg]"
                data-band="2"
              />
              <span
                className="kg-prism__band absolute inset-0 origin-left rotate-(--_turn) [--_band:var(--_c3)] [--_delay:-6s] [--_turn:14deg]"
                data-band="3"
              />
            </div>
            <div className="kg-prism__glass absolute inset-0 overflow-hidden [clip-path:polygon(50%_0,100%_100%,0_100%)]">
              <div className="kg-prism__caustic absolute -inset-[40%] blur-[14px]" />
            </div>
          </div>
        </div>
        {wrapper && <div className="kg-prism__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Prism.displayName = "Prism"
