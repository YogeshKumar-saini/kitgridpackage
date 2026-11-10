"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { buttonVariants } from "../button/button.js"

export interface SignaturePadLabels {
  pad: string
  placeholder: string
  undo: string
  clear: string
}

export interface SignaturePadProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** A PNG data URL after each stroke, or `null` once cleared. */
  onValueChange?: (dataUrl: string | null) => void
  /** Base stroke width in CSS pixels; pressure and speed vary it. */
  penWidth?: number
  disabled?: boolean
  labels?: Partial<SignaturePadLabels>
}

interface Point {
  x: number
  y: number
  w: number
}

const defaultLabels: SignaturePadLabels = {
  pad: "Signature",
  placeholder: "Sign here",
  undo: "Undo",
  clear: "Clear",
}

const draw = (ctx: CanvasRenderingContext2D, stroke: readonly Point[]) => {
  const first = stroke[0]
  if (!first) return
  if (stroke.length === 1) {
    ctx.beginPath()
    ctx.arc(first.x, first.y, first.w / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  // Quadratic curves through segment midpoints smooth the polyline without lagging the pen.
  for (let i = 1; i < stroke.length; i++) {
    const prev = stroke[i - 1] as Point
    const point = stroke[i] as Point
    const before = stroke[i - 2] ?? prev
    ctx.beginPath()
    ctx.lineWidth = (prev.w + point.w) / 2
    ctx.moveTo((before.x + prev.x) / 2, (before.y + prev.y) / 2)
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + point.x) / 2, (prev.y + point.y) / 2)
    ctx.stroke()
  }
}

/**
 * A canvas for signing with a mouse, pen or finger. Strokes are smoothed and thin out with
 * speed; Undo and Clear are real buttons. Ink follows the theme's text color.
 */
export const SignaturePad = forwardRef<HTMLDivElement, SignaturePadProps>(
  ({ onValueChange, penWidth = 2.5, disabled, labels: labelsProp, className, ...props }, ref) => {
    const labels = { ...defaultLabels, ...labelsProp }
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const strokes = useRef<Point[][]>([])
    const current = useRef<Point[] | null>(null)
    const last = useRef<{ x: number; y: number; t: number } | null>(null)
    const [count, setCount] = useState(0)

    const context = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return null
      const ink = getComputedStyle(canvas).color
      ctx.strokeStyle = ink
      ctx.fillStyle = ink
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      return ctx
    }

    const redraw = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ratio = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const ctx = context()
      if (!ctx) return
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      for (const stroke of strokes.current) draw(ctx, stroke)
    }, [])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      redraw()
      const observer = new ResizeObserver(redraw)
      observer.observe(canvas)
      // Re-ink when the theme flips, since the color comes from CSS.
      const scheme = window.matchMedia("(prefers-color-scheme: dark)")
      scheme.addEventListener?.("change", redraw)
      const themes = new MutationObserver(redraw)
      themes.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] })
      return () => {
        observer.disconnect()
        themes.disconnect()
        scheme.removeEventListener?.("change", redraw)
      }
    }, [redraw])

    const emit = () => {
      if (!onValueChange) return
      if (strokes.current.length === 0) return onValueChange(null)
      try {
        onValueChange(canvasRef.current?.toDataURL("image/png") ?? null)
      } catch {
        onValueChange(null)
      }
    }

    const pointAt = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const now = event.timeStamp
      const prev = last.current
      const speed = prev ? Math.hypot(x - prev.x, y - prev.y) / Math.max(1, now - prev.t) : 0
      last.current = { x, y, t: now }
      const pressure = event.pointerType === "pen" && event.pressure > 0 ? event.pressure * 1.6 : 1
      const w = Math.max(penWidth * 0.45, (penWidth * pressure) / (1 + speed * 0.6))
      return { x, y, w }
    }

    const handleDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabled || event.button !== 0) return
      event.preventDefault()
      event.currentTarget.setPointerCapture?.(event.pointerId)
      last.current = null
      current.current = [pointAt(event)]
      strokes.current.push(current.current)
      const ctx = context()
      if (ctx) draw(ctx, current.current)
    }
    const handleMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const stroke = current.current
      if (!stroke) return
      stroke.push(pointAt(event))
      const ctx = context()
      if (ctx) draw(ctx, stroke.slice(-3))
    }
    const handleUp = () => {
      if (!current.current) return
      current.current = null
      setCount(strokes.current.length)
      emit()
    }

    const undo = () => {
      strokes.current.pop()
      setCount(strokes.current.length)
      redraw()
      emit()
    }
    const clear = () => {
      strokes.current = []
      setCount(0)
      redraw()
      emit()
    }

    return (
      <div
        ref={ref}
        className={cx("kg-signature-pad grid gap-2 w-full", className)}
        data-empty={count === 0 || undefined}
        data-disabled={disabled || undefined}
        {...props}
      >
        <div className="kg-signature-pad__surface relative h-40 overflow-hidden bg-kg-surface border-2 border-kg-ink rounded-kg-xl">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={count ? `${labels.pad}, signed` : `${labels.pad}, empty`}
            className={cx(
              "kg-signature-pad__canvas absolute inset-0 size-full text-kg-fg cursor-crosshair touch-none",
              "[[data-disabled]_&]:cursor-not-allowed",
            )}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
          />
          <span
            className="kg-signature-pad__baseline absolute inset-x-5 bottom-9 flex items-end gap-2 pb-1 border-b border-dashed border-kg-border pointer-events-none"
            aria-hidden="true"
          >
            <span className="kg-signature-pad__mark text-kg-lg leading-none text-kg-fg-faint">×</span>
            <span
              className={cx(
                "kg-signature-pad__placeholder text-kg-sm text-kg-fg-faint transition-opacity duration-(--kg-duration-base) ease-kg-out",
                "[.kg-signature-pad:not([data-empty])_&]:opacity-0",
              )}
            >{labels.placeholder}</span>
          </span>
        </div>
        <div className="kg-signature-pad__actions flex justify-end gap-2">
          <button
            type="button"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "kg-signature-pad__action" })}
            data-variant="ghost"
            disabled={disabled || count === 0}
            onClick={undo}
          >
            {labels.undo}
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "outline", size: "sm", className: "kg-signature-pad__action" })}
            data-variant="outline"
            disabled={disabled || count === 0}
            onClick={clear}
          >
            {labels.clear}
          </button>
        </div>
      </div>
    )
  },
)

SignaturePad.displayName = "SignaturePad"
