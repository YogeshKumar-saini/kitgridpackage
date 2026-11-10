"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"

export interface ClampLabels {
  more?: string
  less?: string
}

export interface ClampProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Visible lines while collapsed. */
  lines?: number
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  /** Hide the toggle, for a read-only clamp. */
  hideToggle?: boolean
  labels?: ClampLabels
}

/**
 * Clamps content to a number of lines with a soft fade, and offers a toggle only when the
 * content actually overflows.
 */
export const Clamp = forwardRef<HTMLDivElement, ClampProps>(
  (
    {
      children,
      lines = 3,
      expanded: expandedProp,
      defaultExpanded = false,
      onExpandedChange,
      hideToggle = false,
      labels,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const [expanded, setExpanded] = useControllableState({
      value: expandedProp,
      defaultValue: defaultExpanded,
      onChange: onExpandedChange,
    })
    const bodyRef = useRef<HTMLDivElement>(null)
    const [overflows, setOverflows] = useState(false)
    const id = useId()
    const words = { more: "Show more", less: "Show less", ...labels }

    useEffect(() => {
      const node = bodyRef.current
      if (!node) return
      const measure = () => {
        if (expanded) return
        setOverflows(node.scrollHeight - node.clientHeight > 1)
      }
      measure()
      if (typeof ResizeObserver === "undefined") return
      const observer = new ResizeObserver(measure)
      observer.observe(node)
      return () => observer.disconnect()
    }, [expanded, lines, children])

    const showToggle = !hideToggle && (overflows || expanded)

    return (
      <div
        ref={ref}
        className={cx("kg-clamp grid min-w-0 justify-items-start gap-1.5", className)}
        data-state={expanded ? "expanded" : "collapsed"}
        data-overflows={overflows || undefined}
        style={{ "--_lines": lines, ...style } as CSSProperties}
        {...props}
      >
        <div
          ref={bodyRef}
          id={id}
          className={cx(
            "kg-clamp__body min-w-0",
            !expanded && "line-clamp-(--_lines)",
            !expanded &&
              overflows &&
              "[mask-image:linear-gradient(to_bottom,black_calc(100%-1.4em),transparent)]",
          )}
        >
          {children}
        </div>
        {showToggle && (
          <button
            type="button"
            className="kg-clamp__toggle inline-flex cursor-pointer items-center gap-1 rounded-kg-xs border-0 bg-transparent py-0.5 text-kg-sm font-semibold text-kg-accent-strong underline-offset-[3px] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring [&_svg]:size-3.5 [&_svg]:transition-transform [&_svg]:duration-(--kg-duration-base) [&_svg]:ease-kg-spring aria-expanded:[&_svg]:rotate-180"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? words.less : words.more}
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    )
  },
)
Clamp.displayName = "Clamp"
