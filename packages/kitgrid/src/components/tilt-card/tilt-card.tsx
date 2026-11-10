"use client"

import { forwardRef, type HTMLAttributes, useEffect, useRef } from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { createSpring, type SpringConfig } from "../../hooks/use-spring.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

export interface TiltCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Maximum rotation on each axis, in degrees. */
  maxTilt?: number
  /** Distance from the viewer, in px. Lower values look more dramatic. */
  perspective?: number
  /** Scale while the pointer is over the card. */
  scale?: number
  /** A soft highlight that follows the pointer, in the butter paper by default. */
  glare?: boolean
  /** Peak glare opacity, 0–1. */
  glareOpacity?: number
  /** Tilt away from the pointer instead of toward it. */
  reverse?: boolean
  /** Also respond to touch. Off by default so the card never fights page scrolling. */
  touch?: boolean
  disabled?: boolean
  spring?: SpringConfig
}

const DEFAULT_SPRING: SpringConfig = { stiffness: 170, damping: 17 }

/**
 * A surface that tilts in 3D toward the pointer, with a spring-driven reset, an optional glare,
 * and parallax depth for descendants marked `data-depth="<px>"`.
 */
export const TiltCard = forwardRef<HTMLDivElement, TiltCardProps>(
  (
    {
      maxTilt = 10,
      perspective = 900,
      scale = 1.03,
      glare = true,
      glareOpacity = 0.35,
      reverse = false,
      touch = false,
      disabled = false,
      spring,
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const glareRef = useRef<HTMLSpanElement>(null)
    const reduced = useReducedMotion()
    const enabled = !disabled && !reduced

    // Read on every frame, so prop changes apply without tearing down the springs mid-gesture.
    const options = useRef({
      maxTilt,
      perspective,
      scale,
      glareOpacity,
      reverse,
      touch,
    })
    useIsomorphicLayoutEffect(() => {
      options.current = { maxTilt, perspective, scale, glareOpacity, reverse, touch }
    })

    // `--_depth` mirrors data-depth so CSS can lift those layers along Z.
    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (!node) return
      for (const layer of node.querySelectorAll<HTMLElement>("[data-depth]")) {
        const depth = Number.parseFloat(layer.dataset.depth ?? "")
        layer.style.setProperty(
          "--_depth",
          Number.isFinite(depth) ? String(depth) : "0",
        )
      }
    })

    const { stiffness, damping, mass } = spring ?? DEFAULT_SPRING

    useEffect(() => {
      const node = local.current
      if (!node || !enabled) return
      const config = { stiffness, damping, mass, precision: 0.001 }

      const write = () => {
        const {
          perspective: distance,
          scale: peak,
          glareOpacity: shine,
          maxTilt: max,
        } = options.current
        const engaged = lift.get()
        const rx = tiltX.get()
        const ry = tiltY.get()
        if (Math.abs(rx) < 0.001 && Math.abs(ry) < 0.001 && engaged < 0.001) {
          node.style.transform = ""
        } else {
          const s = 1 + (peak - 1) * engaged
          node.style.transform =
            `perspective(${distance}px) rotateX(${rx.toFixed(3)}deg) ` +
            `rotateY(${ry.toFixed(3)}deg) scale3d(${s}, ${s}, 1)`
        }
        const light = glareRef.current
        if (light) {
          const range = max || 1
          const flip = options.current.reverse ? -1 : 1
          const u = clamp(0.5 + (ry / range) * 0.5 * flip, 0, 1)
          const v = clamp(0.5 - (rx / range) * 0.5 * flip, 0, 1)
          light.style.setProperty("--_gx", `${(u * 100).toFixed(2)}%`)
          light.style.setProperty("--_gy", `${(v * 100).toFixed(2)}%`)
          light.style.opacity = String(engaged * shine)
        }
      }

      const tiltX = createSpring(0, write, config)
      const tiltY = createSpring(0, write, config)
      const lift = createSpring(0, write, config)

      let frame = 0
      let last: PointerEvent | null = null

      const accepts = (event: PointerEvent) =>
        event.pointerType !== "touch" || options.current.touch

      const flush = () => {
        frame = 0
        if (!last) return
        // The rect of a tilted element is skewed, but its centre is not: rotation and scale
        // happen about the centre, and offset sizes ignore transforms.
        const rect = node.getBoundingClientRect()
        const width = node.offsetWidth || rect.width || 1
        const height = node.offsetHeight || rect.height || 1
        const u = clamp(
          (last.clientX - (rect.left + rect.width / 2)) / width + 0.5,
          0,
          1,
        )
        const v = clamp(
          (last.clientY - (rect.top + rect.height / 2)) / height + 0.5,
          0,
          1,
        )
        const { maxTilt: max, reverse: away } = options.current
        const flip = away ? -1 : 1
        tiltX.set((0.5 - v) * 2 * max * flip)
        tiltY.set((u - 0.5) * 2 * max * flip)
        lift.set(1)
      }

      const handleMove = (event: PointerEvent) => {
        if (!accepts(event)) return
        last = event
        node.dataset.active = ""
        if (!frame) frame = requestAnimationFrame(flush)
      }
      const handleLeave = () => {
        cancelAnimationFrame(frame)
        frame = 0
        last = null
        delete node.dataset.active
        tiltX.set(0)
        tiltY.set(0)
        lift.set(0)
      }

      node.addEventListener("pointermove", handleMove, { passive: true })
      node.addEventListener("pointerleave", handleLeave)
      node.addEventListener("pointercancel", handleLeave)
      return () => {
        cancelAnimationFrame(frame)
        tiltX.stop()
        tiltY.stop()
        lift.stop()
        node.removeEventListener("pointermove", handleMove)
        node.removeEventListener("pointerleave", handleLeave)
        node.removeEventListener("pointercancel", handleLeave)
        node.style.transform = ""
        delete node.dataset.active
        if (glareRef.current) glareRef.current.style.opacity = ""
      }
    }, [enabled, stiffness, damping, mass])

    return (
      <div
        ref={ref}
        className={cx(
          "kg-tilt-card relative rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-6 text-kg-fg shadow-kg-sm [transform-style:preserve-3d]",
          "transition-shadow duration-[var(--kg-duration-slower)] ease-kg-out data-active:shadow-kg-lg",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          "[&_:has([data-depth])]:[transform-style:preserve-3d] [&_[data-depth]]:transition-[translate] [&_[data-depth]]:duration-[var(--kg-duration-spring)] [&_[data-depth]]:ease-kg-spring",
          "data-active:[&_[data-depth]]:[translate:0_0_calc(var(--_depth,0)*1px)]",
          className,
        )}
        data-disabled={!enabled || undefined}
        style={style}
        {...props}
      >
        {children}
        {glare && (
          <span
            ref={glareRef}
            className="kg-tilt-card__glare pointer-events-none absolute inset-0 rounded-[inherit] opacity-0"
            aria-hidden="true"
          />
        )}
      </div>
    )
  },
)

TiltCard.displayName = "TiltCard"
