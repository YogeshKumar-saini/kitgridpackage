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
import { cx } from "../../utils/cx.js"
import { GridPatternCells } from "./grid-pattern-cells.js"

export type GridPatternMask = BackdropMask
export type GridPatternVariant = "flat" | "floor"
/** A cell to fill, as `[column, row]` counted from the top-left. */
export type GridPatternSquare = readonly [column: number, row: number]

export interface GridPatternProps extends HTMLAttributes<HTMLDivElement> {
  /** Cell size, in px. */
  size?: number
  /** Line width, in px. */
  strokeWidth?: number
  /** Any CSS color for the lines. Defaults to the foreground at low alpha. */
  stroke?: string
  /** SVG dash pattern for the lines, e.g. `"4 4"`. */
  dash?: string
  /** Cells to fill permanently. */
  squares?: readonly GridPatternSquare[]
  /** Any CSS color for filled and animated cells. Defaults to the sage paper. */
  fill?: string
  /**
   * `flat`: random cells softly light up and fade. `floor`: the grid scrolls toward the viewer.
   * Static under reduced motion.
   */
  animated?: boolean
  /** Number of cells that light up at once in animated flat mode. */
  cells?: number
  /** Seconds for one cell to light up and fade. */
  duration?: number
  /** Seeds the animated cell positions and timings. */
  seed?: number
  /** Fade the grid out toward the edges. */
  mask?: GridPatternMask
  /** `floor` lays the grid down in perspective, receding to a horizon. */
  variant?: GridPatternVariant
  /** Optional content, painted above the grid. */
  children?: ReactNode
}

/**
 * A crisp SVG line grid. The static grid ships no JavaScript; only the animated flat mode mounts
 * a small client part that moves lit cells around between flashes.
 */
export const GridPattern = forwardRef<HTMLDivElement, GridPatternProps>(
  (
    {
      size = 40,
      strokeWidth = 1,
      stroke,
      dash,
      squares,
      fill,
      animated = false,
      cells = 14,
      duration = 4,
      seed = 3,
      mask = "radial",
      variant = "flat",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const id = svgId("kg-grid", useId())
    const cell = Math.max(size, 4)
    const line = Math.max(strokeWidth, 0)
    const half = line / 2
    const floor = variant === "floor"

    const svg = (
      <svg
        className={cx(
          "kg-grid-pattern__svg absolute block",
          floor
            ? "top-[calc(var(--kg-grid-size)*-1)] left-0 h-[calc(100%+var(--kg-grid-size))]"
            : "inset-0",
        )}
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        <defs>
          <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse">
            <path
              d={`M${cell} ${half}H${half}V${cell}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={line}
              strokeDasharray={dash}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
        {squares && squares.length > 0 && (
          <g className="kg-grid-pattern__squares fill-[var(--_fill)]">
            {squares.map(([column, row]) => (
              <rect
                key={`${column}:${row}`}
                x={column * cell + line}
                y={row * cell + line}
                width={Math.max(cell - line, 0)}
                height={Math.max(cell - line, 0)}
              />
            ))}
          </g>
        )}
        {animated && !floor && (
          <GridPatternCells
            size={cell}
            inset={line}
            count={cells}
            duration={duration}
            seed={seed}
          />
        )}
      </svg>
    )

    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-grid-pattern absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:overflow-visible data-wrapper:isolate data-wrapper:pointer-events-auto [--_fill:var(--kg-grid-fill,var(--kg-paper-sage))]",
          className,
          wrapper,
        )}
        data-mask={mask}
        data-variant={variant}
        data-animated={animated || undefined}
        style={
          {
            ...(stroke ? { "--kg-grid-stroke": stroke } : null),
            ...(fill ? { "--kg-grid-fill": fill } : null),
            "--kg-grid-size": `${cell}px`,
            "--kg-grid-duration": `${Math.max(duration, 0.1)}s`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div
          className={cx(
            "kg-grid-pattern__layer pointer-events-none absolute inset-0 z-0 overflow-hidden",
            floor
              ? "text-[var(--kg-grid-stroke,color-mix(in_oklab,var(--kg-fg)_16%,transparent))] [perspective:260px] [perspective-origin:50%_46%]"
              : "text-[var(--kg-grid-stroke,color-mix(in_oklab,var(--kg-fg)_9%,transparent))]",
          )}
          aria-hidden="true"
        >
          {floor ? (
            <div className="kg-grid-pattern__plane absolute top-[46%] left-[-100%] h-[160%] w-[300%] origin-top [transform:rotateX(76deg)]">
              {svg}
            </div>
          ) : (
            svg
          )}
        </div>
        {wrapper && <div className="kg-grid-pattern__content relative z-1">{children}</div>}
      </div>
    )
  },
)

GridPattern.displayName = "GridPattern"
