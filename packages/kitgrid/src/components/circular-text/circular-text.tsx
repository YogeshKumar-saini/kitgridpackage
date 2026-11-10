import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useId,
} from "react"
import { cx } from "../../utils/cx.js"

export type CircularTextDirection = "clockwise" | "counterclockwise"
export type CircularTextHover = "speed-up" | "reverse" | "pause" | "none"

export interface CircularTextProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** Set once around the circle. Include your own separators, e.g. "FREE RETURNS ✦ ". */
  text: string
  /** Radius of the text baseline, in px. When omitted it is sized from the text. */
  radius?: number
  /** In px. */
  fontSize?: number
  /** Seconds per revolution. */
  duration?: number
  direction?: CircularTextDirection
  /** What happens while the pointer is over the badge. */
  hover?: CircularTextHover
  /** Rendered in the middle of the ring: an icon, a logo or a short label. */
  children?: ReactNode
}

// Average advance of an uppercase glyph with a little tracking, as a fraction of the font size.
const GLYPH_ADVANCE = 0.68

/** The radius at which `text` at `fontSize` wraps the circle once with even tracking. */
export const fitCircularTextRadius = (text: string, fontSize: number): number =>
  Math.max(
    fontSize * 1.5,
    (Array.from(text).length * fontSize * GLYPH_ADVANCE) / (2 * Math.PI),
  )

/*
 * Two nested turns: the outer one always runs, the inner one plays only while hovered. Pausing and
 * resuming never jumps the angle, so speeding up or reversing is seamless in pure CSS.
 */
const turn =
  "col-start-1 row-start-1 block size-full animate-[kg-spin_18s_linear_infinite] motion-reduce:animate-none"

/**
 * Text set on a circle that turns slowly and speeds up or reverses under the pointer. The text
 * is stretched to exactly one circumference (`textLength`), so it closes seamlessly whatever the
 * font. Server-safe: rotation and hover are pure CSS, and screen readers get the text once.
 */
export const CircularText = forwardRef<HTMLDivElement, CircularTextProps>(
  (
    {
      text,
      radius,
      fontSize = 13,
      duration = 18,
      direction = "clockwise",
      hover = "speed-up",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const id = `kg-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
    const label = text.trim()
    // A trailing gap keeps the last glyph from kissing the first where the circle closes.
    const set = /\s$/.test(text) ? text : `${text} `
    const r = radius ?? fitCircularTextRadius(set, fontSize)
    const circumference = 2 * Math.PI * r
    const box = Math.ceil((r + fontSize * 1.25) * 2)
    const c = box / 2
    const ccw = direction === "counterclockwise"
    const boostReversed = (!ccw && hover === "reverse") || (ccw && hover === "speed-up")
    const path = `M ${c} ${c - r} a ${r} ${r} 0 1 1 0 ${2 * r} a ${r} ${r} 0 1 1 0 ${-2 * r}`

    return (
      <div
        ref={ref}
        className={cx("kg-circular-text group/ct relative inline-grid aspect-square w-(--_box) shrink-0 place-items-center rounded-full font-semibold tracking-[0.02em] text-kg-fg uppercase", className)}
        data-direction={direction}
        data-hover={hover}
        style={
          {
            "--_box": `${box}px`,
            "--_duration": `${Math.max(0.5, duration)}s`,
            "--_inner": `${Math.max(0, (r - fontSize * 0.9) * 2)}px`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <span className="kg-visually-hidden">{label}</span>
        <span
          className={cx(
            turn,
            "kg-circular-text__spin [animation-duration:var(--_duration)]",
            ccw && "[animation-direction:reverse]",
            hover === "pause" && "group-hover/ct:[animation-play-state:paused]",
          )}
          aria-hidden="true"
        >
          <span
            className={cx(
              turn,
              "kg-circular-text__boost [animation-duration:calc(var(--_duration)/2)] [animation-play-state:paused]",
              boostReversed && "[animation-direction:reverse]",
              (hover === "speed-up" || hover === "reverse") &&
                "group-hover/ct:[animation-play-state:running]",
            )}
          >
            <svg
              className="kg-circular-text__svg block size-full overflow-visible"
              viewBox={`0 0 ${box} ${box}`}
              width={box}
              height={box}
              focusable="false"
            >
              <path id={id} d={path} fill="none" />
              <text
                className="kg-circular-text__text fill-current [font-family:inherit] [font-weight:inherit]"
                fontSize={fontSize}
                textLength={circumference.toFixed(2)}
                lengthAdjust="spacing"
              >
                <textPath
                  href={`#${id}`}
                  textLength={circumference.toFixed(2)}
                  lengthAdjust="spacing"
                >
                  {set}
                </textPath>
              </text>
            </svg>
          </span>
        </span>
        {children !== undefined && (
          <span
            className={cx(
              "kg-circular-text__center col-start-1 row-start-1 grid max-h-(--_inner) max-w-(--_inner) place-items-center",
              "transition-[scale] duration-(--kg-duration-spring) ease-(--kg-ease-bounce) [&>svg]:h-auto [&>svg]:w-[40%] [&>svg]:min-w-5",
              hover !== "none" && "group-hover/ct:scale-108",
            )}
          >{children}</span>
        )}
      </div>
    )
  },
)

CircularText.displayName = "CircularText"
