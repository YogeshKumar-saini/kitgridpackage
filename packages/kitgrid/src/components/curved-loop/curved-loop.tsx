"use client"

import {
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useId,
  useRef,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { usePlayback } from "../text-reveal/use-playback.js"

export interface CurvedLoopProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The phrase that loops. Read once by assistive tech. */
  children: string
  /** Depth of the curve in viewBox units. Negative bends upward, 0 is a straight line. */
  curve?: number
  /** Travel speed, in viewBox units per second. Negative reverses. */
  speed?: number
  /** Let the pointer drag the loop, flinging it with inertia. */
  draggable?: boolean
  /** Glyph placed between repeats. */
  separator?: string
}

const WIDTH = 1440
const HEIGHT = 240
const REPEATS = 8

/**
 * A phrase that travels along a curved SVG path like a ribbon, repeating seamlessly. The
 * offset is written to the textPath attribute per frame, never through React state.
 */
export const CurvedLoop = forwardRef<HTMLDivElement, CurvedLoopProps>(
  (
    {
      children,
      curve = 90,
      speed = 70,
      draggable = true,
      separator = " ✦ ",
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const pathRef = useRef<SVGTextPathElement>(null)
    const measureRef = useRef<SVGTextElement>(null)
    const reduced = useReducedMotion()
    const playing = usePlayback(local, !reduced)
    const id = `kg-curve-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
    const unit = `${children}${separator}`
    const mid = HEIGHT / 2 - curve / 2
    const d = `M -100,${mid} Q ${WIDTH / 2},${mid + curve} ${WIDTH + 100},${mid}`

    useEffect(() => {
      const textPath = pathRef.current
      const root = local.current
      if (!textPath || !root) return
      const span = measureRef.current?.getComputedTextLength?.() ?? 0
      if (span <= 0) return
      let offset = -span
      let velocity = speed
      let dragging = false
      let lastX = 0
      let lastTime = 0
      let frame = 0
      let prev = performance.now()

      const write = () => {
        // Keep the offset inside one repeat so the loop never shows its end.
        offset = ((((offset + span) % span) + span) % span) - span
        textPath.setAttribute("startOffset", offset.toFixed(2))
      }
      write()
      if (reduced) return

      const tick = (now: number) => {
        const dt = Math.min(Math.max((now - prev) / 1000, 0), 0.05)
        prev = now
        if (!dragging) {
          velocity += (speed - velocity) * Math.min(dt * 2.5, 1)
          offset += velocity * dt
          write()
        }
        frame = requestAnimationFrame(tick)
      }
      if (playing) frame = requestAnimationFrame(tick)

      const scale = () => WIDTH / (root.getBoundingClientRect().width || WIDTH)
      const down = (event: PointerEvent) => {
        if (!draggable) return
        dragging = true
        lastX = event.clientX
        lastTime = event.timeStamp
        root.setPointerCapture?.(event.pointerId)
        root.dataset.dragging = ""
      }
      const move = (event: PointerEvent) => {
        if (!dragging) return
        const dx = (event.clientX - lastX) * scale()
        const dtMove = Math.max(event.timeStamp - lastTime, 1) / 1000
        offset += dx
        velocity = dx / dtMove
        lastX = event.clientX
        lastTime = event.timeStamp
        write()
      }
      const up = () => {
        dragging = false
        delete root.dataset.dragging
      }
      root.addEventListener("pointerdown", down)
      root.addEventListener("pointermove", move)
      root.addEventListener("pointerup", up)
      root.addEventListener("pointercancel", up)
      return () => {
        cancelAnimationFrame(frame)
        root.removeEventListener("pointerdown", down)
        root.removeEventListener("pointermove", move)
        root.removeEventListener("pointerup", up)
        root.removeEventListener("pointercancel", up)
      }
    }, [playing, reduced, speed, draggable, unit, d])

    return (
      <div
        ref={ref}
        className={cx(
          "kg-curved-loop relative w-full touch-pan-y select-none data-draggable:cursor-grab data-dragging:cursor-grabbing",
          className,
        )}
        data-draggable={draggable && !reduced ? "" : undefined}
        {...props}
      >
        <span className="kg-visually-hidden">{children}</span>
        <svg
          className="kg-curved-loop__svg block h-auto w-full overflow-visible"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <path id={id} d={d} />
          </defs>
          <text ref={measureRef} className="kg-curved-loop__measure invisible fill-current text-[length:var(--kg-curved-loop-size,88px)] font-bold tracking-[-0.02em]">
            {unit}
          </text>
          <text className="kg-curved-loop__text fill-current text-[length:var(--kg-curved-loop-size,88px)] font-bold tracking-[-0.02em]">
            <textPath ref={pathRef} href={`#${id}`} startOffset="0">
              {unit.repeat(REPEATS)}
            </textPath>
          </text>
        </svg>
      </div>
    )
  },
)

CurvedLoop.displayName = "CurvedLoop"
