"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  useEffect,
  useRef,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { createSpring, type SpringConfig } from "../../hooks/use-spring.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"

export interface MagneticProps extends HTMLAttributes<HTMLElement> {
  /** A single element. It keeps its own markup; only `translate` is written to it. */
  children: ReactElement
  /** Fraction of the pointer's offset from the centre that the element follows, 0–1. */
  strength?: number
  /** How far beyond the element's edge the pull reaches, in px. */
  radius?: number
  disabled?: boolean
  spring?: SpringConfig
}

const DEFAULT_SPRING: SpringConfig = { stiffness: 210, damping: 15, mass: 0.7 }

/** Pulls its child toward a nearby pointer and springs it home when the pointer moves away. */
export const Magnetic = forwardRef<HTMLElement, MagneticProps>(
  (
    { children, strength = 0.35, radius = 80, disabled = false, spring, ...props },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement | null>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: false, amount: 0 })
    const enabled = !disabled && !reduced && inView
    const { stiffness, damping, mass } = spring ?? DEFAULT_SPRING

    useEffect(() => {
      const node = local.current
      if (!node || !enabled) return
      const config = { stiffness, damping, mass, precision: 0.05 }
      const write = () => {
        const dx = x.get()
        const dy = y.get()
        const resting = Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05
        node.style.translate = resting ? "" : `${dx.toFixed(2)}px ${dy.toFixed(2)}px`
      }
      const x = createSpring(0, write, config)
      const y = createSpring(0, write, config)

      let frame = 0
      let last: PointerEvent | null = null

      const release = () => {
        delete node.dataset.magnetic
        x.set(0)
        y.set(0)
      }

      const flush = () => {
        frame = 0
        if (!last) return
        const rect = node.getBoundingClientRect()
        // Measure the resting position: the rect already includes the current pull.
        const cx = rect.left + rect.width / 2 - x.get()
        const cy = rect.top + rect.height / 2 - y.get()
        const dx = last.clientX - cx
        const dy = last.clientY - cy
        const outside = Math.hypot(
          Math.max(Math.abs(dx) - rect.width / 2, 0),
          Math.max(Math.abs(dy) - rect.height / 2, 0),
        )
        if (outside > radius) {
          if (node.dataset.magnetic) release()
          return
        }
        // Full pull over the element, easing to nothing at the edge of the field: no snap.
        const falloff = radius > 0 ? 1 - (outside / radius) ** 2 : 1
        node.dataset.magnetic = "active"
        x.set(dx * strength * falloff)
        y.set(dy * strength * falloff)
      }

      const handleMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        last = event
        if (!frame) frame = requestAnimationFrame(flush)
      }
      const handleOut = (event: PointerEvent) => {
        if (!event.relatedTarget) release()
      }

      window.addEventListener("pointermove", handleMove, { passive: true })
      document.addEventListener("pointerout", handleOut)
      window.addEventListener("blur", release)
      return () => {
        cancelAnimationFrame(frame)
        x.stop()
        y.stop()
        window.removeEventListener("pointermove", handleMove)
        document.removeEventListener("pointerout", handleOut)
        window.removeEventListener("blur", release)
        node.style.translate = ""
        delete node.dataset.magnetic
      }
    }, [enabled, strength, radius, stiffness, damping, mass])

    return (
      <Slot ref={ref} {...props}>
        {children}
      </Slot>
    )
  },
)

Magnetic.displayName = "Magnetic"
