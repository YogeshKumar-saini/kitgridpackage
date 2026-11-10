"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useRef,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { usePlayback } from "../text-reveal/use-playback.js"

export interface MagnetLinesProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  rows?: number
  columns?: number
  /** Angle of every line before the pointer arrives, in degrees. */
  baseAngle?: number
}

/**
 * A grid of short strokes that all turn to face the pointer, like iron filings around a
 * magnet. Decorative: hidden from assistive tech, and frozen under reduced motion.
 */
export const MagnetLines = forwardRef<HTMLDivElement, MagnetLinesProps>(
  ({ rows = 9, columns = 9, baseAngle = -10, className, style, ...props }, forwardedRef) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const active = usePlayback(local, !reduced)

    useEffect(() => {
      const root = local.current
      if (!root || !active) return
      const lines = Array.from(root.children) as HTMLElement[]
      let frame = 0
      let last: PointerEvent | null = null

      const flush = () => {
        frame = 0
        if (!last) return
        for (const line of lines) {
          const rect = line.getBoundingClientRect()
          const dx = last.clientX - (rect.left + rect.width / 2)
          const dy = last.clientY - (rect.top + rect.height / 2)
          line.style.setProperty("--_r", `${((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1)}deg`)
        }
      }
      const move = (event: PointerEvent) => {
        last = event
        if (!frame) frame = requestAnimationFrame(flush)
      }
      window.addEventListener("pointermove", move, { passive: true })
      return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener("pointermove", move)
        for (const line of lines) line.style.removeProperty("--_r")
      }
    }, [active, rows, columns])

    return (
      <div
        ref={ref}
        className={cx(
          "kg-magnet-lines grid aspect-[calc(var(--_columns)_/_var(--_rows))] w-[var(--kg-magnet-lines-size,20rem)] max-w-full grid-cols-[repeat(var(--_columns),1fr)] grid-rows-[repeat(var(--_rows),1fr)] place-items-center",
          className,
        )}
        aria-hidden="true"
        style={
          {
            "--_rows": rows,
            "--_columns": columns,
            "--_r": `${baseAngle}deg`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {Array.from({ length: rows * columns }, (_, i) => (
          <span
            key={i}
            className="kg-magnet-lines__line block h-[var(--kg-magnet-lines-width,3px)] w-[var(--kg-magnet-lines-length,1.4rem)] rotate-(--_r) rounded-full bg-[color:var(--kg-magnet-lines-color,var(--kg-fg-faint))] nth-[7n+3]:bg-kg-ink"
          />
        ))}
      </div>
    )
  },
)

MagnetLines.displayName = "MagnetLines"
