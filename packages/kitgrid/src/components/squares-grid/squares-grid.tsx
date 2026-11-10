"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { rgba, useCanvasStage } from "../backdrop-kit/stage.js"

export type SquaresGridMask = BackdropMask
export type SquaresGridDirection = "right" | "left" | "up" | "down" | "diagonal"

export interface SquaresGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Which way the grid scrolls. */
  direction?: SquaresGridDirection
  /** Scroll speed in px per frame; 0 holds it still. */
  speed?: number
  /** Cell size, in px. */
  size?: number
  /** Any CSS color for the lines. Defaults to the border token. */
  lineColor?: string
  /** Any CSS color for the cell under the pointer. Defaults to sage paper. */
  hoverColor?: string
  mask?: SquaresGridMask
  children?: ReactNode
}

const VECTORS: Record<SquaresGridDirection, readonly [number, number]> = {
  right: [1, 0],
  left: [-1, 0],
  up: [0, -1],
  down: [0, 1],
  diagonal: [0.7071, 0.7071],
}

/**
 * A hairline grid that scrolls steadily in one direction, lighting the cell under the pointer as
 * it passes. Canvas, DPR-capped, paused offscreen and still under reduced motion.
 */
export const SquaresGrid = forwardRef<HTMLDivElement, SquaresGridProps>(
  (
    {
      direction = "diagonal",
      speed = 0.4,
      size = 44,
      lineColor = "var(--kg-border)",
      hoverColor = "var(--kg-paper-sage)",
      mask = "radial",
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
    const offset = useRef({ x: 0, y: 0 })

    useCanvasStage(root, canvasRef, {
      draw: ({ ctx, width, height, dt, still, pointer, color }) => {
        const cell = Math.max(size, 8)
        const [vx, vy] = VECTORS[direction]
        if (!still) {
          offset.current.x = (offset.current.x + vx * speed * dt + cell) % cell
          offset.current.y = (offset.current.y + vy * speed * dt + cell) % cell
        }
        const { x: ox, y: oy } = offset.current
        ctx.clearRect(0, 0, width, height)

        if (pointer.inside) {
          const cx = Math.floor((pointer.x - ox) / cell) * cell + ox
          const cy = Math.floor((pointer.y - oy) / cell) * cell + oy
          ctx.fillStyle = rgba(color(hoverColor))
          ctx.fillRect(cx, cy, cell, cell)
        }

        ctx.strokeStyle = rgba(color(lineColor))
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = (ox % cell) - cell; x <= width + cell; x += cell) {
          const sx = Math.round(x) + 0.5
          ctx.moveTo(sx, 0)
          ctx.lineTo(sx, height)
        }
        for (let y = (oy % cell) - cell; y <= height + cell; y += cell) {
          const sy = Math.round(y) + 0.5
          ctx.moveTo(0, sy)
          ctx.lineTo(width, sy)
        }
        ctx.stroke()
      },
    })

    return (
      <div
        ref={ref}
        {...backdropRoot("kg-squares-grid absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto", className, wrapper)}
        data-mask={mask}
        {...props}
      >
        <div className="kg-squares-grid__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <canvas ref={canvasRef} className="kg-squares-grid__canvas block size-full" />
        </div>
        {wrapper && <div className="kg-squares-grid__content relative z-1">{children}</div>}
      </div>
    )
  },
)

SquaresGrid.displayName = "SquaresGrid"
