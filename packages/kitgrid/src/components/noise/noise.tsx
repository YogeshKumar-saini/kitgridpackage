import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export type NoiseBlendMode = NonNullable<CSSProperties["mixBlendMode"]>

export interface NoiseProps extends HTMLAttributes<HTMLDivElement> {
  /** Grain strength, 0–1. */
  opacity?: number
  /** feTurbulence frequency: higher is finer grain. */
  baseFrequency?: number
  /** feTurbulence octaves, 1–8: more adds detail. */
  octaves?: number
  /** Size of the repeating grain tile, in px. */
  size?: number
  /** How the grain combines with what is underneath. */
  blendMode?: NoiseBlendMode
  /** A subtle stepped flicker, like projected film. Stops under reduced motion. */
  animated?: boolean
  /** Optional content. The grain is painted over it, like film. */
  children?: ReactNode
}

const grainImage = (frequency: number, octaves: number, size: number): string => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' ` +
    `numOctaves='${octaves}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/>` +
    // Turbulence clusters around mid-grey; stretching contrast makes the grain read on any blend.
    `<feComponentTransfer><feFuncR type='linear' slope='2.4' intercept='-0.7'/>` +
    `<feFuncG type='linear' slope='2.4' intercept='-0.7'/>` +
    `<feFuncB type='linear' slope='2.4' intercept='-0.7'/></feComponentTransfer>` +
    `</filter><rect width='100%' height='100%' filter='url(#g)'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/**
 * Film grain from an inline SVG turbulence tile: no network request, no canvas, no JavaScript.
 * Server-component safe.
 */
export const Noise = forwardRef<HTMLDivElement, NoiseProps>(
  (
    {
      opacity = 0.18,
      baseFrequency = 0.8,
      octaves = 4,
      size = 200,
      blendMode = "overlay",
      animated = false,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const tile = Math.max(Math.round(size), 16)
    const detail = Math.min(Math.max(Math.round(octaves), 1), 8)

    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-noise absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:overflow-visible data-wrapper:isolate data-wrapper:pointer-events-auto",
          className,
          wrapper,
        )}
        data-animated={animated || undefined}
        style={
          {
            "--kg-noise-opacity": Math.min(Math.max(opacity, 0), 1),
            "--kg-noise-blend": blendMode,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {wrapper && <div className="kg-noise__content relative z-1">{children}</div>}
        <div
          className="kg-noise__layer pointer-events-none absolute inset-0 z-2 overflow-hidden opacity-[var(--kg-noise-opacity,0.18)] [mix-blend-mode:var(--kg-noise-blend,overlay)]"
          aria-hidden="true"
        >
          <div
            className="kg-noise__grain absolute -inset-1/2 bg-repeat"
            style={{
              backgroundImage: grainImage(baseFrequency, detail, tile),
              backgroundSize: `${tile}px ${tile}px`,
            }}
          />
        </div>
      </div>
    )
  },
)

Noise.displayName = "Noise"
