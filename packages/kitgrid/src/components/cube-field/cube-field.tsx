import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom } from "../aurora/internal/random.js"

export type CubeFieldMask = BackdropMask

export interface CubeFieldProps extends HTMLAttributes<HTMLDivElement> {
  /** Cubes along each side of the field, 3–14. */
  columns?: number
  /** Edge length of each cube, in px. */
  size?: number
  /** Gap between cubes, in px. */
  gap?: number
  /** Any CSS color for the lit cubes. Defaults to sage paper. */
  color?: string
  /** Share of cubes painted in the lit color, 0–1. */
  accentRatio?: number
  /** Wave speed multiplier; 0 holds the field still. */
  speed?: number
  /** Same seed, same lit cubes. */
  seed?: number
  mask?: CubeFieldMask
  children?: ReactNode
}

/**
 * An isometric field of CSS 3D cubes with a slow wave rising through it, diagonal by diagonal.
 * Three faces per cube, `transform` only. Server-component safe.
 */
export const CubeField = forwardRef<HTMLDivElement, CubeFieldProps>(
  (
    {
      columns = 9,
      size = 44,
      gap = 10,
      color,
      accentRatio = 0.08,
      speed = 1,
      seed = 4,
      mask = "radial",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const random = createRandom(seed)
    const side = Math.round(Math.min(Math.max(columns, 3), 14))
    const ratio = Math.min(Math.max(accentRatio, 0), 1)
    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-cube-field absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-cube-field-color,var(--kg-paper-sage))] [--_s:var(--kg-cube-field-size,44px)] [--_h:calc(var(--_s)*0.5)] [--_speed:var(--kg-cube-field-speed,1)]",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            ...(color ? { "--kg-cube-field-color": color } : null),
            "--kg-cube-field-size": `${Math.max(size, 8)}px`,
            "--kg-cube-field-gap": `${Math.max(gap, 0)}px`,
            "--kg-cube-field-speed": Math.max(speed, 0.001),
            "--kg-cube-field-state": speed === 0 ? "paused" : "running",
            "--_side": side,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-cube-field__layer pointer-events-none absolute inset-0 z-0 overflow-hidden perspective-[2400px]" aria-hidden="true">
          <div className="kg-cube-field__plane absolute top-1/2 left-1/2 grid grid-cols-[repeat(var(--_side),var(--_s))] gap-[var(--kg-cube-field-gap,10px)] transform-3d [transform:translate(-50%,-50%)_rotateX(58deg)_rotateZ(45deg)]">
            {Array.from({ length: side * side }, (_, index) => {
              const x = index % side
              const y = Math.floor(index / side)
              return (
                <div
                  key={index}
                  className="kg-cube-field__cube relative aspect-square w-(--_s) transform-3d [--_tone:var(--kg-surface-raised)] data-lit:[--_tone:var(--_c)]"
                  data-lit={random() < ratio || undefined}
                  style={{ "--_wave": x + y } as CSSProperties}
                >
                  <span
                    className="kg-cube-field__face absolute backface-hidden shadow-[inset_0_0_0_1px_var(--kg-border)] inset-0 bg-(--_tone) [transform:translateZ(var(--_h))]"
                    data-face="top"
                  />
                  <span
                    className="kg-cube-field__face absolute backface-hidden shadow-[inset_0_0_0_1px_var(--kg-border)] bottom-0 left-0 h-(--_h) w-(--_s) origin-bottom bg-[color-mix(in_oklab,var(--_tone),var(--kg-fg)_10%)] [transform:rotateX(-90deg)]"
                    data-face="south"
                  />
                  <span
                    className="kg-cube-field__face absolute backface-hidden shadow-[inset_0_0_0_1px_var(--kg-border)] top-0 right-0 h-(--_s) w-(--_h) origin-right bg-[color-mix(in_oklab,var(--_tone),var(--kg-fg)_18%)] [transform:rotateY(90deg)]"
                    data-face="east"
                  />
                </div>
              )
            })}
          </div>
        </div>
        {wrapper && <div className="kg-cube-field__content relative z-1">{children}</div>}
      </div>
    )
  },
)

CubeField.displayName = "CubeField"
