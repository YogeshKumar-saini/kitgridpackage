"use client"

import { forwardRef, type HTMLAttributes, useEffect, useRef } from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface ClickSparkProps extends HTMLAttributes<HTMLDivElement> {
  /** Lines per burst. */
  count?: number
  /** How far each line travels, in px. */
  radius?: number
  /** Length of each line at the start, in px. */
  size?: number
  /** Burst length, in ms. */
  duration?: number
}

interface Spark {
  x: number
  y: number
  angle: number
  born: number
}

/**
 * Wraps any content and throws a small burst of sparks from every press, drawn on a canvas
 * that sits above the content without intercepting events. Off under reduced motion.
 */
export const ClickSpark = forwardRef<HTMLDivElement, ClickSparkProps>(
  (
    { count = 8, radius = 22, size = 10, duration = 420, className, children, ...props },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const reduced = useReducedMotion()

    useEffect(() => {
      const root = local.current
      const canvas = canvasRef.current
      const ctx = canvas?.getContext?.("2d")
      if (!root || !canvas || !ctx || reduced) return
      let sparks: Spark[] = []
      let frame = 0
      let color = ""

      const resize = () => {
        const rect = root.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        canvas.width = Math.max(1, Math.round(rect.width * dpr))
        canvas.height = Math.max(1, Math.round(rect.height * dpr))
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }

      const draw = (now: number) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        sparks = sparks.filter((spark) => now - spark.born < duration)
        for (const spark of sparks) {
          const t = Math.max(now - spark.born, 0) / duration
          const eased = 1 - (1 - t) ** 3
          const distance = eased * radius
          const length = size * (1 - eased)
          const cos = Math.cos(spark.angle)
          const sin = Math.sin(spark.angle)
          ctx.beginPath()
          ctx.moveTo(spark.x + distance * cos, spark.y + distance * sin)
          ctx.lineTo(spark.x + (distance + length) * cos, spark.y + (distance + length) * sin)
          ctx.stroke()
        }
        frame = sparks.length ? requestAnimationFrame(draw) : 0
      }

      const press = (event: PointerEvent) => {
        if (event.button !== 0) return
        resize()
        color = getComputedStyle(canvas).color
        const rect = root.getBoundingClientRect()
        const born = performance.now()
        for (let i = 0; i < count; i++) {
          sparks.push({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            angle: (Math.PI * 2 * i) / count,
            born,
          })
        }
        if (!frame) frame = requestAnimationFrame(draw)
      }

      root.addEventListener("pointerdown", press)
      return () => {
        cancelAnimationFrame(frame)
        root.removeEventListener("pointerdown", press)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }, [reduced, count, radius, size, duration])

    return (
      <div ref={ref} className={cx("kg-click-spark relative", className)} {...props}>
        {children}
        <canvas ref={canvasRef} className="kg-click-spark__canvas pointer-events-none absolute inset-0 size-full text-[color:var(--kg-click-spark-color,var(--kg-ink))]" aria-hidden="true" />
      </div>
    )
  },
)

ClickSpark.displayName = "ClickSpark"
