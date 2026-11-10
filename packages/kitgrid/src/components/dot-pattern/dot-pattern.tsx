import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useId,
} from "react"
import {
  type BackdropMask,
  backdropRoot,
  hasChildren,
  svgId,
} from "../aurora/internal/backdrop.js"
import { DotPatternGlow } from "./dot-pattern-glow.js"
import { DotPatternSvg } from "./dot-pattern-svg.js"

export type DotPatternMask = BackdropMask

export interface DotPatternProps extends HTMLAttributes<HTMLDivElement> {
  /** Distance between dot centres, in px. */
  gap?: number
  /** Dot radius, in px. */
  radius?: number
  /** Any CSS color. Defaults to the foreground at low alpha. */
  color?: string
  /** Dots near the pointer brighten. Tracks the parent element, or this one when it wraps content. */
  glow?: boolean
  /** Any CSS color for lit dots. Defaults to the ink. */
  glowColor?: string
  /** Radius of the lit area, in px. */
  glowRadius?: number
  /** Fade the dots out toward the edges. */
  mask?: DotPatternMask
  /** Optional content, painted above the dots. */
  children?: ReactNode
}

/**
 * An SVG dot grid. Static by default and server-component safe; `glow` mounts a small client part
 * that lights the dots around the pointer through CSS variables, without re-rendering.
 */
export const DotPattern = forwardRef<HTMLDivElement, DotPatternProps>(
  (
    {
      gap = 20,
      radius = 1,
      color,
      glow = false,
      glowColor,
      glowRadius = 180,
      mask = "radial",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const id = svgId("kg-dots", useId())
    const spacing = Math.max(gap, 2)
    const dot = Math.min(Math.max(radius, 0.1), spacing / 2)

    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-dot-pattern absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:overflow-visible data-wrapper:isolate data-wrapper:pointer-events-auto [--_glow:var(--kg-dot-glow-color,var(--kg-ink))] [--_glow-radius:var(--kg-dot-glow-radius,180px)]",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            ...(color ? { "--kg-dot-color": color } : null),
            ...(glowColor ? { "--kg-dot-glow-color": glowColor } : null),
            "--kg-dot-glow-radius": `${Math.max(glowRadius, 0)}px`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div
          className="kg-dot-pattern__layer pointer-events-none absolute inset-0 z-0 overflow-hidden text-[var(--kg-dot-color,color-mix(in_oklab,var(--kg-fg)_30%,transparent))]"
          aria-hidden="true"
        >
          <DotPatternSvg
            id={id}
            gap={spacing}
            radius={dot}
            className="kg-dot-pattern__svg absolute inset-0 block"
          />
          {glow && <DotPatternGlow gap={spacing} radius={dot} />}
        </div>
        {wrapper && <div className="kg-dot-pattern__content relative z-1">{children}</div>}
      </div>
    )
  },
)

DotPattern.displayName = "DotPattern"
