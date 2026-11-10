"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { createSpring, type Spring, type SpringConfig } from "../../hooks/use-spring.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

/**
 * `compact` hugs its content in a slim pill, `wide` is a one-line banner, `tall` a short card
 * and `expanded` the full live activity.
 */
export type DynamicIslandSize = "compact" | "wide" | "tall" | "expanded"

export interface DynamicIslandProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** Key of the view to show. Changing it morphs the island into the new view. */
  state: string
  views: Readonly<Record<string, ReactNode>>
  /** Size per view key. Views without an entry are `compact`. */
  sizes?: Readonly<Partial<Record<string, DynamicIslandSize>>>
  /** Escape while focus is inside the island. */
  onDismiss?: () => void
  /** Reports hover and focus, so callers can pause timers while someone is reading. */
  onHoldChange?: (held: boolean) => void
  /** Announce each new view's text through a polite live region. */
  announce?: boolean
  spring?: SpringConfig
}

interface Layer {
  key: string
  node: ReactNode
  size: DynamicIslandSize
}

const DEFAULT_SPRING: SpringConfig = { stiffness: 340, damping: 27 }
const MAX_RADIUS = 40
/** Headroom for spring overshoot, so the clip never runs past the painted surface. */
const SLACK = 1.12

const makeInert = (node: HTMLElement | null) => {
  if (node) node.inert = true
}

/** Visible text with a space between separate elements, so "Added to bag" + "Size 42" reads as two phrases. */
const readableText = (root: Element): string => {
  const parts: string[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest("[aria-hidden='true']")) continue
    const value = node.nodeValue?.trim()
    if (value) parts.push(value)
  }
  return parts.join(" ")
}

/**
 * A black pill that morphs between views with spring physics, inspired by the iPhone Dynamic
 * Island. The current view stays in flow, so the server render already has the right size; the
 * surface then reshapes through an animated `clip-path` (corners stay true circles at every size)
 * while the content cross-fades, so a state change costs one layout, not one per frame.
 */
/*
 * Paper Layers: an ink sheet that keeps its hardware feel. The offset is a crisp drop-shadow on
 * the root, so it follows the clipped, morphing shape.
 */
const rootClass = [
  "kg-dynamic-island mx-auto grid w-fit max-w-full justify-items-center text-kg-sm leading-[1.3] text-(--_ink)",
  "[--_island:var(--kg-island-bg,var(--kg-ink))] [--_ink:var(--kg-accent-fg)] [--_ink-muted:color-mix(in_oklab,var(--_ink)_72%,var(--_island))]",
  "[filter:drop-shadow(4px_4px_0_var(--kg-paper-sage))]",
]

const viewSize: Record<DynamicIslandSize, string> = {
  compact: "flex h-[2.25rem] w-max min-w-[7.5rem] justify-between ps-1.5 pe-3.5",
  wide: "flex min-h-[3.5rem] w-[min(22.5rem,calc(100vw-2rem))] py-2 ps-2 pe-3.5",
  tall: "block w-[min(22.5rem,calc(100vw-2rem))] px-4 py-3.5",
  expanded: "block min-h-[10.5rem] w-[min(24rem,calc(100vw-2rem))] px-5 py-4.5",
}

const viewClass = (size: DynamicIslandSize, phase: "enter" | "exit" | undefined) =>
  cx(
    "kg-dynamic-island__view group/view min-w-0 origin-top items-center gap-2.5 [grid-area:1/1]",
    viewSize[size],
    phase === "exit"
      ? "pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 animate-[kg-island-exit_var(--kg-duration-fast)_var(--kg-ease-out)_forwards]"
      : "relative",
    phase === "enter" &&
      "animate-[kg-island-enter_var(--kg-duration-spring)_var(--kg-ease-out)_70ms_both]",
  )

export const DynamicIsland = forwardRef<HTMLDivElement, DynamicIslandProps>(
  (
    {
      state,
      views,
      sizes,
      onDismiss,
      onHoldChange,
      announce = true,
      spring,
      className,
      onKeyDown,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const islandRef = useRef<HTMLDivElement>(null)
    const surfaceRef = useRef<HTMLSpanElement>(null)
    const announcer = useRef<HTMLSpanElement>(null)
    const reduced = useReducedMotion()
    const size = sizes?.[state] ?? "compact"
    const node = views[state] ?? null

    // Derived during render so the outgoing view keeps its DOM node through the cross-fade.
    const [shown, setShown] = useState(state)
    const [exiting, setExiting] = useState<Layer[]>([])
    const changes = useRef(0)
    const last = useRef<Layer>({ key: state, node, size })
    if (shown !== state) {
      changes.current += 1
      setShown(state)
      const previous = last.current
      setExiting((list) => [...list.filter((layer) => layer.key !== state), previous])
    }
    useIsomorphicLayoutEffect(() => {
      last.current = { key: state, node, size }
    })

    // Animations normally retire exiting views; this covers a missing stylesheet or a background
    // tab where animationend never arrives.
    useEffect(() => {
      if (exiting.length === 0) return
      const timer = setTimeout(() => setExiting([]), 900)
      return () => clearTimeout(timer)
    }, [exiting])

    const dims = useRef<{
      width: Spring
      height: Spring
      box: { w: number; h: number }
    } | null>(null)
    const held = useRef({ hover: false, focus: false })
    const hold = useEventCallback(
      (next: Partial<{ hover: boolean; focus: boolean }>) => {
        const before = held.current.hover || held.current.focus
        held.current = { ...held.current, ...next }
        const after = held.current.hover || held.current.focus
        if (before !== after) onHoldChange?.(after)
      },
    )

    const { stiffness, damping, mass } = spring ?? DEFAULT_SPRING

    useIsomorphicLayoutEffect(() => {
      const island = islandRef.current
      if (!island) return
      const box = { w: 0, h: 0 }
      // Insets go negative while shrinking: the clip then reaches past the new, smaller box and
      // the oversized surface underneath fills it.
      const write = () => {
        const w = width.get()
        const h = height.get()
        const side = (box.w - w) / 2
        const bottom = box.h - h
        const radius = clamp(h / 2, 0, MAX_RADIUS)
        island.style.clipPath = `inset(0px ${side.toFixed(2)}px ${bottom.toFixed(2)}px round ${radius.toFixed(2)}px)`
      }
      const config = { stiffness, damping, mass, precision: 0.05 }
      const width = createSpring(0, write, config)
      const height = createSpring(0, write, config)
      dims.current = { width, height, box }
      return () => {
        width.stop()
        height.stop()
        dims.current = null
      }
    }, [stiffness, damping, mass])

    const morph = useEventCallback((animate: boolean) => {
      const island = islandRef.current
      const surface = surfaceRef.current
      const springs = dims.current
      if (!island || !surface || !springs) return
      const w = island.offsetWidth
      const h = island.offsetHeight
      if (!w || !h) return
      const fromW = springs.width.get()
      const fromH = springs.height.get()
      springs.box.w = w
      springs.box.h = h
      if (!animate || reduced || !fromW) {
        surface.style.removeProperty("width")
        surface.style.removeProperty("height")
        springs.width.jump(w)
        springs.height.jump(h)
        return
      }
      surface.style.width = `${Math.max(fromW, w) * SLACK}px`
      surface.style.height = `${Math.max(fromH, h) * SLACK}px`
      springs.width.set(w)
      springs.height.set(h)
    })

    const mounted = useRef(false)
    useIsomorphicLayoutEffect(() => {
      morph(mounted.current)
      if (mounted.current && announce && announcer.current) {
        const view = islandRef.current?.querySelector("[data-current]")
        announcer.current.textContent = view ? readableText(view) : ""
      }
      mounted.current = true
    }, [state, size, morph, announce])

    // Content that changes size in place (a ticking timer, a longer title) reshapes the island too.
    useEffect(() => {
      const island = islandRef.current
      if (!island || typeof ResizeObserver === "undefined") return
      let first = true
      const observer = new ResizeObserver(() => {
        if (first) {
          first = false
          return
        }
        morph(true)
      })
      observer.observe(island)
      return () => observer.disconnect()
    }, [morph])

    const retire = (key: string) =>
      setExiting((list) => list.filter((layer) => layer.key !== key))

    return (
      <div
        ref={ref}
        className={cx(rootClass, className)}
        data-size={size}
        data-state={state}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented || event.key !== "Escape" || !onDismiss) return
          event.preventDefault()
          onDismiss()
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          if (event.pointerType !== "touch") hold({ hover: true })
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event)
          hold({ hover: false })
        }}
        onFocus={(event) => {
          onFocus?.(event)
          hold({ focus: true })
        }}
        onBlur={(event) => {
          onBlur?.(event)
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            hold({ focus: false })
        }}
        {...props}
      >
        <div ref={islandRef} className="kg-dynamic-island__island relative isolate grid">
          <span
            ref={surfaceRef}
            className="kg-dynamic-island__surface absolute top-0 left-1/2 -z-1 size-full -translate-x-1/2 rounded-[40px] bg-(--_island)"
            aria-hidden="true"
          />
          {exiting.map((layer) => (
            <div
              key={layer.key}
              ref={makeInert}
              className={viewClass(layer.size, "exit")}
              data-size={layer.size}
              data-phase="exit"
              aria-hidden="true"
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget) retire(layer.key)
              }}
            >
              {layer.node}
            </div>
          ))}
          <div
            key={state}
            className={viewClass(size, changes.current > 0 ? "enter" : undefined)}
            data-size={size}
            data-current=""
            data-phase={changes.current > 0 ? "enter" : undefined}
          >
            {node}
          </div>
        </div>
        {announce && (
          <span
            ref={announcer}
            className="kg-visually-hidden"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          />
        )}
      </div>
    )
  },
)

DynamicIsland.displayName = "DynamicIsland"

export interface DynamicIslandActivityProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  /** A thumbnail, icon or avatar on the leading edge. */
  leading?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** A ring, a value or an action on the trailing edge. */
  trailing?: ReactNode
}

/** The standard live-activity layout: leading media, a title stack and a trailing slot. */
export const DynamicIslandActivity = forwardRef<
  HTMLDivElement,
  DynamicIslandActivityProps
>(({ leading, title, description, trailing, className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cx(
      "kg-dynamic-island-activity grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 group-data-[size=compact]/view:gap-2",
      className,
    )}
    {...props}
  >
    {leading && (
      <span className="kg-dynamic-island-activity__leading grid size-10 place-items-center overflow-hidden rounded-kg-lg bg-[color-mix(in_oklab,var(--_ink,white)_14%,transparent)] text-(--_ink) group-data-[size=compact]/view:size-6 group-data-[size=compact]/view:rounded-full [&>img]:size-full [&>img]:object-cover [&>svg]:size-5 group-data-[size=compact]/view:[&>svg]:size-3.5">
        {leading}
      </span>
    )}
    <span className="kg-dynamic-island-activity__text grid min-w-0 gap-px">
      <span className="kg-dynamic-island-activity__title overflow-hidden font-semibold tracking-[-0.01em] text-ellipsis whitespace-nowrap group-data-[size=compact]/view:text-kg-xs">
        {title}
      </span>
      {description && (
        <span className="kg-dynamic-island-activity__description overflow-hidden text-kg-xs text-ellipsis whitespace-nowrap text-(--_ink-muted) group-data-[size=compact]/view:hidden">
          {description}
        </span>
      )}
    </span>
    {trailing && (
      <span className="kg-dynamic-island-activity__trailing inline-flex items-center gap-2 tabular-nums">
        {trailing}
      </span>
    )}
    {children}
  </div>
))

DynamicIslandActivity.displayName = "DynamicIslandActivity"

export interface DynamicIslandRingProps extends HTMLAttributes<HTMLSpanElement> {
  /** 0 to 1. */
  value: number
  /** Diameter in px. */
  size?: number
  /** Required when the ring is the only signal of progress. */
  label?: string
  children?: ReactNode
}

/** A circular progress ring sized for the island. Its arc eases between values. */
export const DynamicIslandRing = forwardRef<HTMLSpanElement, DynamicIslandRingProps>(
  ({ value, size = 26, label, className, style, children, ...props }, ref) => {
    const progress = clamp(Number.isFinite(value) ? value : 0, 0, 1)
    return (
      <span
        ref={ref}
        className={cx(
          "kg-dynamic-island-ring relative inline-grid shrink-0 place-items-center [&>svg]:absolute [&>svg]:inset-0 [&>svg]:size-full [&>svg]:fill-none",
          className,
        )}
        role={label ? "progressbar" : undefined}
        aria-label={label}
        aria-valuemin={label ? 0 : undefined}
        aria-valuemax={label ? 100 : undefined}
        aria-valuenow={label ? Math.round(progress * 100) : undefined}
        aria-hidden={label ? undefined : true}
        style={{ width: size, height: size, ...style }}
        {...props}
      >
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle
            cx="18"
            cy="18"
            r="15"
            className="kg-dynamic-island-ring__track stroke-[color-mix(in_oklab,currentColor_22%,transparent)] [stroke-width:3.5]"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            pathLength={100}
            className="kg-dynamic-island-ring__arc stroke-current [stroke-dasharray:100] [stroke-linecap:round] [stroke-width:3.5] transition-[stroke-dashoffset] duration-(--kg-duration-slower) ease-kg-out"
            transform="rotate(-90 18 18)"
            style={{ strokeDashoffset: 100 - progress * 100 }}
          />
        </svg>
        {children && (
          <span className="kg-dynamic-island-ring__content absolute inset-0 grid place-items-center text-[0.625rem] font-[650] [&>svg]:size-[42%]">
            {children}
          </span>
        )}
      </span>
    )
  },
)

DynamicIslandRing.displayName = "DynamicIslandRing"

export interface DynamicIslandShowOptions {
  /** Reuse an id to update the view in place instead of morphing to a new one. */
  id?: string
  size?: DynamicIslandSize
  /** Milliseconds before it returns to idle. `Infinity` keeps it until dismissed. */
  duration?: number
}

export interface DynamicIslandOptions {
  /** Shown between events. `null` renders an empty compact pill. */
  idle?: ReactNode
  idleSize?: DynamicIslandSize
  /** Default time an event stays up, in ms. */
  duration?: number
}

export interface DynamicIslandController {
  /** Shows content and returns its id. */
  show: (content: ReactNode, options?: DynamicIslandShowOptions) => string
  /** Returns to idle. With an id, only while that event is still showing. */
  dismiss: (id?: string) => void
  /** Id of the event on screen, or null while idle. */
  active: string | null
  /** Spread onto <DynamicIsland>. */
  props: Pick<
    DynamicIslandProps,
    "state" | "views" | "sizes" | "onDismiss" | "onHoldChange"
  >
}

interface IslandEvent {
  id: string
  key: string
  content: ReactNode
  size: DynamicIslandSize
  duration: number
  version: number
}

/**
 * Drives a <DynamicIsland> from event handlers: `island.show(<Added />, { size: "wide" })`.
 * Events time out on their own, wait while hovered or focused, and update in place by id.
 */
export const useDynamicIsland = ({
  idle = null,
  idleSize = "compact",
  duration = 4000,
}: DynamicIslandOptions = {}): DynamicIslandController => {
  const [event, setEvent] = useState<IslandEvent | null>(null)
  const [held, setHeld] = useState(false)
  const counter = useRef(0)

  const show = useCallback(
    (content: ReactNode, options: DynamicIslandShowOptions = {}) => {
      const id = options.id ?? `kg-island-${++counter.current}`
      const key = `${id}#${++counter.current}`
      setEvent((current) =>
        current && current.id === id
          ? {
              ...current,
              content,
              size: options.size ?? current.size,
              duration: options.duration ?? current.duration,
              version: current.version + 1,
            }
          : {
              id,
              key,
              content,
              size: options.size ?? "wide",
              duration: options.duration ?? duration,
              version: 0,
            },
      )
      return id
    },
    [duration],
  )

  const dismiss = useCallback((id?: string) => {
    setEvent((current) => (!current || (id && current.id !== id) ? current : null))
  }, [])

  useEffect(() => {
    if (!event || held || !Number.isFinite(event.duration)) return
    const id = event.id
    const timer = setTimeout(() => dismiss(id), event.duration)
    return () => clearTimeout(timer)
  }, [event, held, dismiss])

  return {
    show,
    dismiss,
    active: event?.id ?? null,
    props: {
      state: event ? event.key : "idle",
      views: event ? { idle, [event.key]: event.content } : { idle },
      sizes: event ? { idle: idleSize, [event.key]: event.size } : { idle: idleSize },
      onDismiss: () => dismiss(),
      onHoldChange: setHeld,
    },
  }
}
