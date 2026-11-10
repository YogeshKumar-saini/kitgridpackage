import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export interface MeshGradientPoint {
  /** 0–1 across the section. */
  x: number
  /** 0–1 down the section. */
  y: number
  /** Any CSS color. */
  color: string
  /** Diameter relative to the larger side of the section, 0.1–2. Defaults to 0.9. */
  size?: number
}

export interface MeshGradientProps extends HTMLAttributes<HTMLDivElement> {
  /** Control points of the mesh, up to 8. Defaults to the five paper colors. */
  points?: readonly MeshGradientPoint[]
  /** Any CSS color painted under the mesh. Defaults to the page background. */
  base?: string
  /** Each point wanders around its position. */
  animated?: boolean
  /** Drift speed multiplier. */
  speed?: number
  children?: ReactNode
}

const DEFAULT_POINTS: readonly MeshGradientPoint[] = [
  { x: 0.12, y: 0.18, color: "var(--kg-paper-sage)", size: 0.95 },
  {
    x: 0.86,
    y: 0.12,
    color: "var(--kg-paper-peach)",
    size: 0.8,
  },
  {
    x: 0.72,
    y: 0.88,
    color: "var(--kg-paper-sky)",
    size: 1.1,
  },
  {
    x: 0.2,
    y: 0.92,
    color: "var(--kg-paper-butter)",
    size: 0.9,
  },
  {
    x: 0.5,
    y: 0.45,
    color: "var(--kg-paper-rose)",
    size: 0.6,
  },
]

/**
 * A multi-point gradient mesh: each control point is a soft pool of color that blends with its
 * neighbours and wanders slowly around its anchor. Pure CSS, server-component safe.
 */
export const MeshGradient = forwardRef<HTMLDivElement, MeshGradientProps>(
  (
    {
      points = DEFAULT_POINTS,
      base,
      animated = true,
      speed = 1,
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
          "kg-mesh-gradient absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto",
          className,
          wrapper,
        )}
        data-animated={animated || undefined}
        style={
          {
            ...(base ? { "--kg-mesh-gradient-base": base } : null),
            "--kg-mesh-gradient-speed": Math.max(speed, 0.01),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-mesh-gradient__layer pointer-events-none absolute inset-0 z-0 overflow-hidden [container-type:size] bg-[color:var(--kg-mesh-gradient-base,var(--kg-bg))]" aria-hidden="true">
          {points.slice(0, 8).map((point, index) => (
            <span
              key={index}
              className="kg-mesh-gradient__point absolute aspect-square w-[calc(var(--_size)*100cqmax)] -translate-1/2 rounded-full will-change-transform"
              data-drift={(index % 4) + 1}
              style={
                {
                  left: `${Math.min(Math.max(point.x, 0), 1) * 100}%`,
                  top: `${Math.min(Math.max(point.y, 0), 1) * 100}%`,
                  "--_c": point.color,
                  "--_size": Math.min(Math.max(point.size ?? 0.9, 0.1), 2),
                  "--_i": index,
                } as CSSProperties
              }
            />
          ))}
        </div>
        {wrapper && <div className="kg-mesh-gradient__content relative z-1">{children}</div>}
      </div>
    )
  },
)

MeshGradient.displayName = "MeshGradient"
