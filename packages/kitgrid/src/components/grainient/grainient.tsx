import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { Noise } from "../noise/noise.js"

export interface GrainientProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Up to four CSS colors: the first is the base the others rise out of. Defaults to sage, peach
   * and sky paper rising out of a butter-tinted page, so it follows the theme.
   */
  colors?: readonly string[]
  /** Drift speed multiplier; 1 completes a cycle in roughly 18 seconds. */
  speed?: number
  /** How soft the colour fields are, in px. */
  blur?: number
  /** Film grain strength, 0–1. 0 removes the grain layer. */
  grain?: number
  /** Size of the grain tile, in px: larger reads coarser. */
  grainSize?: number
  /** Let the fields drift. They hold still under reduced motion regardless. */
  animated?: boolean
  /** Optional content, painted above the gradient. */
  children?: ReactNode
}

/* Each field is a soft disc on its own transform-only loop; the paused base positions are the static frame. */
const field = cx(
  "kg-grainient__field absolute aspect-square rounded-full blur-(--_blur) opacity-60 will-change-transform",
  "[animation-direction:alternate] [animation-iteration-count:infinite] [animation-play-state:paused]",
  "[animation-timing-function:var(--kg-ease-in-out)] in-data-animated:[animation-play-state:running] motion-reduce:animate-none",
)

/**
 * A drifting, grainy colour field. Soft colour fields wander on transform-only loops under a
 * film-grain SVG tile, so the compositor does the work: no canvas, no WebGL, no JavaScript.
 * Server-component safe.
 */
export const Grainient = forwardRef<HTMLDivElement, GrainientProps>(
  (
    {
      colors,
      speed = 1,
      blur = 56,
      grain = 0.22,
      grainSize = 180,
      animated = true,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const [c0, c1, c2, c3] = colors ?? []

    return (
      <div
        ref={ref}
        {...backdropRoot(
          cx(
            "kg-grainient absolute inset-0 overflow-hidden pointer-events-none bg-(--_base)",
            "data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto",
            "[--_base:var(--kg-grainient-base,color-mix(in_oklab,var(--kg-paper-butter)_45%,var(--kg-bg)))]",
            "[--_blur:var(--kg-grainient-blur,56px)]",
          ),
          className,
          wrapper,
        )}
        data-animated={animated || undefined}
        style={
          {
            ...(c0 ? { "--kg-grainient-base": c0 } : null),
            ...(c1 ? { "--kg-grainient-color-1": c1 } : null),
            ...(c2 ? { "--kg-grainient-color-2": c2 } : null),
            ...(c3 ? { "--kg-grainient-color-3": c3 } : null),
            "--kg-grainient-speed": Math.max(speed, 0.01),
            "--kg-grainient-blur": `${Math.max(blur, 0)}px`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-grainient__layer group/layer pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className={cx(field, "-top-[30%] -left-[15%] w-[75%] bg-[radial-gradient(closest-side,var(--kg-grainient-color-1,var(--kg-paper-sage)),transparent)] [animation-name:kg-grainient-a] [animation-duration:calc(18s/var(--kg-grainient-speed,1))]")}
            data-field="1"
          />
          <div
            className={cx(field, "-right-[20%] -bottom-[35%] w-[85%] bg-[radial-gradient(closest-side,var(--kg-grainient-color-2,var(--kg-paper-peach)),transparent)] [animation-name:kg-grainient-b] [animation-duration:calc(23s/var(--kg-grainient-speed,1))]")}
            data-field="2"
          />
          <div
            className={cx(field, "top-[20%] left-[30%] w-[55%] bg-[radial-gradient(closest-side,var(--kg-grainient-color-3,var(--kg-paper-sky)),transparent)] opacity-45 [animation-name:kg-grainient-c] [animation-duration:calc(29s/var(--kg-grainient-speed,1))]")}
            data-field="3"
          />
          {grain > 0 && (
            <Noise
              opacity={grain}
              size={grainSize}
              baseFrequency={0.9}
              blendMode="overlay"
            />
          )}
        </div>
        {wrapper && <div className="kg-grainient__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Grainient.displayName = "Grainient"
