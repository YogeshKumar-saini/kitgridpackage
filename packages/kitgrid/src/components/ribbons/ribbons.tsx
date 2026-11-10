"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { rgba, useCanvasStage } from "../backdrop-kit/stage.js"

export interface RibbonsProps extends HTMLAttributes<HTMLDivElement> {
  /** CSS colors, one ribbon each (up to 6). Defaults to ink, sage and peach. */
  colors?: readonly string[]
  /** Thickness at the head, in px. */
  thickness?: number
  /** Points per ribbon, 8–80: longer ribbons trail further. */
  length?: number
  /** How tightly the ribbons follow, 0.05–0.6. */
  follow?: number
  children?: ReactNode
}

const DEFAULT_COLORS = [
  "var(--kg-ink)",
  "var(--kg-paper-sage)",
  "var(--kg-paper-peach)",
] as const

type Point = { x: number; y: number }

/**
 * Soft ribbons that chase the pointer through the section and coil on a slow figure-eight when
 * it leaves. Each ribbon is a spring chain drawn with a tapering stroke. Canvas, DPR-capped.
 */
export const Ribbons = forwardRef<HTMLDivElement, RibbonsProps>(
  (
    {
      colors = DEFAULT_COLORS,
      thickness = 14,
      length = 36,
      follow = 0.28,
      className,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const root = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(root, forwardedRef)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapper = hasChildren(children)
    const chains = useRef<Point[][]>([])
    const palette = (colors.length ? colors : DEFAULT_COLORS).slice(0, 6)
    const points = Math.round(Math.min(Math.max(length, 8), 80))

    const autopilot = (t: number, lane: number, width: number, height: number): Point => ({
      x: width / 2 + Math.sin(t * 0.7 + lane * 0.9) * width * 0.32,
      y: height / 2 + Math.sin(t * 1.4 + lane * 1.7) * height * 0.26,
    })

    useCanvasStage(root, canvasRef, {
      draw: ({ ctx, width, height, time, dt, still, pointer, color: resolve }) => {
        const t = time / 1000
        if (chains.current.length !== palette.length || chains.current[0]?.length !== points) {
          chains.current = palette.map((_, lane) =>
            Array.from({ length: points }, (_, k) => autopilot(t - k * 0.04, lane, width, height)),
          )
        }
        const spring = Math.min(Math.max(follow, 0.05), 0.6)
        ctx.clearRect(0, 0, width, height)
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        chains.current.forEach((chain, lane) => {
          if (still) {
            chain.forEach((point, k) => {
              const p = autopilot(t - k * 0.04, lane, width, height)
              point.x = p.x
              point.y = p.y
            })
          } else {
            const head = chain[0] as Point
            const target = pointer.inside
              ? { x: pointer.x + Math.sin(t * 3 + lane * 2) * 8, y: pointer.y + Math.cos(t * 3 + lane * 2) * 8 }
              : autopilot(t, lane, width, height)
            const lead = 1 - (1 - (spring * (1 - lane * 0.12))) ** dt
            head.x += (target.x - head.x) * lead
            head.y += (target.y - head.y) * lead
            const link = 1 - (1 - 0.3) ** dt
            for (let k = 1; k < chain.length; k++) {
              const prev = chain[k - 1] as Point
              const point = chain[k] as Point
              point.x += (prev.x - point.x) * link
              point.y += (prev.y - point.y) * link
            }
          }
          const tone = resolve(palette[lane] as string)
          for (let k = 1; k < chain.length; k++) {
            const a = chain[k - 1] as Point
            const b = chain[k] as Point
            const f = 1 - k / chain.length
            ctx.strokeStyle = rgba(tone, 0.15 + f * 0.75)
            ctx.lineWidth = Math.max(thickness, 1) * f + 0.5
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        })
      },
    })

    return (
      <div ref={ref} {...backdropRoot("kg-ribbons absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto", className, wrapper)} {...props}>
        <div className="kg-ribbons__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-ribbons__canvas block size-full" />
        </div>
        {wrapper && <div className="kg-ribbons__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Ribbons.displayName = "Ribbons"
