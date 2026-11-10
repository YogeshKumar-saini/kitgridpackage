"use client"

import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { usePlayback } from "../text-reveal/use-playback.js"

export interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  /** Accessible name of the gallery, such as "Spring collection". */
  label: string
  /** The panels, usually images. Each child sits on the ring. */
  children: ReactNode
  /** Idle rotation, in degrees per second. 0 holds still; negative turns the other way. */
  speed?: number
  /** Tilt of the ring toward the viewer, in degrees. */
  tilt?: number
}

/**
 * Panels arranged on a 3D ring that turns slowly, can be flung by dragging, and steps one
 * panel at a time with the arrow keys. The ring's radius comes from CSS trigonometry, so it
 * always fits the panel count.
 */
export const CircularGallery = forwardRef<HTMLDivElement, CircularGalleryProps>(
  (
    { label, children, speed = 8, tilt = -6, className, style, onKeyDown, ...props },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const ringRef = useRef<HTMLDivElement>(null)
    const items = Children.toArray(children)
    const n = Math.max(items.length, 1)
    const stepDeg = 360 / n
    const reduced = useReducedMotion()
    const playing = usePlayback(local, true)
    const state = useRef({ angle: 0, velocity: 0, target: null as number | null, hold: 0 })

    const write = () => {
      ringRef.current?.style.setProperty("--_angle", `${state.current.angle.toFixed(2)}deg`)
    }

    useEffect(() => {
      const root = local.current
      if (!root || !playing) return
      const s = state.current
      const idle = reduced ? 0 : speed
      let frame = 0
      let prev = performance.now()
      let dragging = false
      let lastX = 0

      const tick = (now: number) => {
        const dt = Math.min(Math.max((now - prev) / 1000, 0), 0.05)
        prev = now
        if (s.target !== null) {
          s.angle += (s.target - s.angle) * Math.min(dt * 10, 1)
          if (Math.abs(s.target - s.angle) < 0.05) {
            s.angle = s.target
            s.target = null
            s.hold = now + 1600
          }
        } else if (!dragging) {
          const goal = now < s.hold ? 0 : idle
          s.velocity += (goal - s.velocity) * Math.min(dt * 1.6, 1)
          s.angle += s.velocity * dt
        }
        write()
        frame = requestAnimationFrame(tick)
      }
      if (!reduced || s.target !== null) frame = requestAnimationFrame(tick)

      const down = (event: PointerEvent) => {
        if (event.button !== 0) return
        dragging = true
        s.target = null
        lastX = event.clientX
        root.setPointerCapture?.(event.pointerId)
        root.dataset.dragging = ""
      }
      const move = (event: PointerEvent) => {
        if (!dragging) return
        const delta = (event.clientX - lastX) * 0.3
        lastX = event.clientX
        s.angle += delta
        s.velocity = reduced ? 0 : delta * 60
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
    }, [playing, reduced, speed])

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      const dir = event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0
      if (!dir) return
      event.preventDefault()
      const s = state.current
      const from = s.target ?? s.angle
      const snapped = Math.round(from / stepDeg) * stepDeg + dir * stepDeg
      if (reduced) {
        s.angle = snapped
        s.target = null
        s.velocity = 0
        write()
      } else {
        s.target = snapped
        s.velocity = 0
      }
    }

    return (
      <div
        ref={ref}
        className={cx(
          "kg-circular-gallery relative grid h-[calc(var(--_h)*1.5)] w-full cursor-grab touch-pan-y select-none place-items-center overflow-hidden rounded-kg-xl [--_gap:var(--kg-circular-gallery-gap,1.25rem)] [--_h:var(--kg-circular-gallery-item-height,15rem)] [--_r:calc((var(--_w)_+_var(--_gap))_/_2_/_tan(180deg_/_var(--_n)))] [--_w:var(--kg-circular-gallery-item-width,11rem)] [perspective:calc(var(--_r)_*_3.2_+_600px)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring data-dragging:cursor-grabbing",
          className,
        )}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ "--_n": n, "--_tilt": `${tilt}deg`, ...style } as CSSProperties}
        {...props}
      >
        <div ref={ringRef} className="kg-circular-gallery__ring relative h-(--_h) w-(--_w) [--_angle:0deg] [transform-style:preserve-3d] [transform:translateZ(calc(var(--_r)_*_-1))_rotateX(var(--_tilt))_rotateY(var(--_angle))]">
          {items.map((item, i) => (
            <div
              key={i}
              className="kg-circular-gallery__item absolute inset-0 overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface-raised shadow-kg-md [backface-visibility:hidden] [transform:rotateY(calc(var(--_i)_*_360deg_/_var(--_n)))_translateZ(var(--_r))] [&>img]:pointer-events-none [&>img]:block [&>img]:size-full [&>img]:object-cover"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}`}
              style={{ "--_i": i } as CSSProperties}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    )
  },
)

CircularGallery.displayName = "CircularGallery"
