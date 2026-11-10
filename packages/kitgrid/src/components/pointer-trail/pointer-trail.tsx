"use client"

import { forwardRef, type HTMLAttributes, useEffect, useRef } from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface PointerTrailProps extends HTMLAttributes<HTMLDivElement> {
  /** How long a point of the trail lives, in ms. */
  life?: number
  /** Width of the trail at its head, in px. */
  width?: number
  /** Paint under the content instead of over it. */
  behind?: boolean
}

interface Point {
  x: number
  y: number
  t: number
}

/**
 * A ribbon of light that follows the pointer across the area and tapers away behind it. Drawn
 * on a canvas only while there is a trail, so an idle area costs nothing. Off under reduced
 * motion and for touch.
 */
export const PointerTrail = forwardRef<HTMLDivElement, PointerTrailProps>(
  (
    { life = 520, width = 14, behind = false, className, children, ...props },
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
      const points: Point[] = []
      let frame = 0
      let color = ""
      let size = { w: 0, h: 0 }

      const resize = () => {
        const rect = root.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        size = { w: rect.width, h: rect.height }
        canvas.width = Math.max(1, Math.round(rect.width * dpr))
        canvas.height = Math.max(1, Math.round(rect.height * dpr))
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        color = getComputedStyle(canvas).color
      }

      const draw = (now: number) => {
        ctx.clearRect(0, 0, size.w, size.h)
        while (points.length && now - (points[0] as Point).t > life) points.shift()
        ctx.lineCap = "round"
        ctx.strokeStyle = color
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1] as Point
          const b = points[i] as Point
          const age = 1 - Math.min(Math.max(now - b.t, 0) / life, 1)
          ctx.globalAlpha = age * age * 0.9
          ctx.lineWidth = Math.max(width * age, 0.5)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        frame = points.length > 1 ? requestAnimationFrame(draw) : 0
        if (!frame) ctx.clearRect(0, 0, size.w, size.h)
      }

      const move = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        if (!size.w) resize()
        const rect = root.getBoundingClientRect()
        points.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, t: performance.now() })
        if (points.length > 64) points.shift()
        if (!frame) frame = requestAnimationFrame(draw)
      }

      const observer =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize)
      observer?.observe(root)
      root.addEventListener("pointermove", move, { passive: true })
      return () => {
        cancelAnimationFrame(frame)
        observer?.disconnect()
        root.removeEventListener("pointermove", move)
      }
    }, [reduced, life, width])

    return (
      <div
        ref={ref}
        className={cx("kg-pointer-trail group/trail relative isolate", className)}
        data-behind={behind || undefined}
        {...props}
      >
        <canvas ref={canvasRef} className="kg-pointer-trail__canvas pointer-events-none absolute inset-0 z-1 size-full text-[color:var(--kg-pointer-trail-color,var(--kg-ink))] group-data-behind/trail:-z-1" aria-hidden="true" />
        {children}
      </div>
    )
  },
)

PointerTrail.displayName = "PointerTrail"
