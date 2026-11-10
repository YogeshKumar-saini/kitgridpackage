"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

export type ImageTrailVariant = "pop" | "stack" | "scatter"

export interface ImageTrailImage {
  src: string
  /** Kept for your own records: trail images are decorative, so `description` names the region. */
  alt?: string
}

export interface ImageTrailProps extends HTMLAttributes<HTMLDivElement> {
  images: ImageTrailImage[]
  /** Distance the pointer travels between two images, in px. */
  threshold?: number
  /** How long each image lives, in ms, from popping in to fading out. */
  lifetime?: number
  /** Size of the recycled image pool: the most images on screen at once. */
  maxActive?: number
  /** `pop` springs in place, `stack` deals each image from the last, `scatter` throws them. */
  variant?: ImageTrailVariant
  /** Width of each image, in px. */
  size?: number
  /** What the region shows, for people who can't see the trail. Rendered visually hidden. */
  description?: string
  children?: ReactNode
}

// Fixed spots for the still collage shown under reduced motion, as [x%, y%, rotation].
const COLLAGE: readonly [number, number, number][] = [
  [20, 34, -7],
  [50, 62, 4],
  [79, 30, -3],
  [34, 74, 8],
  [68, 78, -6],
]

const SPRING_FALLBACK = "cubic-bezier(0.34, 1.56, 0.64, 1)"
const EXIT = "cubic-bezier(0.3, 0, 0.8, 0.15)"
const TAP_SLOP = 10
const TAP_TIME = 450

const random = (min: number, max: number) => min + Math.random() * (max - min)

interface Spawn {
  x: number
  y: number
  /** Where the previous image landed, for variants that travel. */
  fromX: number
  fromY: number
  /** Pointer velocity in px per ms, so images drift the way they were thrown. */
  vx: number
  vy: number
}

const keyframesFor = (
  variant: ImageTrailVariant,
  { x, y, fromX, fromY, vx, vy }: Spawn,
  spring: string,
): Keyframe[] => {
  const at = (px: number, py: number) =>
    `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -50%)`
  const driftX = clamp(vx * 70, -90, 90)
  const driftY = clamp(vy * 70, -90, 90)

  if (variant === "stack") {
    return [
      { opacity: 1, transform: `${at(fromX, fromY)} scale(0.92)`, easing: spring },
      { opacity: 1, transform: `${at(x, y)} scale(1)`, offset: 0.28, easing: "linear" },
      { opacity: 1, transform: `${at(x, y)} scale(1)`, offset: 0.62, easing: EXIT },
      { opacity: 0, transform: `${at(x, y + 24)} scale(0.6)` },
    ]
  }
  if (variant === "scatter") {
    const turn = random(-18, 18)
    const grow = random(0.82, 1.16)
    return [
      {
        opacity: 0,
        transform: `${at(x, y)} rotate(${(turn - Math.sign(turn || 1) * 38).toFixed(1)}deg) scale(0.3)`,
        easing: spring,
      },
      {
        opacity: 1,
        transform: `${at(x, y)} rotate(${turn.toFixed(1)}deg) scale(${grow.toFixed(3)})`,
        offset: 0.3,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      {
        opacity: 1,
        transform: `${at(x + driftX * 0.6, y + driftY * 0.6)} rotate(${(turn * 1.15).toFixed(1)}deg) scale(${grow.toFixed(3)})`,
        offset: 0.7,
        easing: EXIT,
      },
      {
        opacity: 0,
        transform: `${at(x + driftX, y + driftY + 30)} rotate(${(turn * 1.4).toFixed(1)}deg) scale(${(grow * 0.86).toFixed(3)})`,
      },
    ]
  }
  const tilt = random(-4, 4)
  return [
    {
      opacity: 0,
      transform: `${at(x, y)} rotate(${tilt.toFixed(1)}deg) scale(0.45)`,
      easing: spring,
    },
    {
      opacity: 1,
      transform: `${at(x, y)} rotate(${tilt.toFixed(1)}deg) scale(1)`,
      offset: 0.26,
      easing: "linear",
    },
    {
      opacity: 1,
      transform: `${at(x + driftX * 0.3, y + driftY * 0.3)} rotate(${tilt.toFixed(1)}deg) scale(1)`,
      offset: 0.66,
      easing: EXIT,
    },
    {
      opacity: 0,
      transform: `${at(x + driftX * 0.5, y + driftY * 0.5)} rotate(${tilt.toFixed(1)}deg) scale(0.78)`,
    },
  ]
}

/* Paper Layers: each print is an ink-edged card dropped on the surface with a crisp ink offset. */
const print =
  "kg-image-trail__image absolute aspect-[var(--kg-trail-ratio,4/5)] rounded-kg-lg border-2 border-kg-ink bg-kg-muted object-cover shadow-kg-sm select-none"

/**
 * A region where moving the pointer leaves a trail of images that pop in and fade along the
 * path. A fixed pool of image elements is recycled through WAAPI animations, so a long session
 * never grows the DOM or touches React state. Touch scrolling stays untouched: a tap drops an
 * image instead.
 */
export const ImageTrail = forwardRef<HTMLDivElement, ImageTrailProps>(
  (
    {
      images,
      threshold = 80,
      lifetime = 1100,
      maxActive = 10,
      variant = "pop",
      size = 190,
      description,
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const layerRef = useRef<HTMLDivElement>(null)
    const reduced = useReducedMotion()
    const pool = Math.max(1, Math.round(maxActive))

    // Read at spawn time, so changing them mid-gesture never resets the trail.
    const settings = useRef({ images, threshold, lifetime, variant })
    settings.current = { images, threshold, lifetime, variant }

    const sources = images.map((image) => image.src).join("\n")
    useEffect(() => {
      if (reduced || !sources) return
      // Warm the cache so the first lap of the trail never shows an empty frame.
      const warm = sources.split("\n").map((src) => {
        const image = new Image()
        image.decoding = "async"
        image.src = src
        return image
      })
      return () => {
        for (const image of warm) image.src = ""
      }
    }, [sources, reduced])

    useEffect(() => {
      const node = local.current
      const layer = layerRef.current
      if (!node || !layer || reduced) return
      const slots = Array.from(layer.querySelectorAll<HTMLImageElement>("img"))
      const running = new Map<HTMLImageElement, Animation>()
      const spring =
        getComputedStyle(node).getPropertyValue("--kg-ease-spring").trim() ||
        SPRING_FALLBACK
      let cursor = 0
      let shown = 0
      let depth = 1
      let lastX: number | null = null
      let lastY = 0
      let lastTime = 0
      let travelled = 0
      let landedX = 0
      let landedY = 0
      let press: { x: number; y: number; time: number; id: number } | null = null

      const spawn = (
        x: number,
        y: number,
        vx: number,
        vy: number,
        kind?: ImageTrailVariant,
      ) => {
        const { images: list, lifetime: life, variant: chosen } = settings.current
        const slot = slots[cursor]
        const image = list[shown % Math.max(1, list.length)]
        if (!slot || !image) return
        cursor = (cursor + 1) % slots.length
        shown += 1
        running.get(slot)?.cancel()
        if (slot.getAttribute("src") !== image.src) slot.src = image.src
        // Newest on top, without letting z-index climb forever on long sessions.
        depth = depth > 9000 ? 1 : depth + 1
        slot.style.zIndex = String(depth)
        const from =
          shown === 1 ? { fromX: x, fromY: y } : { fromX: landedX, fromY: landedY }
        landedX = x
        landedY = y
        const animation = slot.animate(
          keyframesFor(kind ?? chosen, { x, y, ...from, vx, vy }, spring),
          { duration: Math.max(200, life), fill: "both" },
        )
        running.set(slot, animation)
      }

      const toLocal = (event: PointerEvent) => {
        const rect = node.getBoundingClientRect()
        return { x: event.clientX - rect.left, y: event.clientY - rect.top }
      }

      const handleMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        const { x, y } = toLocal(event)
        if (lastX === null) {
          lastX = x
          lastY = y
          lastTime = event.timeStamp
          return
        }
        const dx = x - lastX
        const dy = y - lastY
        const elapsed = Math.max(1, event.timeStamp - lastTime)
        travelled += Math.hypot(dx, dy)
        lastX = x
        lastY = y
        lastTime = event.timeStamp
        if (travelled < settings.current.threshold) return
        travelled = 0
        spawn(x, y, dx / elapsed, dy / elapsed)
      }
      const handleLeave = () => {
        lastX = null
        travelled = 0
      }
      const handleDown = (event: PointerEvent) => {
        if (event.pointerType !== "touch") return
        const { x, y } = toLocal(event)
        press = { x, y, time: event.timeStamp, id: event.pointerId }
      }
      const handleUp = (event: PointerEvent) => {
        if (!press || event.pointerId !== press.id) return
        const { x, y } = toLocal(event)
        const quick = event.timeStamp - press.time < TAP_TIME
        const still = Math.hypot(x - press.x, y - press.y) < TAP_SLOP
        press = null
        if (quick && still)
          spawn(x, y, 0, 0, settings.current.variant === "stack" ? "pop" : undefined)
      }
      const handleCancel = () => {
        press = null
      }

      node.addEventListener("pointermove", handleMove, { passive: true })
      node.addEventListener("pointerleave", handleLeave)
      node.addEventListener("pointerdown", handleDown, { passive: true })
      node.addEventListener("pointerup", handleUp, { passive: true })
      node.addEventListener("pointercancel", handleCancel)
      return () => {
        node.removeEventListener("pointermove", handleMove)
        node.removeEventListener("pointerleave", handleLeave)
        node.removeEventListener("pointerdown", handleDown)
        node.removeEventListener("pointerup", handleUp)
        node.removeEventListener("pointercancel", handleCancel)
        for (const animation of running.values()) animation.cancel()
      }
    }, [reduced, pool])

    const collage = reduced ? images.slice(0, COLLAGE.length) : []

    return (
      <div
        ref={ref}
        className={cx("kg-image-trail relative isolate min-h-[20rem] cursor-crosshair overflow-clip rounded-kg-xl bg-kg-surface-sunken text-kg-fg data-static:cursor-auto", className)}
        data-variant={variant}
        data-static={reduced || undefined}
        style={{ "--_size": `${size}px`, ...style } as CSSProperties}
        {...props}
      >
        {description && <p className="kg-visually-hidden">{description}</p>}
        <div ref={layerRef} className="kg-image-trail__layer pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          {reduced
            ? collage.map((image, index) => {
                const [x, y, turn] = COLLAGE[index] ?? [50, 50, 0]
                return (
                  <img
                    key={`${image.src}-${index}`}
                    className={cx(print, "top-(--_y) left-(--_x) w-[calc(var(--_size,190px)*0.8)] opacity-100 [transform:translate(-50%,-50%)_rotate(var(--_turn,0deg))] will-change-auto")}
                    data-collage=""
                    src={image.src}
                    alt=""
                    draggable={false}
                    style={
                      {
                        "--_x": `${x}%`,
                        "--_y": `${y}%`,
                        "--_turn": `${turn}deg`,
                      } as CSSProperties
                    }
                  />
                )
              })
            : Array.from({ length: pool }, (_, index) => (
                <img
                  key={index}
                  className={cx(print, "top-0 left-0 w-[var(--_size,190px)] opacity-0 will-change-[transform,opacity]")}
                  alt=""
                  draggable={false}
                  decoding="async"
                />
              ))}
        </div>
        {children !== undefined && (
          <div className="kg-image-trail__content pointer-events-none relative grid h-full min-h-[inherit] place-items-center [&_:is(a,button,input,select,textarea,[tabindex])]:pointer-events-auto">{children}</div>
        )}
      </div>
    )
  },
)

ImageTrail.displayName = "ImageTrail"
