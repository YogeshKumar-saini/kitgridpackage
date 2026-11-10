"use client"

import {
  type CSSProperties,
  forwardRef,
  type RefObject,
  type SVGAttributes,
  useEffect,
  useId,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"

export interface AnimatedBeamProps extends Omit<SVGAttributes<SVGSVGElement>, "from" | "to"> {
  /** The positioned element both ends live in. The beam draws over its whole box. */
  containerRef: RefObject<HTMLElement | null>
  fromRef: RefObject<HTMLElement | null>
  toRef: RefObject<HTMLElement | null>
  /** Bend of the path, in px. Positive arcs upward. */
  curvature?: number
  /** Send the pulse from `to` back to `from`. */
  reverse?: boolean
  /** One trip of the pulse, in ms. */
  duration?: number
  /** Wait before the first pulse, in ms. Stagger several beams with it. */
  delay?: number
  /** Fraction of the path the pulse covers, 0 to 1. */
  length?: number
}

interface Geometry {
  d: string
  width: number
  height: number
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * A pulse of light that travels along a curved path between two elements, for integration
 * diagrams and data flow. The path is measured from the elements and re-measured on resize.
 * Decorative: hidden from assistive tech, and the pulse stops under reduced motion.
 */
export const AnimatedBeam = forwardRef<SVGSVGElement, AnimatedBeamProps>(
  (
    {
      containerRef,
      fromRef,
      toRef,
      curvature = 0,
      reverse = false,
      duration = 3200,
      delay = 0,
      length = 0.22,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const [geometry, setGeometry] = useState<Geometry | null>(null)
    const gradient = `kg-beam-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`

    // A passive effect, because the container is usually an ancestor whose ref is attached after
    // this component's layout effects run.
    useEffect(() => {
      const container = containerRef.current
      if (!container) return
      const measure = () => {
        const from = fromRef.current
        const to = toRef.current
        if (!from || !to) return
        const box = container.getBoundingClientRect()
        const a = from.getBoundingClientRect()
        const b = to.getBoundingClientRect()
        const x1 = a.left - box.left + a.width / 2
        const y1 = a.top - box.top + a.height / 2
        const x2 = b.left - box.left + b.width / 2
        const y2 = b.top - box.top + b.height / 2
        const cx = (x1 + x2) / 2
        const cy = (y1 + y2) / 2 - curvature
        setGeometry({
          d: `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`,
          width: box.width,
          height: box.height,
          x1,
          y1,
          x2,
          y2,
        })
      }
      measure()
      if (typeof ResizeObserver === "undefined") return
      const observer = new ResizeObserver(measure)
      observer.observe(container)
      if (fromRef.current) observer.observe(fromRef.current)
      if (toRef.current) observer.observe(toRef.current)
      return () => observer.disconnect()
    }, [containerRef, fromRef, toRef, curvature])

    return (
      <svg
        ref={ref}
        className={cx(
          "kg-animated-beam pointer-events-none absolute inset-0 overflow-visible",
          className,
        )}
        aria-hidden="true"
        focusable="false"
        width={geometry?.width ?? 0}
        height={geometry?.height ?? 0}
        viewBox={geometry ? `0 0 ${geometry.width} ${geometry.height}` : undefined}
        data-reverse={reverse || undefined}
        style={
          {
            "--_duration": `${duration}ms`,
            "--_delay": `${delay}ms`,
            "--_len": length,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {geometry ? (
          <>
            <defs>
              <linearGradient
                id={gradient}
                gradientUnits="userSpaceOnUse"
                x1={reverse ? geometry.x2 : geometry.x1}
                y1={reverse ? geometry.y2 : geometry.y1}
                x2={reverse ? geometry.x1 : geometry.x2}
                y2={reverse ? geometry.y1 : geometry.y2}
              >
                <stop
                  offset="0"
                  className="kg-animated-beam__stop [stop-color:var(--kg-animated-beam-from,var(--kg-paper-peach))] [stop-opacity:0.4]"
                  data-stop="start"
                />
                <stop
                  offset="1"
                  className="kg-animated-beam__stop [stop-color:var(--kg-animated-beam-to,var(--kg-ink))]"
                  data-stop="end"
                />
              </linearGradient>
            </defs>
            <path
              className="kg-animated-beam__path fill-none stroke-2 opacity-60 [stroke-linecap:round] [stroke:var(--kg-animated-beam-path,var(--kg-border-strong))]"
              d={geometry.d}
            />
            <path
              className={cx(
                "kg-animated-beam__pulse fill-none stroke-[2.5] [stroke-linecap:round] [stroke-dasharray:var(--_len)_2] [stroke-dashoffset:var(--_len)] motion-reduce:animate-none motion-reduce:opacity-0 [[data-kg-motion=reduce]_&]:animate-none [[data-kg-motion=reduce]_&]:opacity-0",
                reverse
                  ? "animate-[kg-beam-pulse_var(--_duration)_var(--kg-ease-in-out)_var(--_delay)_infinite_reverse]"
                  : "animate-[kg-beam-pulse_var(--_duration)_var(--kg-ease-in-out)_var(--_delay)_infinite]",
              )}
              d={geometry.d}
              pathLength={1}
              stroke={`url(#${gradient})`}
            />
          </>
        ) : null}
      </svg>
    )
  },
)

AnimatedBeam.displayName = "AnimatedBeam"
