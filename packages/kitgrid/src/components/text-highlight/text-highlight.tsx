"use client"

import {
  type CSSProperties,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useRef,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export type TextHighlightVariant = "marker" | "underline" | "circle"
export type TextHighlightTrigger = "mount" | "view"

export interface TextHighlightProps extends HTMLAttributes<HTMLElement> {
  variant?: TextHighlightVariant
  /** Defaults to `<mark>`, which carries the "highlighted" meaning. */
  as?: "mark" | "span" | "strong" | "em"
  /** Any CSS color. Defaults to butter paper for the marker and ink for the others. */
  color?: string
  /** Drawing time, in ms. */
  duration?: number
  /** Wait before drawing, in ms. */
  delay?: number
  trigger?: TextHighlightTrigger
  /** Fraction of the element that must be visible, for `trigger="view"`. */
  amount?: number
}

// A hand-drawn loop in unit space: it starts top right, runs anticlockwise around the text and
// overshoots its own start, the way a pen circles a word.
const LOOP = [
  [0.78, 0.07],
  [0.5, -0.04, 0.08, 0.04, 0.03, 0.46],
  [-0.01, 0.87, 0.36, 1.03, 0.63, 0.97],
  [0.9, 0.93, 1.02, 0.6, 0.97, 0.33],
  [0.92, 0.07, 0.62, -0.02, 0.33, 0.09],
] as const

const loopPath = (width: number, height: number) =>
  LOOP.map(
    (segment, i) =>
      (i === 0 ? "M" : "C") +
      segment
        .map((n, j) => Math.round(n * (j % 2 ? height : width) * 10) / 10)
        .join(" "),
  ).join(" ")

/* Each line fragment gets its own copy of the stroke, rounded ends included. */
const stroke = [
  "bg-[linear-gradient(var(--_color),var(--_color))] bg-no-repeat bg-[position:0_100%] rtl:bg-[position:100%_100%]",
  "[-webkit-box-decoration-break:clone] [box-decoration-break:clone]",
  "transition-[background-size] duration-(--_duration,900ms) ease-kg-in-out delay-(--_delay,0ms)",
  "motion-reduce:transition-none in-data-[kg-motion=reduce]:transition-none forced-colors:underline",
]

const variantClass: Record<TextHighlightVariant, string[]> = {
  marker: [
    "-mx-[0.14em] rounded-kg-xs px-[0.14em] [--_color:var(--kg-highlight-color,var(--kg-paper-butter))] [--_thickness:88%]",
    ...stroke,
  ],
  underline: [
    "rounded-none [--_color:var(--kg-highlight-color,var(--kg-accent))] [--_thickness:0.2em]",
    ...stroke,
  ],
  circle: ["inline-block rounded-none [--_color:var(--kg-highlight-color,var(--kg-accent))]"],
}

const strokeSize = {
  visible: "bg-size-[100%_var(--_thickness)]",
  hidden: "bg-size-[0%_var(--_thickness)] [@media(scripting:none)]:bg-size-[100%_var(--_thickness)]",
}

/* Decorative only, so without JavaScript the loop simply shows drawn. */
const loopPathClass = {
  visible: [
    "[stroke-dashoffset:0] opacity-100",
    "[transition:stroke-dashoffset_var(--_duration,900ms)_var(--kg-ease-in-out)_var(--_delay,0ms),opacity_1ms_linear_var(--_delay,0ms)]",
    "motion-reduce:transition-none in-data-[kg-motion=reduce]:transition-none",
  ],
  hidden: "[stroke-dashoffset:1] opacity-0 [@media(scripting:none)]:[stroke-dashoffset:0] [@media(scripting:none)]:opacity-100",
}

const SSR_WIDTH = 200
const SSR_HEIGHT = 60

/**
 * Draws a marker stroke, underline or hand-drawn circle behind inline text when it scrolls into
 * view. The marker and underline wrap across lines with `box-decoration-break: clone`.
 */
export const TextHighlight = forwardRef<HTMLElement, TextHighlightProps>(
  (
    {
      variant = "marker",
      as = "mark",
      color,
      duration = 900,
      delay = 0,
      trigger = "view",
      amount = 0.6,
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const svgRef = useRef<SVGSVGElement>(null)
    const pathRef = useRef<SVGPathElement>(null)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: true, amount })
    const visible = trigger === "mount" || inView || reduced

    // The loop is regenerated in pixel space so the stroke keeps an even width at any aspect
    // ratio; the server markup uses a stretched default until then.
    useEffect(() => {
      const svg = svgRef.current
      const path = pathRef.current
      if (variant !== "circle" || !svg || !path) return
      const update = () => {
        const { width, height } = svg.getBoundingClientRect()
        if (!width || !height) return
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`)
        path.setAttribute("d", loopPath(width, height))
      }
      update()
      const observer = new ResizeObserver(update)
      observer.observe(svg)
      return () => observer.disconnect()
    }, [variant])

    const Tag = as as ElementType

    return (
      <Tag
        ref={ref}
        className={cx(
          "kg-text-highlight relative bg-transparent text-inherit",
          variantClass[variant],
          variant !== "circle" && strokeSize[visible ? "visible" : "hidden"],
          className,
        )}
        data-variant={variant}
        data-state={visible ? "visible" : "hidden"}
        style={
          {
            "--_duration": `${duration}ms`,
            "--_delay": `${delay}ms`,
            ...(color ? { "--kg-highlight-color": color } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {children}
        {variant === "circle" && (
          <svg
            ref={svgRef}
            className="kg-text-highlight__loop pointer-events-none absolute -inset-x-[0.42em] -inset-y-[0.32em] h-[calc(100%+0.64em)] w-[calc(100%+0.84em)] overflow-visible"
            viewBox={`0 0 ${SSR_WIDTH} ${SSR_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              ref={pathRef}
              className={cx(
                "fill-none stroke-(--_color) [stroke-dasharray:1] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:max(2px,0.065em)]",
                loopPathClass[visible ? "visible" : "hidden"],
              )}
              d={loopPath(SSR_WIDTH, SSR_HEIGHT)}
              pathLength={1}
            />
          </svg>
        )}
      </Tag>
    )
  },
)

TextHighlight.displayName = "TextHighlight"
