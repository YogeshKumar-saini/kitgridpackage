"use client"

import {
  Children,
  createContext,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useInView } from "../../hooks/use-in-view.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

/**
 * `snap` is a native scroll-snap rail, `coverflow` turns slides in 3D around the centre, and
 * `stack` deals them from a fanned deck.
 */
export type CarouselVariant = "snap" | "coverflow" | "stack"
export type CarouselIndicator = "dots" | "progress" | "none"

/** Slides per view by container width: `sm` ≥ 36rem, `md` ≥ 52rem, `lg` ≥ 68rem. */
export interface CarouselResponsive {
  base?: number
  sm?: number
  md?: number
  lg?: number
}

export interface CarouselLabels {
  previous?: string
  next?: string
  play?: string
  pause?: string
  /** Names each slide, e.g. "3 of 8". */
  slide?: (position: number, total: number) => string
  goTo?: (position: number, total: number) => string
  /** Polite status after a change, e.g. "Slide 3 of 8". */
  status?: (position: number, total: number) => string
}

export interface CarouselProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue"
> {
  variant?: CarouselVariant
  /** Snap only: a number or a per-width map. Fractions peek at the next slide. */
  slidesPerView?: number | CarouselResponsive
  /** Space between slides: px or any CSS length. */
  gap?: number | string
  /** Wrap from the last slide to the first. */
  loop?: boolean
  /** Advance on a timer: `true` for every 5s, or an interval in ms. Comes with a pause button. */
  autoplay?: boolean | number
  /** Defaults to `progress` for snap rails and `dots` otherwise. */
  indicator?: CarouselIndicator
  /** Previous and next buttons. */
  controls?: boolean
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  /** Names the carousel region. */
  label?: string
  labels?: CarouselLabels
}

const defaultLabels: Required<CarouselLabels> = {
  previous: "Previous slide",
  next: "Next slide",
  play: "Start slide rotation",
  pause: "Pause slide rotation",
  slide: (position, total) => `${position} of ${total}`,
  goTo: (position, total) => `Go to slide ${position} of ${total}`,
  status: (position, total) => `Slide ${position} of ${total}`,
}

interface Shuffle {
  /** The slide that shuffles: the old top card going back, or the card coming forward. */
  slide: number
  kind: "out" | "in"
  /** -1 tosses to the left, 1 to the right. */
  toss: 1 | -1
  serial: number
}

interface SlideContextValue {
  index: number
  total: number
  current: number
  variant: CarouselVariant
  name: string
  shuffle: Shuffle | null
}

const SlideContext = createContext<SlideContextValue | null>(null)

const wrap = (value: number, total: number) =>
  total ? ((value % total) + total) % total : 0

const toLength = (value: number | string | undefined) =>
  typeof value === "number" ? `${value}px` : value

const subscribeVisibility = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify)
  return () => document.removeEventListener("visibilitychange", notify)
}

/** A spring that starts with the release velocity, so a fling flows into its snap point. */
const glide = (
  from: number,
  to: number,
  velocity: number,
  onUpdate: (value: number) => void,
  onDone: () => void,
): (() => void) => {
  let value = from
  let speed = velocity
  let last = performance.now()
  let frame = 0
  const step = (now: number) => {
    const elapsed = Math.min(Math.max((now - last) / 1000, 0), 0.064) || 1 / 60
    last = now
    const steps = Math.ceil(elapsed * 240)
    const dt = elapsed / steps
    for (let i = 0; i < steps; i++) {
      speed += (-180 * (value - to) - 26 * speed) * dt
      value += speed * dt
    }
    if (Math.abs(value - to) < 0.5 && Math.abs(speed) < 5) {
      onUpdate(to)
      onDone()
      return
    }
    onUpdate(value)
    frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
  return () => cancelAnimationFrame(frame)
}

const Chevron = ({ flip = false }: { flip?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={flip ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
  </svg>
)

const PlayPause = ({ playing }: { playing: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {playing ? (
      <path d="M9 5.5v13M15 5.5v13" />
    ) : (
      <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10.2-6.5a.5.5 0 0 0 0-.84L8.77 5.08A.5.5 0 0 0 8 5.5Z" />
    )}
  </svg>
)

interface Drag {
  id: number
  x: number
  scroll: number
  moved: boolean
  samples: { t: number; x: number }[]
}

/**
 * Product rails with real physics: native scroll-snap with mouse drag and momentum, a 3D
 * coverflow driven by scroll-timeline (with a JS fallback), or a fanned stack. Follows the APG
 * carousel pattern, including a pause control for autoplay.
 */
export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      variant = "snap",
      slidesPerView = 1,
      gap,
      loop = false,
      autoplay = false,
      indicator,
      controls = true,
      index: indexProp,
      defaultIndex = 0,
      onIndexChange,
      label = "Carousel",
      labels,
      className,
      style,
      children,
      onKeyDown,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      ...props
    },
    forwardedRef,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const slides = Children.toArray(children).filter(isValidElement)
    const total = slides.length
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const trackRef = useRef<HTMLDivElement>(null)
    const thumbRef = useRef<HTMLSpanElement>(null)
    const reduced = useReducedMotion()
    const onScreen = useInView(local, { once: false, amount: 0.2 })
    const pageVisible = useSyncExternalStore(
      subscribeVisibility,
      () => !document.hidden,
      () => true,
    )
    const scrolls = variant !== "stack"
    const resolvedIndicator = indicator ?? (variant === "snap" ? "progress" : "dots")
    const interval = typeof autoplay === "number" ? autoplay : 5000

    const [rawIndex, setIndex] = useControllableState({
      value: indexProp,
      defaultValue: defaultIndex,
      onChange: onIndexChange,
    })
    const index = clamp(rawIndex, 0, Math.max(total - 1, 0))
    const [edges, setEdges] = useState({ start: true, end: total <= 1 })
    const [playing, setPlaying] = useState(Boolean(autoplay))
    const [held, setHeld] = useState(false)
    const [announce, setAnnounce] = useState(false)

    const [shuffle, setShuffle] = useState<Shuffle | null>(null)
    const fromScroll = useRef(-1)
    const refocus = useRef(false)
    const syncing = useRef<number | null>(null)
    const drag = useRef<Drag | null>(null)
    const stopGlide = useRef<(() => void) | null>(null)
    const suppressClick = useRef(false)
    const frame = useRef(0)

    const slideNodes = () =>
      Array.from(trackRef.current?.children ?? []).filter(
        (node): node is HTMLElement => node instanceof HTMLElement,
      )

    const paddingOf = (track: HTMLElement) =>
      Number.parseFloat(getComputedStyle(track).paddingLeft || "0") || 0

    /** Scroll offset that brings a slide into its snap position. */
    const snapOffset = (
      track: HTMLElement,
      slide: HTMLElement,
      padding = paddingOf(track),
    ) => {
      const max = track.scrollWidth - track.clientWidth
      const target =
        variant === "coverflow"
          ? slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2
          : slide.offsetLeft - padding
      return clamp(target, 0, Math.max(max, 0))
    }

    const nearestIndex = (track: HTMLElement, position: number) => {
      let best = 0
      let distance = Number.POSITIVE_INFINITY
      const padding = paddingOf(track)
      slideNodes().forEach((slide, i) => {
        const gapTo = Math.abs(snapOffset(track, slide, padding) - position)
        if (gapTo < distance - 0.5) {
          distance = gapTo
          best = i
        }
      })
      return best
    }

    const measure = useEventCallback(() => {
      const track = trackRef.current
      if (!track || !scrolls) return
      const max = track.scrollWidth - track.clientWidth
      const left = Math.abs(track.scrollLeft)
      const next = { start: left <= 2, end: left >= max - 2 }
      setEdges((current) =>
        current.start === next.start && current.end === next.end ? current : next,
      )
      const thumb = thumbRef.current
      if (thumb && variant === "snap") {
        const fraction = track.scrollWidth
          ? clamp(track.clientWidth / track.scrollWidth, 0.08, 1)
          : 1
        const progress = max > 0 ? left / max : 0
        thumb.style.width = `${fraction * 100}%`
        thumb.style.transform = `translateX(${((progress * (1 - fraction)) / fraction) * 100}%)`
      }
      if (variant === "coverflow") {
        const first = slideNodes()[0]
        if (first?.offsetWidth)
          local.current?.style.setProperty(
            "--_half",
            (
              (track.clientWidth * 3 + first.offsetWidth) /
              (2 * first.offsetWidth)
            ).toFixed(4),
          )
        // Without scroll-driven animations, each slide gets its distance from the centre here.
        if (!supportsTimeline()) {
          const center = left + track.clientWidth / 2
          for (const slide of slideNodes()) {
            const offset =
              (slide.offsetLeft + slide.offsetWidth / 2 - center) /
              (slide.offsetWidth || 1)
            slide.style.setProperty("--kg-carousel-p", offset.toFixed(4))
          }
        }
      }
      // Until the initial index has been scrolled into place, the position says nothing.
      if (fromScroll.current === -1) return
      const current = nearestIndex(track, left)
      if (syncing.current !== null) {
        if (current === syncing.current) syncing.current = null
        return
      }
      if (current !== fromScroll.current) {
        fromScroll.current = current
        setIndex(current)
      }
    })

    const scrollToIndex = (target: number, smooth: boolean) => {
      const track = trackRef.current
      const slide = slideNodes()[target]
      if (!track || !slide) return
      stopGlide.current?.()
      local.current?.removeAttribute("data-dragging")
      track.scrollTo?.({
        left: snapOffset(track, slide),
        behavior: smooth && !reduced ? "smooth" : "auto",
      })
    }

    useEffect(() => {
      if (!scrolls || index === fromScroll.current) return
      const initial = fromScroll.current === -1
      fromScroll.current = index
      syncing.current = initial ? null : index
      scrollToIndex(index, !initial)
    }, [index, scrolls])

    // The old top card turns inert, so keyboard focus moves on to the new one.
    useIsomorphicLayoutEffect(() => {
      if (!refocus.current) return
      refocus.current = false
      slideNodes()[index]?.focus({ preventScroll: true })
    }, [index])

    useIsomorphicLayoutEffect(() => {
      const track = trackRef.current
      if (!track || !scrolls) return
      measure()
      if (typeof ResizeObserver === "undefined") return
      const observer = new ResizeObserver(() => measure())
      observer.observe(track)
      return () => observer.disconnect()
    }, [scrolls, total, measure])

    useEffect(
      () => () => {
        cancelAnimationFrame(frame.current)
        stopGlide.current?.()
      },
      [],
    )

    const handleScroll = () => {
      if (frame.current) return
      frame.current = requestAnimationFrame(() => {
        frame.current = 0
        measure()
      })
    }

    const pageSize = () => {
      const track = trackRef.current
      const first = slideNodes()[0]
      if (!track || !first?.offsetWidth || variant !== "snap") return 1
      return Math.max(1, Math.floor((track.clientWidth + 4) / first.offsetWidth))
    }

    const lastStart = () => {
      const track = trackRef.current
      if (!track || variant !== "snap") return total - 1
      const max = track.scrollWidth - track.clientWidth
      const nodes = slideNodes()
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node && snapOffset(track, node) >= max - 2) return i
      }
      return total - 1
    }

    const goTo = (target: number, announceChange = true, toss: 1 | -1 = -1) => {
      if (!total) return
      setAnnounce(announceChange)
      const next =
        loop || variant === "stack" ? wrap(target, total) : clamp(target, 0, total - 1)
      if (next === index) return
      if (variant === "stack") {
        refocus.current = !!trackRef.current?.contains(document.activeElement)
        const forward = wrap(next - index, total) <= total / 2
        setShuffle((current) => ({
          slide: forward ? index : next,
          kind: forward ? "out" : "in",
          toss: forward ? toss : 1,
          serial: (current?.serial ?? 0) + 1,
        }))
      }
      setIndex(next)
    }

    const step = (delta: number, by: "slide" | "page") => {
      const amount = by === "page" ? pageSize() : 1
      if (variant === "snap") {
        const end = lastStart()
        if (delta > 0 && edges.end) return goTo(loop ? 0 : end)
        if (delta < 0 && edges.start) return goTo(loop ? end : 0)
        return goTo(clamp(index + delta * amount, 0, end))
      }
      goTo(index + delta * amount)
    }

    const canPrev = loop || variant === "stack" || (scrolls ? !edges.start : index > 0)
    const canNext =
      loop || variant === "stack" || (scrolls ? !edges.end : index < total - 1)

    const advance = useEventCallback(() => {
      if (variant === "snap" && edges.end) goTo(0, false)
      else goTo(index + 1, false)
    })

    const running = playing && !held && !reduced && onScreen && pageVisible && total > 1

    useEffect(() => {
      if (!running) return
      const timer = setInterval(advance, Math.max(interval, 1500))
      return () => clearInterval(timer)
    }, [running, interval, advance])

    useEffect(() => {
      if (reduced) setPlaying(false)
    }, [reduced])

    // Stack: the top card follows any pointer and is tossed past a distance or a speed.
    const toss = useRef<{
      id: number
      x: number
      t: number
      dx: number
      node: HTMLElement
    } | null>(null)

    const handleStackDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || total < 2) return
      const node = slideNodes()[index]
      if (!node || !node.contains(event.target as Node)) return
      toss.current = {
        id: event.pointerId,
        x: event.clientX,
        t: event.timeStamp,
        dx: 0,
        node,
      }
    }

    const handleStackMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      const current = toss.current
      if (!current || current.id !== event.pointerId) return
      const dx = event.clientX - current.x
      if (!current.dx && Math.abs(dx) < 4) return
      if (!current.dx) {
        trackRef.current?.setPointerCapture?.(event.pointerId)
        local.current?.setAttribute("data-dragging", "")
      }
      current.dx = dx || 0.01
      current.node.style.translate = `${dx}px 0`
      current.node.style.rotate = reduced ? "" : `${(dx * 0.045).toFixed(2)}deg`
    }

    const handleStackUp = (event: ReactPointerEvent<HTMLDivElement>) => {
      const current = toss.current
      if (!current || current.id !== event.pointerId) return
      toss.current = null
      local.current?.removeAttribute("data-dragging")
      if (!current.dx) return
      suppressClick.current = true
      const speed = Math.abs(current.dx) / Math.max(event.timeStamp - current.t, 1)
      if (Math.abs(current.dx) > 70 || speed > 0.6) {
        // The shuffle animation starts from the inline offset and clears it when it ends.
        goTo(index + 1, true, current.dx < 0 ? -1 : 1)
      } else {
        current.node.style.removeProperty("translate")
        current.node.style.removeProperty("rotate")
      }
    }

    // Mouse drag-to-scroll. Touch and pen keep native scrolling and momentum.
    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrolls) return handleStackDown(event)
      if (event.pointerType !== "mouse" || event.button !== 0) return
      const track = trackRef.current
      if (!track) return
      stopGlide.current?.()
      syncing.current = null
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        scroll: track.scrollLeft,
        moved: false,
        samples: [{ t: event.timeStamp, x: event.clientX }],
      }
    }

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrolls) return handleStackMove(event)
      const current = drag.current
      const track = trackRef.current
      if (!current || !track || current.id !== event.pointerId) return
      const dx = event.clientX - current.x
      if (!current.moved) {
        if (Math.abs(dx) < 5) return
        current.moved = true
        track.setPointerCapture?.(event.pointerId)
        local.current?.setAttribute("data-dragging", "")
      }
      track.scrollLeft = current.scroll - dx
      current.samples.push({ t: event.timeStamp, x: event.clientX })
      while (
        current.samples.length > 2 &&
        event.timeStamp - (current.samples[0]?.t ?? 0) > 100
      )
        current.samples.shift()
    }

    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrolls) return handleStackUp(event)
      const current = drag.current
      const track = trackRef.current
      if (!current || !track || current.id !== event.pointerId) return
      drag.current = null
      if (!current.moved) return
      suppressClick.current = true
      if (track.hasPointerCapture?.(event.pointerId))
        track.releasePointerCapture(event.pointerId)
      const first = current.samples[0]
      const elapsed = first ? event.timeStamp - first.t : 0
      // px per second in scroll direction (dragging left scrolls right).
      const velocity =
        first && elapsed > 0 && elapsed < 120
          ? (-(event.clientX - first.x) / elapsed) * 1000
          : 0
      const projected = track.scrollLeft + velocity * 0.22
      const nodes = slideNodes()
      const targetSlide = nodes[nearestIndex(track, projected)]
      const target = targetSlide ? snapOffset(track, targetSlide) : track.scrollLeft
      if (reduced) {
        track.scrollLeft = target
        local.current?.removeAttribute("data-dragging")
        return
      }
      stopGlide.current = glide(
        track.scrollLeft,
        target,
        velocity,
        (value) => {
          track.scrollLeft = value
        },
        () => {
          stopGlide.current = null
          local.current?.removeAttribute("data-dragging")
        },
      )
    }

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement
      if (target.closest("input, textarea, select, [contenteditable]")) return
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
      const forward = rtl ? "ArrowLeft" : "ArrowRight"
      const backward = rtl ? "ArrowRight" : "ArrowLeft"
      if (event.key === forward) step(1, "slide")
      else if (event.key === backward) step(-1, "slide")
      else if (event.key === "Home") goTo(0)
      else if (event.key === "End") goTo(total - 1)
      else return
      event.preventDefault()
      setPlaying(false)
    }

    const responsive: CarouselResponsive =
      typeof slidesPerView === "number" ? { base: slidesPerView } : slidesPerView

    return (
      <div
        ref={ref}
        className={cx("kg-carousel relative grid min-w-0 gap-4 text-kg-fg", className)}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        data-variant={variant}
        data-reduced={reduced || undefined}
        style={
          {
            ...(gap !== undefined ? { "--kg-carousel-gap": toLength(gap) } : null),
            ...(responsive.base !== undefined
              ? { "--_pv-base": responsive.base }
              : null),
            ...(responsive.sm !== undefined ? { "--_pv-sm": responsive.sm } : null),
            ...(responsive.md !== undefined ? { "--_pv-md": responsive.md } : null),
            ...(responsive.lg !== undefined ? { "--_pv-lg": responsive.lg } : null),
            ...style,
          } as CSSProperties
        }
        onKeyDown={handleKeyDown}
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          if (event.pointerType === "mouse") setHeld(true)
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event)
          setHeld(false)
        }}
        onFocus={(event) => {
          onFocus?.(event)
          setHeld(true)
        }}
        onBlur={(event) => {
          onBlur?.(event)
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setHeld(false)
        }}
        {...props}
      >
        <div
          ref={trackRef}
          className="kg-carousel__track outline-none focus-visible:rounded-kg-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kg-ring"
          tabIndex={scrolls ? 0 : undefined}
          aria-label={scrolls ? label : undefined}
          onScroll={scrolls ? handleScroll : undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={() => {
            syncing.current = null
          }}
          onClickCapture={(event) => {
            if (suppressClick.current) {
              suppressClick.current = false
              event.preventDefault()
              event.stopPropagation()
              return
            }
            if (variant === "coverflow") {
              const slide = (event.target as HTMLElement).closest<HTMLElement>(
                "[data-carousel-index]",
              )
              const target = Number(slide?.dataset.carouselIndex ?? Number.NaN)
              if (Number.isFinite(target) && target !== index) {
                event.preventDefault()
                event.stopPropagation()
                goTo(target)
              }
            }
          }}
        >
          {slides.map((slide, i) => (
            <SlideContext.Provider
              key={slide.key ?? i}
              value={{
                index: i,
                total,
                current: index,
                variant,
                name: text.slide(i + 1, total),
                shuffle,
              }}
            >
              {slide}
            </SlideContext.Provider>
          ))}
        </div>

        {(controls || autoplay || resolvedIndicator !== "none") && total > 1 && (
          <div
            className={cx(
              "kg-carousel__bar flex min-w-0 items-center gap-2",
              variant !== "snap" && "justify-center",
            )}
          >
            {autoplay !== false && (
              <button
                type="button"
                className={cx(
                  buttonClass,
                  "border-transparent bg-transparent text-kg-fg-muted interactive:hover:bg-kg-muted",
                )}
                data-role="play"
                aria-label={playing ? text.pause : text.play}
                onClick={() => setPlaying((value) => !value)}
              >
                <PlayPause playing={playing} />
              </button>
            )}
            {controls && (
              <button
                type="button"
                className={cx(buttonClass, raisedButton)}
                data-role="previous"
                aria-label={text.previous}
                disabled={!canPrev}
                onClick={() => step(-1, "page")}
              >
                <Chevron flip />
              </button>
            )}
            {resolvedIndicator === "progress" && (
              <span
                className={cx(
                  "kg-carousel__progress relative h-2 min-w-12 overflow-hidden rounded-full border-[1.5px] border-kg-ink bg-kg-surface",
                  variant === "snap" ? "-order-1 me-4 flex-1" : "mx-2 shrink grow-0 basis-40",
                )}
                aria-hidden="true"
              >
                <span
                  ref={thumbRef}
                  className={cx(
                    "kg-carousel__thumb absolute inset-y-0 left-0 w-1/5 rounded-[inherit] bg-kg-ink",
                    variant !== "snap" &&
                      "transition-transform duration-(--kg-duration-slow) ease-kg-out",
                  )}
                  style={
                    scrolls
                      ? undefined
                      : {
                          width: `${100 / total}%`,
                          transform: `translateX(${index * 100}%)`,
                        }
                  }
                />
              </span>
            )}
            {resolvedIndicator === "dots" && (
              <span
                className={cx(
                  "kg-carousel__dots flex items-center gap-0.5",
                  variant === "snap" ? "-order-1 me-4 flex-1 justify-start" : "justify-center",
                )}
              >
                {slides.map((slide, i) => (
                  <button
                    key={slide.key ?? i}
                    type="button"
                    className={cx(dotClass)}
                    aria-label={text.goTo(i + 1, total)}
                    aria-current={i === index || undefined}
                    onClick={() => goTo(i)}
                  />
                ))}
              </span>
            )}
            {controls && (
              <button
                type="button"
                className={cx(buttonClass, raisedButton)}
                data-role="next"
                aria-label={text.next}
                disabled={!canNext}
                onClick={() => step(1, "page")}
              >
                <Chevron />
              </button>
            )}
          </div>
        )}
        <span
          className="kg-visually-hidden"
          role="status"
          aria-live={running ? "off" : "polite"}
          aria-atomic="true"
        >
          {announce && total > 0 ? text.status(index + 1, total) : ""}
        </span>
      </div>
    )
  },
)

Carousel.displayName = "Carousel"

const buttonClass = [
  "kg-carousel__button grid size-(--kg-control-md) shrink-0 cursor-pointer place-items-center rounded-full border-2 p-0 [&_svg]:size-[1.05rem]",
  "transition-[background-color,opacity,translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
]

const raisedButton = [
  "border-kg-ink bg-kg-surface text-kg-fg shadow-kg-xs interactive:hover:bg-kg-paper-sage",
  "interactive:active:translate-x-[2px] interactive:active:translate-y-[2px] interactive:active:shadow-none",
]

/* A 24px hit area around a small dot; the current one widens into an ink pill. */
const dotClass = [
  "kg-carousel__dot relative h-6 w-5 cursor-pointer border-0 bg-transparent p-0",
  "before:absolute before:top-1/2 before:left-1/2 before:h-[0.4rem] before:w-4 before:-translate-1/2 before:rounded-full before:bg-kg-fg before:opacity-30 before:content-['']",
  "before:[clip-path:inset(0_0.3rem_round_1rem)] before:transition-[clip-path,opacity,background-color] before:duration-(--kg-duration-slow) before:ease-kg-out hover:before:opacity-60",
  "aria-[current=true]:before:bg-kg-ink aria-[current=true]:before:opacity-100 aria-[current=true]:before:[clip-path:inset(0_0_round_1rem)]",
  "focus-visible:rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
]

let timelineSupport: boolean | undefined
const supportsTimeline = () =>
  (timelineSupport ??=
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("animation-timeline: view()"))

export type CarouselSlideProps = HTMLAttributes<HTMLDivElement>

/** One slide. Must be a direct child of <Carousel>. */
export const CarouselSlide = forwardRef<HTMLDivElement, CarouselSlideProps>(
  ({ className, style, children, onAnimationEnd, ...props }, forwardedRef) => {
    const context = useContext(SlideContext)
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const index = context?.index ?? 0
    const total = context?.total ?? 1
    const current = context?.current ?? 0
    const variant = context?.variant ?? "snap"
    const active = index === current
    const offset = variant === "stack" ? wrap(index - current, total) : index - current
    const concealed = variant === "stack" && !active
    const shuffle = context?.shuffle
    const shuffling = variant === "stack" && shuffle?.slide === index ? shuffle : null

    // Cards behind the top of the stack are decorative until they come to the front.
    useIsomorphicLayoutEffect(() => {
      if (local.current) local.current.inert = concealed
    }, [concealed])

    return (
      <div
        ref={ref}
        className={cx(
          "kg-carousel__slide focus-visible:rounded-kg-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kg-ring",
          className,
        )}
        role="group"
        aria-roledescription="slide"
        aria-label={context?.name}
        aria-hidden={concealed || undefined}
        tabIndex={variant === "stack" && active ? -1 : undefined}
        data-carousel-index={index}
        data-active={active || undefined}
        data-shuffle={
          shuffling
            ? `${shuffling.kind}-${shuffling.serial % 2 ? "a" : "b"}`
            : undefined
        }
        onAnimationEnd={(event) => {
          onAnimationEnd?.(event)
          if (event.target !== event.currentTarget) return
          event.currentTarget.style.removeProperty("translate")
          event.currentTarget.style.removeProperty("rotate")
        }}
        style={
          {
            "--_r": offset,
            "--_toss": shuffling?.toss ?? -1,
            zIndex:
              variant === "snap"
                ? undefined
                : variant === "stack"
                  ? total - offset
                  : total - Math.abs(offset),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-carousel__card h-full">{children as ReactNode}</div>
      </div>
    )
  },
)

CarouselSlide.displayName = "CarouselSlide"
