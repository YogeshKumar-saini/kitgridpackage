"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { type BackdropMask, backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"

export type GlowGridMask = BackdropMask

export interface GlowGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Cell size, in px. */
  size?: number
  /** Any CSS color for the lit lines. Defaults to ink. */
  color?: string
  /** Radius of the light around the pointer, in px. */
  radius?: number
  /** Where the light rests when the pointer is away, 0–1 across and down. */
  rest?: readonly [x: number, y: number]
  mask?: GlowGridMask
  children?: ReactNode
}

/**
 * A quiet hairline grid that lights up around the pointer, as if a torch were held over it.
 * The pointer only moves two CSS variables once per frame; the light is a masked copy of the
 * grid. Touch and keyboard users see the light at its resting point.
 */
export const GlowGrid = forwardRef<HTMLDivElement, GlowGridProps>(
  (
    {
      size = 48,
      color,
      radius = 260,
      rest = [0.5, 0.3],
      mask = "radial",
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const root = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(root, forwardedRef)
    const wrapper = hasChildren(children)
    const [rx, ry] = rest

    useEffect(() => {
      const node = root.current
      if (!node) return
      const target = node.hasAttribute("data-wrapper") ? node : (node.parentElement ?? node)
      let frame = 0
      let last: PointerEvent | null = null
      const flush = () => {
        frame = 0
        if (!last) return
        const rect = node.getBoundingClientRect()
        node.style.setProperty("--kg-glow-grid-x", `${last.clientX - rect.left}px`)
        node.style.setProperty("--kg-glow-grid-y", `${last.clientY - rect.top}px`)
      }
      const move = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        last = event
        node.dataset.pointer = "in"
        if (!frame) frame = requestAnimationFrame(flush)
      }
      const leave = () => {
        last = null
        delete node.dataset.pointer
        node.style.removeProperty("--kg-glow-grid-x")
        node.style.removeProperty("--kg-glow-grid-y")
      }
      target.addEventListener("pointermove", move, { passive: true })
      target.addEventListener("pointerleave", leave)
      return () => {
        cancelAnimationFrame(frame)
        target.removeEventListener("pointermove", move)
        target.removeEventListener("pointerleave", leave)
      }
    }, [])

    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-glow-grid absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:isolate data-wrapper:pointer-events-auto [--_c:var(--kg-glow-grid-color,var(--kg-ink))] [--_s:var(--kg-glow-grid-size,48px)] [--_x:var(--kg-glow-grid-x,var(--kg-glow-grid-rest-x,50%))] [--_y:var(--kg-glow-grid-y,var(--kg-glow-grid-rest-y,30%))]",
          className,
          wrapper,
        )}
        data-mask={mask}
        style={
          {
            ...(color ? { "--kg-glow-grid-color": color } : null),
            "--kg-glow-grid-size": `${Math.max(size, 8)}px`,
            "--kg-glow-grid-radius": `${Math.max(radius, 40)}px`,
            "--kg-glow-grid-rest-x": `${Math.min(Math.max(rx, 0), 1) * 100}%`,
            "--kg-glow-grid-rest-y": `${Math.min(Math.max(ry, 0), 1) * 100}%`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-glow-grid__layer pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="kg-glow-grid__lines absolute inset-0" />
          <div
            className="kg-glow-grid__lines absolute inset-0 opacity-55 transition-opacity duration-(--kg-duration-slow) ease-kg-out [.kg-glow-grid[data-pointer=in]_&]:opacity-100"
            data-lit=""
          />
        </div>
        {wrapper && <div className="kg-glow-grid__content relative z-1">{children}</div>}
      </div>
    )
  },
)

GlowGrid.displayName = "GlowGrid"
