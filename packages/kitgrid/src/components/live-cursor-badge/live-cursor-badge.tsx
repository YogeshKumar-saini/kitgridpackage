import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"
import { hueFromString } from "../avatar/avatar-utils.js"

export interface LiveCursorBadgeProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  /** A short status after the name, e.g. "typing". */
  status?: ReactNode
  /** Position in px inside a `position: relative` canvas. Omit to render inline. */
  x?: number
  y?: number
  /** Hides the name pill and leaves the arrow. */
  compact?: boolean
}

/* Paper Layers: each person gets a category paper picked from their name, edged in ink. */
const papers = [
  "[--_tone:var(--kg-paper-sage)]",
  "[--_tone:var(--kg-paper-peach)]",
  "[--_tone:var(--kg-paper-sky)]",
  "[--_tone:var(--kg-paper-butter)]",
  "[--_tone:var(--kg-paper-rose)]",
]

/**
 * A collaborator's pointer with a name flag, for multiplayer canvases. Position updates glide
 * on a spring; the colour is derived from the name so it stays stable per person. Server-safe.
 */
export const LiveCursorBadge = forwardRef<HTMLDivElement, LiveCursorBadgeProps>(
  ({ name, status, x, y, compact = false, className, style, ...props }, ref) => {
    const positioned = x != null && y != null
    return (
      <div
        ref={ref}
        role="img"
        aria-label={typeof status === "string" ? `${name}, ${status}` : name}
        className={cx(
          "kg-live-cursor-badge pointer-events-none inline-flex items-start select-none",
          papers[hueFromString(name) % papers.length],
          "data-positioned:absolute data-positioned:top-0 data-positioned:left-0 data-positioned:z-5",
          "data-positioned:translate-x-(--_x) data-positioned:translate-y-(--_y) data-positioned:will-change-[translate]",
          "data-positioned:transition-[translate] data-positioned:duration-[var(--kg-duration-slow)] data-positioned:ease-kg-spring",
          className,
        )}
        data-positioned={positioned || undefined}
        data-compact={compact || undefined}
        style={
          {
            ...(positioned ? { "--_x": `${x}px`, "--_y": `${y}px` } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <svg
          className="kg-live-cursor-badge__arrow h-4.5 w-4 shrink-0 fill-(--_tone) stroke-kg-ink stroke-[1.6]"
          viewBox="0 0 16 18"
          aria-hidden="true"
        >
          <path d="M1.5 1.5 14 8.2l-5.6 1.4-2.6 5.6Z" strokeLinejoin="round" />
        </svg>
        {!compact && (
          <span
            className={cx(
              "kg-live-cursor-badge__flag ms-[-0.125rem] mt-3.5 inline-flex origin-top-left items-baseline gap-1.5 px-2 py-0.5",
              "rounded-ss-[0.25rem] rounded-se-full rounded-ee-full rounded-es-full border-2 border-kg-ink bg-(--_tone) shadow-kg-xs",
              "text-kg-xs font-semibold whitespace-nowrap text-kg-fg",
              "transition-[opacity,scale] duration-(--kg-duration-base) ease-kg-spring starting:scale-80 starting:opacity-0 motion-reduce:transition-none",
            )}
            aria-hidden="true"
          >
            {name}
            {status != null && (
              <span className="kg-live-cursor-badge__status font-normal opacity-80">
                {status}
              </span>
            )}
          </span>
        )}
      </div>
    )
  },
)

LiveCursorBadge.displayName = "LiveCursorBadge"
