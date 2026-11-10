"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useRef,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface ParallaxLayersProps extends HTMLAttributes<HTMLDivElement> {
  /** Travel of a depth-1 layer across the full scroll, in px. */
  range?: number
  /** Also shift layers with the pointer, for a hover diorama. */
  pointer?: boolean
}

export interface ParallaxLayerProps extends HTMLAttributes<HTMLDivElement> {
  /** 0 stays fixed to the scene, 1 travels the full range, negatives move against it. */
  depth?: number
}

/**
 * A scene of stacked layers that drift at different speeds as it scrolls through the viewport
 * (and optionally as the pointer moves), for depth without WebGL. Progress is written to CSS
 * variables once per frame, only while the scene is on screen.
 */
export const ParallaxLayers = forwardRef<HTMLDivElement, ParallaxLayersProps>(
  ({ range = 140, pointer = false, className, style, ...props }, forwardedRef) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: false, amount: 0 })
    const active = inView && !reduced

    useEffect(() => {
      const node = local.current
      if (!node || !active) return
      let frame = 0
      const update = () => {
        frame = 0
        const rect = node.getBoundingClientRect()
        const vh = window.innerHeight || 1
        // -0.5 as the scene enters at the bottom, 0 centred, 0.5 as it leaves at the top.
        const p = (vh / 2 - (rect.top + rect.height / 2)) / (vh + rect.height)
        node.style.setProperty("--_scroll", p.toFixed(4))
      }
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update)
      }
      const move = (event: PointerEvent) => {
        const rect = node.getBoundingClientRect()
        node.style.setProperty("--_px", ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3))
        node.style.setProperty("--_py", ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3))
      }
      const leave = () => {
        node.style.setProperty("--_px", "0")
        node.style.setProperty("--_py", "0")
      }
      update()
      window.addEventListener("scroll", schedule, { passive: true })
      window.addEventListener("resize", schedule)
      if (pointer) {
        node.addEventListener("pointermove", move, { passive: true })
        node.addEventListener("pointerleave", leave)
      }
      return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener("scroll", schedule)
        window.removeEventListener("resize", schedule)
        node.removeEventListener("pointermove", move)
        node.removeEventListener("pointerleave", leave)
      }
    }, [active, pointer])

    useEffect(() => {
      if (!reduced) return
      const node = local.current
      for (const name of ["--_scroll", "--_px", "--_py"]) node?.style.removeProperty(name)
    }, [reduced])

    return (
      <div
        ref={ref}
        className={cx("kg-parallax-layers group/parallax relative isolate grid overflow-hidden [--_px:0] [--_py:0] [--_scroll:0]", className)}
        data-pointer-parallax={pointer || undefined}
        style={{ "--_range": `${range}px`, ...style } as CSSProperties}
        {...props}
      />
    )
  },
)

ParallaxLayers.displayName = "ParallaxLayers"

export const ParallaxLayer = forwardRef<HTMLDivElement, ParallaxLayerProps>(
  ({ depth = 0.5, className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cx(
        "kg-parallax-layers__layer min-w-0 will-change-transform [grid-area:1/1] [transform:translate3d(calc(var(--_px)_*_var(--_depth)_*_var(--_range)_*_-0.35),calc(var(--_scroll)_*_var(--_depth)_*_var(--_range)_+_var(--_py)_*_var(--_depth)_*_var(--_range)_*_-0.35),0)] group-data-pointer-parallax/parallax:transition-transform group-data-pointer-parallax/parallax:duration-(--kg-duration-slower) group-data-pointer-parallax/parallax:ease-kg-out",
        className,
      )}
      style={{ "--_depth": depth, ...style } as CSSProperties}
      {...props}
    />
  ),
)

ParallaxLayer.displayName = "ParallaxLayer"
