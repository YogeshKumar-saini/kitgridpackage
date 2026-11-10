import { type CSSProperties, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"

export type TruncateTextPosition = "end" | "middle" | "start"

export interface TruncateTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children: string
  /** Where the ellipsis goes when the text overflows its container. */
  position?: TruncateTextPosition
  /** Characters kept after the ellipsis in `middle` mode, such as a file extension or hash tail. */
  tail?: number
  /** Caps the width. Otherwise the text fills, and truncates to, its container. */
  maxWidth?: string
  mono?: boolean
}

/**
 * Single-line truncation that responds to its container. In `middle` mode the head shrinks with
 * an ellipsis while the tail stays whole, so `invoice-2026-03….pdf` keeps its extension. The DOM
 * always holds the full string, so screen readers and copy-paste get all of it.
 */
export const TruncateText = forwardRef<HTMLSpanElement, TruncateTextProps>(
  (
    {
      children,
      position = "end",
      tail = 6,
      maxWidth,
      mono = false,
      className,
      style,
      title,
      ...props
    },
    ref,
  ) => {
    const split = position === "middle" && children.length > tail + 1
    const head = split ? children.slice(0, children.length - tail) : children
    const end = split ? children.slice(children.length - tail) : ""
    return (
      <span
        ref={ref}
        className={cx(
          "kg-truncate-text inline-flex min-w-0 max-w-(--_max,100%) align-bottom whitespace-nowrap data-mono:font-kg-mono data-mono:text-[0.92em]",
          className,
        )}
        data-position={position}
        data-mono={mono || undefined}
        title={title ?? children}
        style={{ ...(maxWidth ? ({ "--_max": maxWidth } as CSSProperties) : null), ...style }}
        {...props}
      >
        <span
          className={`kg-truncate-text__head min-w-0 overflow-hidden text-ellipsis ${position === "start" ? "text-left [direction:rtl]" : ""}`}
        >
          {position === "start" ? <bdi>{head}</bdi> : head}
        </span>
        {split && <span className="kg-truncate-text__tail flex-none">{end}</span>}
      </span>
    )
  },
)
TruncateText.displayName = "TruncateText"
