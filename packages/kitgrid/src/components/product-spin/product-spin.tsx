"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useDismiss } from "../../hooks/use-dismiss.js"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useInView } from "../../hooks/use-in-view.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { createSpring, type Spring } from "../../hooks/use-spring.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

/** An inclusive frame range (wrapping around when `from > to`) or an explicit list of frames. */
export type ProductSpinFrameSet = { from: number; to: number } | readonly number[]

export interface ProductSpinHotspot {
  id: string
  /** Names the pin for assistive tech and titles its card. */
  label: string
  content?: ReactNode
  /** Frames on which the feature faces the camera. The pin is hidden on every other frame. */
  frames: ProductSpinFrameSet
  /** Position on the frame, in percent of its width. */
  x: number
  /** Position on the frame, in percent of its height. */
  y: number
}

export interface ProductSpinLabels {
  /** Names the rotation slider. */
  slider?: (alt: string) => string
  valueText?: (degrees: number) => string
  controls?: string
  play?: string
  pause?: string
  previous?: string
  next?: string
  zoomIn?: string
  zoomOut?: string
  hint?: string
  hintTouch?: string
  loading?: string
}

export interface ProductSpinProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** Image URLs in rotation order. */
  frames?: readonly string[]
  /** Builds each frame URL from its index, together with `frameCount`. */
  src?: (index: number) => string
  frameCount?: number
  /** Describes the product. Read as part of the slider's name. */
  alt: string
  initialFrame?: number
  /** Turn slowly until the first interaction. Pauses offscreen and in background tabs. */
  autoplay?: boolean
  /** Autoplay speed in degrees per second. */
  speed?: number
  /** Wrap from the last frame to the first. Turn off for partial turns. */
  loop?: boolean
  /** Invert the drag and autoplay direction for sequences shot the other way round. */
  reverse?: boolean
  /** Turns per full-width drag. */
  sensitivity?: number
  /** Keep turning after a fling, then settle on a frame. */
  inertia?: boolean
  /** Double-click or the zoom button magnifies the frame under the pointer. */
  zoom?: boolean
  zoomScale?: number
  hotspots?: readonly ProductSpinHotspot[]
  onFrameChange?: (frame: number, degrees: number) => void
  /** Width / height of the stage, e.g. `16 / 10` or `1.6`. */
  aspectRatio?: number | string
  /** Play, previous, next, zoom and the degree dial. */
  controls?: boolean
  /**
   * For product shots on white: multiplies the frames into a lit stage, so the white backdrop
   * disappears on light themes and becomes a studio sweep on dark ones.
   */
  blend?: boolean
  /** Load the first frame eagerly with high priority (above-the-fold product pages). */
  priority?: boolean
  labels?: ProductSpinLabels
}

const defaultLabels: Required<ProductSpinLabels> = {
  slider: (alt) => `${alt}, 360 degree view`,
  valueText: (degrees) => `Rotated ${degrees} degrees`,
  controls: "360 view controls",
  play: "Play rotation",
  pause: "Pause rotation",
  previous: "Rotate left",
  next: "Rotate right",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  hint: "Drag to rotate",
  hintTouch: "Swipe to rotate",
  loading: "Loading 360° view",
}

const wrap = (value: number, total: number) => ((value % total) + total) % total

/** True when `frame` belongs to the set. */
export const isFrameInSet = (set: ProductSpinFrameSet, frame: number): boolean => {
  if (!("from" in set)) return set.includes(frame)
  return set.from <= set.to
    ? frame >= set.from && frame <= set.to
    : frame >= set.from || frame <= set.to
}

const toRatio = (value: number | string | undefined): number => {
  if (typeof value === "number") return value > 0 ? value : 1.6
  if (!value) return 1.6
  const [width, height] = value.split("/").map((part) => Number.parseFloat(part))
  if (width && height) return width / height
  return width || 1.6
}

/** Coarse frames first, so a rough spin works within the first few requests. */
const loadOrder = (total: number, start: number): number[] => {
  const order: number[] = []
  const seen = new Uint8Array(total)
  for (let stride = 16; stride >= 1; stride /= 2) {
    if (stride > 1 && stride * 2 > total) continue
    for (let offset = 0; offset < total; offset += stride) {
      const index = (start + offset) % total
      if (!seen[index]) {
        seen[index] = 1
        order.push(index)
      }
    }
  }
  return order
}

const loadImage = (image: HTMLImageElement): Promise<boolean> =>
  new Promise((resolve) => {
    image.onload = () => {
      // decode() keeps the bitmap ready, so swapping the visible src never paints a blank frame.
      if (typeof image.decode === "function")
        image.decode().then(
          () => resolve(true),
          () => resolve(true),
        )
      else resolve(true)
    }
    image.onerror = () => resolve(false)
  })

const subscribeVisibility = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify)
  return () => document.removeEventListener("visibilitychange", notify)
}

const useDocumentVisible = () =>
  useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => true,
  )

const PARALLEL = 6
const MAX_FLING = 1 / 500

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

const PlayIcon = () => (
  <Icon>
    <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10.2-6.5a.5.5 0 0 0 0-.84L8.77 5.08A.5.5 0 0 0 8 5.5Z" />
  </Icon>
)
const PauseIcon = () => (
  <Icon>
    <path d="M9 5v14M15 5v14" />
  </Icon>
)
const TurnIcon = ({ flip = false }: { flip?: boolean }) => (
  <Icon>
    <g transform={flip ? "matrix(-1 0 0 1 24 0)" : undefined}>
      <path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.5" />
      <path d="M4 4v4.5h4.5" />
    </g>
  </Icon>
)
const ZoomIcon = ({ out = false }: { out?: boolean }) => (
  <Icon>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.9-4.9M7.75 10.5h5.5" />
    {!out && <path d="M10.5 7.75v5.5" />}
  </Icon>
)
const OrbitIcon = () => (
  <Icon>
    <path d="M18.5 9.1c1.6.8 2.5 1.8 2.5 2.9 0 2.5-4 4.5-9 4.5S3 14.5 3 12s4-4.5 9-4.5" />
    <path d="m9.5 14.25 2.75 2.25-2.25 2.75" />
    <circle cx="12" cy="7.5" r="1.25" fill="currentColor" stroke="none" />
  </Icon>
)
const PlusIcon = () => (
  <Icon>
    <path d="M12 6.5v11M6.5 12h11" />
  </Icon>
)

interface Drag {
  id: number
  x: number
  start: number
  samples: { t: number; x: number }[]
}

interface Engine {
  /** Continuous frame position. Unbounded while looping. */
  pos: number
  /** The frame the slider reports. */
  frame: number
  /** The frame the image shows: the nearest one that has loaded. */
  shown: number
  loaded: boolean[]
}

/**
 * A 360° product viewer built from an image sequence. Drag, fling, scroll, scrub the dial or use
 * the arrow keys to turn it; frames stream in coarse-to-fine behind an orbit progress ring.
 */
export const ProductSpin = forwardRef<HTMLDivElement, ProductSpinProps>(
  (
    {
      frames,
      src,
      frameCount = 0,
      alt,
      initialFrame = 0,
      autoplay = false,
      speed = 30,
      loop = true,
      reverse = false,
      sensitivity = 1,
      inertia = true,
      zoom = true,
      zoomScale = 2.4,
      hotspots,
      onFrameChange,
      aspectRatio,
      controls = true,
      blend = false,
      priority = false,
      labels,
      className,
      style,
      onFocus,
      ...props
    },
    forwardedRef,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const list =
      frames ??
      (src ? Array.from({ length: Math.max(0, frameCount) }, (_, i) => src(i)) : [])
    const total = list.length
    // Inline `src` callbacks rebuild the list every render; this key only changes with the set.
    const listKey = total ? `${total}|${list[0]}|${list[total - 1]}` : ""
    const start = total ? wrap(Math.round(initialFrame), total) : 0
    const degreesOf = (frame: number) =>
      total ? Math.round((frame * 360) / total) % 360 : 0
    const startDegrees = degreesOf(start)
    const ratio = toRatio(aspectRatio)

    const reduced = useReducedMotion()
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const surfaceRef = useRef<HTMLDivElement>(null)
    const mediaRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const pinsRef = useRef<HTMLDivElement>(null)
    const dialArc = useRef<SVGCircleElement>(null)
    const dialKnob = useRef<SVGGElement>(null)
    const readout = useRef<HTMLSpanElement>(null)
    const loaderArc = useRef<SVGCircleElement>(null)
    const loaderDot = useRef<SVGGElement>(null)
    const loaderValue = useRef<HTMLSpanElement>(null)
    const baseId = useId()

    const nearby = useInView(local, { once: true, amount: 0, rootMargin: "320px" })
    const onScreen = useInView(local, { once: false, amount: 0 })
    const pageVisible = useDocumentVisible()

    const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle")
    const [playing, setPlaying] = useState(autoplay)
    const [interacted, setInteracted] = useState(false)
    const [zoomed, setZoomed] = useState(false)
    const [openId, setOpenId] = useState<string | null>(null)

    const engine = useRef<Engine>({
      pos: start,
      frame: start,
      shown: start,
      loaded: [],
    })
    const listRef = useRef(list)
    const drag = useRef<Drag | null>(null)
    const fling = useRef(0)
    const turn = useRef<{ spring: Spring; target: number } | null>(null)
    const lens = useRef<{ scale: Spring; x: Spring; y: Spring } | null>(null)
    const live = useRef({ zoomed, openId, reduced, interacted })

    useIsomorphicLayoutEffect(() => {
      listRef.current = list
      live.current = { zoomed, openId, reduced, interacted }
    })

    const direction = reverse ? -1 : 1
    const framesPerPixel = () =>
      (total * sensitivity) / Math.max(surfaceRef.current?.clientWidth ?? 0, 1)

    const nearestLoaded = (frame: number): number => {
      const { loaded } = engine.current
      if (loaded[frame]) return frame
      for (let distance = 1; distance <= total / 2; distance++) {
        for (const candidate of [frame + distance, frame - distance]) {
          const index = loop ? wrap(candidate, total) : candidate
          if (index >= 0 && index < total && loaded[index]) return index
        }
      }
      return -1
    }

    const showImage = () => {
      const image = imageRef.current
      const best = nearestLoaded(engine.current.frame)
      const next = listRef.current[best]
      if (!image || best < 0 || best === engine.current.shown || !next) return
      engine.current.shown = best
      image.src = next
    }

    const syncPins = (frame: number) => {
      const layer = pinsRef.current
      if (!layer || !hotspots) return
      for (const node of layer.querySelectorAll<HTMLElement>("[data-hotspot-index]")) {
        const spot = hotspots[Number(node.dataset.hotspotIndex)]
        node.toggleAttribute("data-visible", !!spot && isFrameInSet(spot.frames, frame))
      }
      const open = live.current.openId
      const spot = open ? hotspots.find((item) => item.id === open) : undefined
      if (spot && !isFrameInSet(spot.frames, frame)) setOpenId(null)
    }

    const syncFrame = (frame: number) => {
      const degrees = degreesOf(frame)
      const surface = surfaceRef.current
      surface?.setAttribute("aria-valuenow", String(degrees))
      surface?.setAttribute("aria-valuetext", text.valueText(degrees))
      local.current?.style.setProperty("--_angle", `${degrees}deg`)
      dialArc.current?.style.setProperty("stroke-dashoffset", String(360 - degrees))
      dialKnob.current?.setAttribute("transform", `rotate(${degrees} 22 22)`)
      if (readout.current) readout.current.textContent = `${degrees}°`
      syncPins(frame)
      onFrameChange?.(frame, degrees)
    }

    const paint = useEventCallback((position: number) => {
      if (!total) return
      const pos = loop ? position : clamp(position, 0, total - 1)
      engine.current.pos = pos
      const frame = wrap(Math.round(pos), total)
      if (frame !== engine.current.frame) {
        engine.current.frame = frame
        syncFrame(frame)
      }
      showImage()
    })

    const stopMotion = () => {
      cancelAnimationFrame(fling.current)
      fling.current = 0
      turn.current?.spring.stop()
      if (turn.current) turn.current.target = Number.NaN
    }

    const engage = () => {
      setPlaying(false)
      if (!live.current.interacted) setInteracted(true)
    }

    const turnTo = (target: number) => {
      const motion = turn.current
      const goal = loop ? target : clamp(target, 0, total - 1)
      if (!motion || live.current.reduced) {
        stopMotion()
        paint(goal)
        return
      }
      cancelAnimationFrame(fling.current)
      fling.current = 0
      if (Number.isNaN(motion.target)) motion.spring.jump(engine.current.pos)
      motion.target = goal
      motion.spring.set(goal)
    }

    const turnBy = (steps: number) => {
      const motion = turn.current
      const from =
        motion && !Number.isNaN(motion.target)
          ? motion.target
          : Math.round(engine.current.pos)
      turnTo(from + steps)
    }

    const settle = () => turnTo(Math.round(engine.current.pos))

    const startFling = (velocity: number) => {
      let speedNow = clamp(velocity, -total * MAX_FLING, total * MAX_FLING)
      let last = performance.now()
      const step = (now: number) => {
        const dt = Math.min(Math.max(now - last, 0), 64) || 16
        last = now
        // Exponential decay with a ~0.3s time constant, close to native momentum scrolling.
        speedNow *= Math.exp(-dt / 300)
        const next = engine.current.pos + speedNow * dt
        paint(next)
        const pinned = !loop && (next <= 0 || next >= total - 1)
        if (pinned || Math.abs(speedNow) < 0.0025) {
          fling.current = 0
          settle()
          return
        }
        fling.current = requestAnimationFrame(step)
      }
      fling.current = requestAnimationFrame(step)
    }

    // Springs live for the lifetime of the element and write straight to the DOM.
    useEffect(() => {
      const media = mediaRef.current
      const spring = createSpring(
        engine.current.pos,
        (value) => {
          paint(value)
          const motion = turn.current
          if (motion && value === motion.target) motion.target = Number.NaN
        },
        { stiffness: 140, damping: 22, precision: 0.002 },
      )
      turn.current = { spring, target: Number.NaN }

      const write = () => {
        if (!media) return
        const scale = scaleSpring.get()
        if (scale <= 1.0005) {
          media.style.removeProperty("transform")
          media.style.removeProperty("transform-origin")
          return
        }
        media.style.transformOrigin = `${(lensX.get() * 100).toFixed(2)}% ${(lensY.get() * 100).toFixed(2)}%`
        media.style.transform = `scale(${scale.toFixed(4)})`
      }
      const config = { stiffness: 200, damping: 26, precision: 0.0005 }
      const scaleSpring = createSpring(1, write, config)
      const lensX = createSpring(0.5, write, { ...config, stiffness: 150 })
      const lensY = createSpring(0.5, write, { ...config, stiffness: 150 })
      lens.current = { scale: scaleSpring, x: lensX, y: lensY }

      return () => {
        spring.stop()
        scaleSpring.stop()
        lensX.stop()
        lensY.stop()
        cancelAnimationFrame(fling.current)
        turn.current = null
        lens.current = null
      }
    }, [paint])

    // A new sequence starts over at the initial frame.
    const seenKey = useRef(listKey)
    useIsomorphicLayoutEffect(() => {
      if (seenKey.current === listKey) return
      seenKey.current = listKey
      stopMotion()
      engine.current = { pos: start, frame: -1, shown: start, loaded: [] }
      paint(start)
      setStatus("idle")
    }, [listKey])

    useEffect(() => {
      if (!nearby || !total) return
      const sources = listRef.current
      const loaded = engine.current.loaded
      const pending: HTMLImageElement[] = []
      const order = loadOrder(total, start)
      let cursor = 0
      let active = 0
      let done = 0
      let cancelled = false
      setStatus("loading")

      const progress = () => {
        const fraction = done / total
        loaderArc.current?.style.setProperty("stroke-dashoffset", String(1 - fraction))
        loaderDot.current?.style.setProperty(
          "transform",
          `rotate(${fraction * 360}deg)`,
        )
        if (loaderValue.current)
          loaderValue.current.textContent = `${Math.round(fraction * 100)}%`
      }

      const pump = () => {
        while (!cancelled && active < PARALLEL && cursor < order.length) {
          const index = order[cursor++] as number
          const url = sources[index]
          if (!url) continue
          const image = new Image()
          image.decoding = "async"
          image.setAttribute("fetchpriority", index === start ? "high" : "low")
          pending.push(image)
          active++
          void loadImage(image).then((ok) => {
            if (cancelled) return
            active--
            done++
            loaded[index] = ok
            progress()
            showImage()
            if (done === total) setStatus("ready")
            else pump()
          })
          image.src = url
        }
      }

      progress()
      pump()
      return () => {
        cancelled = true
        for (const image of pending) {
          image.onload = null
          image.onerror = null
        }
      }
    }, [nearby, listKey])

    const spinning =
      playing &&
      !reduced &&
      onScreen &&
      pageVisible &&
      status === "ready" &&
      !zoomed &&
      openId === null &&
      total > 1

    useEffect(() => {
      if (!spinning) return
      let frame = 0
      let last = performance.now()
      let heading = direction
      const framesPerMs = (speed / 360) * total * 0.001
      const tick = (now: number) => {
        const dt = Math.min(Math.max(now - last, 0), 64) || 16
        last = now
        let next = engine.current.pos + heading * framesPerMs * dt
        if (!loop && (next >= total - 1 || next <= 0)) {
          heading = -heading
          next = clamp(next, 0, total - 1)
        }
        paint(next)
        frame = requestAnimationFrame(tick)
      }
      stopMotion()
      frame = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(frame)
    }, [spinning, speed, direction, loop, total, paint])

    useEffect(() => {
      const lensNow = lens.current
      if (!lensNow) return
      const target = zoomed ? zoomScale : 1
      if (reduced) lensNow.scale.jump(target)
      else lensNow.scale.set(target)
    }, [zoomed, zoomScale, reduced])

    const handleWheel = useEventCallback((event: WheelEvent) => {
      if (live.current.zoomed || total < 2) return
      // Vertical intent belongs to the page.
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()
      engage()
      stopMotion()
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? (surfaceRef.current?.clientWidth ?? 800)
            : 1
      paint(engine.current.pos + event.deltaX * unit * framesPerPixel() * direction)
    })

    useEffect(() => {
      const surface = surfaceRef.current
      if (!surface) return
      surface.addEventListener("wheel", handleWheel, { passive: false })
      return () => surface.removeEventListener("wheel", handleWheel)
    }, [handleWheel])

    useDismiss({
      enabled: openId !== null,
      refs: [pinsRef],
      onDismiss: (reason) => {
        const id = openId
        setOpenId(null)
        if (reason !== "escape" || !id) return
        const pins =
          pinsRef.current?.querySelectorAll<HTMLElement>("[data-hotspot-id]") ?? []
        for (const pin of pins)
          if (pin.dataset.hotspotId === id) pin.querySelector("button")?.focus()
      },
    })

    const aimLens = (
      point: { clientX: number; clientY: number },
      immediate = false,
    ) => {
      const lensNow = lens.current
      const surface = surfaceRef.current
      if (!lensNow || !surface) return
      const rect = surface.getBoundingClientRect()
      const u = clamp((point.clientX - rect.left) / (rect.width || 1), 0, 1)
      const v = clamp((point.clientY - rect.top) / (rect.height || 1), 0, 1)
      if (immediate || live.current.reduced) {
        lensNow.x.jump(u)
        lensNow.y.jump(v)
      } else {
        lensNow.x.set(u)
        lensNow.y.set(v)
      }
    }

    const setZoom = (next: boolean) => {
      setZoomed(next)
      if (next) setOpenId(null)
    }

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !total) return
      engage()
      if (live.current.zoomed) {
        aimLens(event)
        return
      }
      stopMotion()
      event.currentTarget.setPointerCapture?.(event.pointerId)
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        start: engine.current.pos,
        samples: [{ t: event.timeStamp, x: event.clientX }],
      }
      local.current?.setAttribute("data-dragging", "")
    }

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (live.current.zoomed) {
        if (event.pointerType === "mouse" || event.buttons) aimLens(event)
        return
      }
      const current = drag.current
      if (!current || current.id !== event.pointerId) return
      const dx = event.clientX - current.x
      paint(current.start - dx * framesPerPixel() * direction)
      current.samples.push({ t: event.timeStamp, x: event.clientX })
      while (
        current.samples.length > 2 &&
        event.timeStamp - (current.samples[0]?.t ?? 0) > 100
      )
        current.samples.shift()
    }

    const endDrag = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const current = drag.current
      if (!current || current.id !== event.pointerId) return
      drag.current = null
      local.current?.removeAttribute("data-dragging")
      if (event.currentTarget.hasPointerCapture?.(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId)
      if (cancelled) {
        settle()
        return
      }
      const first = current.samples[0]
      const elapsed = first ? event.timeStamp - first.t : 0
      const velocity =
        first && elapsed > 0 && elapsed < 120
          ? (-(event.clientX - first.x) / elapsed) * framesPerPixel() * direction
          : 0
      if (inertia && !live.current.reduced && Math.abs(velocity) > 0.004)
        startFling(velocity)
      else settle()
    }

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!total) return
      const page = Math.max(1, Math.round(total / 8))
      const step = event.shiftKey ? page : 1
      const base = Math.round(engine.current.pos)
      let next: number | null = null
      if (event.key === "ArrowRight" || event.key === "ArrowUp") next = base + step
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown")
        next = base - step
      else if (event.key === "PageUp") next = base + page
      else if (event.key === "PageDown") next = base - page
      else if (event.key === "Home") next = 0
      else if (event.key === "End") next = total - 1
      else if (event.key === "Escape" && live.current.zoomed) {
        event.preventDefault()
        setZoom(false)
        return
      }
      if (next === null) return
      event.preventDefault()
      engage()
      stopMotion()
      paint(next)
    }

    const dialPosition = (event: ReactPointerEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)
      const degrees = wrap((Math.atan2(dx, -dy) * 180) / Math.PI, 360)
      const frame = (degrees / 360) * total
      if (!loop) return clamp(frame, 0, total - 1)
      const current = engine.current.pos
      let delta = frame - wrap(current, total)
      if (delta > total / 2) delta -= total
      if (delta < -total / 2) delta += total
      return current + delta
    }

    const handleDialDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
      if (event.button !== 0 || !total) return
      event.preventDefault()
      engage()
      stopMotion()
      event.currentTarget.setPointerCapture?.(event.pointerId)
      local.current?.setAttribute("data-dragging", "")
      paint(dialPosition(event))
    }

    const handleDialMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
      if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return
      paint(dialPosition(event))
    }

    const handleDialUp = (event: ReactPointerEvent<HTMLSpanElement>) => {
      local.current?.removeAttribute("data-dragging")
      if (event.currentTarget.hasPointerCapture?.(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId)
      settle()
    }

    const mediaRatio = useRef(0)
    const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = event.currentTarget
      const next = naturalHeight ? naturalWidth / naturalHeight : 0
      if (!next || Math.abs(next - mediaRatio.current) < 0.001) return
      mediaRatio.current = next
      local.current?.style.setProperty("--_media", String(next))
    }

    const firstSrc = list[start]
    const visibleAtStart = (spot: ProductSpinHotspot) =>
      isFrameInSet(spot.frames, start)
    const showHint = !interacted && !zoomed && total > 1

    return (
      <div
        ref={ref}
        className={cx(
          "kg-product-spin group/spin relative min-w-0 text-kg-fg [-webkit-tap-highlight-color:transparent]",
          "[--_radius:var(--kg-radius-xl)] [--_stage:var(--kg-product-spin-stage,color-mix(in_oklab,white_88%,var(--kg-bg)))]",
          className,
        )}
        data-blend={blend || undefined}
        data-status={status}
        data-zoomed={zoomed || undefined}
        data-spinning={spinning || undefined}
        aria-busy={status === "loading" || undefined}
        style={
          {
            "--_ratio": String(ratio),
            "--_media": String(ratio),
            "--_angle": `${startDegrees}deg`,
            ...style,
          } as CSSProperties
        }
        onFocus={(event) => {
          onFocus?.(event)
          if (event.target === surfaceRef.current) setPlaying(false)
        }}
        {...props}
      >
        <div className="kg-product-spin__frame relative @container-[size] aspect-(--_ratio) rounded-(--_radius) border-2 border-kg-ink bg-kg-surface-sunken shadow-kg-sm">
          <div
            ref={surfaceRef}
            className={cx(
              "kg-product-spin__surface absolute inset-0 isolate cursor-grab touch-pan-y overflow-hidden rounded-[inherit] outline-none select-none [-webkit-user-select:none]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring group-data-dragging/spin:cursor-grabbing",
              blend && "bg-(--_stage)",
              zoomed && "cursor-zoom-out touch-none",
            )}
            role="slider"
            tabIndex={0}
            aria-label={text.slider(alt)}
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={startDegrees}
            aria-valuetext={text.valueText(startDegrees)}
            aria-orientation="horizontal"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => endDrag(event, false)}
            onPointerCancel={(event) => endDrag(event, true)}
            onLostPointerCapture={(event) => endDrag(event, false)}
            onDoubleClick={(event) => {
              if (!zoom) return
              if (!zoomed) aimLens(event, true)
              setZoom(!zoomed)
            }}
            onKeyDown={handleKeyDown}
          >
            <div
              ref={mediaRef}
              className={cx(
                "kg-product-spin__media",
                mediaBox,
                blend && "mix-blend-multiply",
                zoomed && "will-change-transform",
              )}
            >
              {!firstSrc && (
                <span className="kg-product-spin__placeholder absolute inset-x-[26%] inset-y-[22%] rounded-kg-xl border-2 border-kg-ink bg-kg-paper-sage shadow-kg-sm" />
              )}
              {firstSrc && (
                <img
                  ref={imageRef}
                  className="kg-product-spin__image pointer-events-none block size-full object-contain select-none [-webkit-user-drag:none]"
                  src={firstSrc}
                  alt=""
                  draggable={false}
                  decoding={priority ? "sync" : "async"}
                  onLoad={handleImageLoad}
                  {...(priority ? { fetchPriority: "high" as const } : null)}
                />
              )}
            </div>
          </div>

          {hotspots && hotspots.length > 0 && (
            <div
              ref={pinsRef}
              className={cx("kg-product-spin__pins pointer-events-none z-2", mediaBox)}
            >
              {hotspots.map((spot, index) => {
                const open = openId === spot.id
                const cardId = `${baseId}-spot-${index}`
                return (
                  <div
                    key={spot.id}
                    className={cx(
                      "kg-product-spin__pin group/pin invisible absolute size-0 transition-[visibility] delay-(--kg-duration-base) duration-0 data-open:z-1",
                      !zoomed && "data-visible:visible data-visible:delay-0",
                    )}
                    data-hotspot-index={index}
                    data-hotspot-id={spot.id}
                    data-visible={visibleAtStart(spot) || undefined}
                    data-open={open || undefined}
                    data-side={spot.x > 58 ? "left" : "right"}
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  >
                    <button
                      type="button"
                      className={cx(
                        "kg-product-spin__pin-button pointer-events-auto absolute top-0 left-0 grid size-[1.875rem] cursor-pointer place-items-center rounded-full border-2 border-kg-surface bg-kg-accent p-0 text-kg-accent-fg shadow-kg-sm",
                        "-translate-1/2 scale-40 -rotate-90 opacity-0 transition-[opacity,scale,rotate,box-shadow] duration-(--kg-duration-base) ease-kg-out",
                        "group-data-visible/pin:scale-100 group-data-visible/pin:rotate-0 group-data-visible/pin:opacity-100 hover:shadow-kg-md",
                        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kg-ring",
                        "[&_svg]:size-[0.95rem] [&_svg]:transition-[rotate] [&_svg]:duration-(--kg-duration-base) [&_svg]:ease-kg-out group-data-open/pin:[&_svg]:rotate-45",
                      )}
                      aria-label={spot.label}
                      aria-expanded={open}
                      aria-controls={open ? cardId : undefined}
                      onClick={() => {
                        engage()
                        setOpenId(open ? null : spot.id)
                      }}
                    >
                      <PlusIcon />
                    </button>
                    {open && (
                      <div
                        id={cardId}
                        className={cx(
                          "kg-product-spin__card pointer-events-auto absolute top-0 w-[min(15rem,60cqw)] rounded-kg-lg border-2 border-kg-ink bg-kg-surface px-4 py-3.5 text-kg-fg shadow-kg-md",
                          "animate-[kg-product-spin-card-in_var(--kg-duration-slow)_var(--kg-ease-out)_both] motion-reduce:animate-none [[data-kg-motion=reduce]_&]:animate-none",
                          spot.x > 58
                            ? "right-0 left-auto origin-right -translate-x-6 -translate-y-1/2"
                            : "left-0 origin-left translate-x-6 -translate-y-1/2",
                        )}
                        role="group"
                        aria-label={spot.label}
                      >
                        <p className="kg-product-spin__card-title m-0 text-kg-sm font-[650] tracking-[-0.01em]">
                          {spot.label}
                        </p>
                        {spot.content && (
                          <div className="kg-product-spin__card-body mt-1 text-kg-sm leading-normal text-kg-fg-muted [&>:first-child]:mt-0 [&>:last-child]:mb-0">
                            {spot.content}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div
            className={cx(
              "kg-product-spin__loader pointer-events-none absolute top-1/2 left-1/2 z-2 grid size-[5.25rem] -translate-1/2 place-items-center rounded-full border-2 border-kg-ink bg-kg-surface shadow-kg-md",
              status === "loading"
                ? "visible scale-100 opacity-100 [transition:opacity_var(--kg-duration-slow)_var(--kg-ease-out)_180ms,scale_var(--kg-duration-slow)_var(--kg-ease-out)_180ms,visibility_0s_linear_180ms]"
                : "invisible scale-90 opacity-0 [transition:opacity_var(--kg-duration-slow)_var(--kg-ease-out),scale_var(--kg-duration-slow)_var(--kg-ease-out),visibility_0s_linear_var(--kg-duration-slow)]",
            )}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 80 80"
              className="kg-product-spin__loader-ring absolute inset-1.5 size-[calc(100%-0.75rem)] fill-none overflow-visible [&_g]:origin-[40px_40px] [&_g]:transition-transform [&_g]:duration-(--kg-duration-slow) [&_g]:ease-kg-out [&_g]:[transform-box:view-box]"
            >
              <circle
                cx="40"
                cy="40"
                r="34"
                className="kg-product-spin__loader-track stroke-kg-border [stroke-width:2.5]"
              />
              <circle
                ref={loaderArc}
                cx="40"
                cy="40"
                r="34"
                pathLength={1}
                className="kg-product-spin__loader-arc stroke-kg-ink [stroke-dasharray:1] [stroke-dashoffset:1] [stroke-linecap:round] [stroke-width:2.5] transition-[stroke-dashoffset] duration-(--kg-duration-slow) ease-kg-out"
                transform="rotate(-90 40 40)"
              />
              <g ref={loaderDot}>
                <circle
                  cx="40"
                  cy="6"
                  r="3.5"
                  className="kg-product-spin__loader-dot fill-kg-ink stroke-kg-surface [stroke-width:2]"
                />
              </g>
            </svg>
            <span
              ref={loaderValue}
              className="kg-product-spin__loader-value font-kg-mono text-kg-sm font-medium text-kg-fg tabular-nums"
            >
              0%
            </span>
            <span className="kg-product-spin__loader-label absolute top-[calc(100%+0.625rem)] left-1/2 -translate-x-1/2 rounded-full border-2 border-kg-ink bg-kg-surface px-2.5 py-[2px] text-kg-xs font-[550] whitespace-nowrap text-kg-fg-muted [@container(max-height:17rem)]:hidden">
              {text.loading}
            </span>
          </div>

          <span
            className={cx(
              "kg-product-spin__hint pointer-events-none absolute top-3.5 left-1/2 z-2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 border-kg-ink bg-kg-surface py-1.25 ps-2.25 pe-3 text-kg-xs font-[550] whitespace-nowrap text-kg-fg shadow-kg-xs",
              "transition-[opacity,translate] duration-(--kg-duration-slower) ease-kg-out [&_svg]:size-4 [&_svg]:text-kg-fg",
              !showHint && "-translate-y-1 opacity-0",
            )}
            data-hidden={!showHint || undefined}
            aria-hidden="true"
          >
            <OrbitIcon />
            <span className="kg-product-spin__hint-fine pointer-coarse:hidden">{text.hint}</span>
            <span className="kg-product-spin__hint-coarse hidden pointer-coarse:inline">
              {text.hintTouch}
            </span>
          </span>

          {controls && (
            <div
              className={cx(
                "kg-product-spin__controls absolute bottom-3 left-1/2 z-2 flex origin-bottom -translate-x-1/2 items-center gap-[2px] rounded-full border-2 border-kg-ink bg-kg-surface p-1 shadow-kg-md",
                "animate-[kg-product-spin-rise_var(--kg-duration-slower)_var(--kg-ease-out)_both] motion-reduce:animate-none [[data-kg-motion=reduce]_&]:animate-none",
              )}
              role="group"
              aria-label={text.controls}
            >
              {!reduced && total > 1 && (
                <button
                  type="button"
                  className={cx(controlClass)}
                  aria-label={playing ? text.pause : text.play}
                  onClick={() => {
                    if (!live.current.interacted) setInteracted(true)
                    setZoom(false)
                    setPlaying((value) => !value)
                  }}
                >
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
              )}
              <button
                type="button"
                className={cx(controlClass)}
                aria-label={text.previous}
                disabled={total < 2}
                onClick={() => {
                  engage()
                  turnBy(-Math.max(1, Math.round(total / 24)) * direction)
                }}
              >
                <TurnIcon />
              </button>
              <span
                className="kg-product-spin__dial ms-[2px] grid size-10 cursor-grab touch-none group-data-dragging/spin:cursor-grabbing [&_svg]:size-full [&_svg]:fill-none [&_svg]:overflow-visible"
                aria-hidden="true"
                onPointerDown={handleDialDown}
                onPointerMove={handleDialMove}
                onPointerUp={handleDialUp}
                onPointerCancel={handleDialUp}
              >
                <svg viewBox="0 0 44 44">
                  <circle
                    cx="22"
                    cy="22"
                    r="17"
                    className="kg-product-spin__dial-track stroke-kg-border [stroke-width:1.5]"
                  />
                  {Array.from({ length: 8 }, (_, tick) => (
                    <line
                      key={tick}
                      x1="22"
                      y1="8.5"
                      x2="22"
                      y2={tick % 2 ? "10" : "11"}
                      className="kg-product-spin__dial-tick stroke-kg-fg-faint [stroke-linecap:round] [stroke-width:1.25]"
                      transform={`rotate(${tick * 45} 22 22)`}
                    />
                  ))}
                  <circle
                    ref={dialArc}
                    cx="22"
                    cy="22"
                    r="17"
                    pathLength={360}
                    className="kg-product-spin__dial-arc stroke-kg-ink [stroke-dasharray:360] [stroke-linecap:round] [stroke-width:2.5]"
                    transform="rotate(-90 22 22)"
                    style={{ strokeDashoffset: 360 - startDegrees }}
                  />
                  <g ref={dialKnob} transform={`rotate(${startDegrees} 22 22)`}>
                    <circle
                      cx="22"
                      cy="5"
                      r="3.25"
                      className="kg-product-spin__dial-knob fill-kg-ink stroke-kg-surface [stroke-width:1.75]"
                    />
                  </g>
                </svg>
              </span>
              <span
                ref={readout}
                className="kg-product-spin__readout min-w-11 ps-[2px] pe-1.5 text-start font-kg-mono text-kg-sm font-medium text-kg-fg tabular-nums"
                aria-hidden="true"
              >
                {`${startDegrees}°`}
              </span>
              <button
                type="button"
                className={cx(controlClass)}
                aria-label={text.next}
                disabled={total < 2}
                onClick={() => {
                  engage()
                  turnBy(Math.max(1, Math.round(total / 24)) * direction)
                }}
              >
                <TurnIcon flip />
              </button>
              {zoom && (
                <button
                  type="button"
                  className={cx(controlClass)}
                  aria-label={zoomed ? text.zoomOut : text.zoomIn}
                  aria-pressed={zoomed}
                  onClick={() => {
                    engage()
                    if (!zoomed) {
                      lens.current?.x.jump(0.5)
                      lens.current?.y.jump(0.5)
                    }
                    setZoom(!zoomed)
                  }}
                >
                  <ZoomIcon out={zoomed} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  },
)

ProductSpin.displayName = "ProductSpin"

/* Media and hotspot pins share one box: the frame, letterboxed to the image's own ratio. */
const mediaBox =
  "absolute inset-0 m-auto h-[min(100cqh,calc(100cqw/(var(--_media))))] w-[min(100cqw,calc(var(--_media)*100cqh))]"

const controlClass = [
  "kg-product-spin__control relative grid size-[2.125rem] cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-kg-fg-muted [&_svg]:size-[1.05rem]",
  "transition-[color,background-color,translate] duration-(--kg-duration-fast) ease-kg-out interactive:hover:bg-kg-muted interactive:hover:text-kg-fg interactive:active:translate-y-px",
  "aria-pressed:bg-kg-paper-sage aria-pressed:text-kg-fg disabled:cursor-not-allowed disabled:opacity-45",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
]
