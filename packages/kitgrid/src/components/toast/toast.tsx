"use client"

import {
  type CSSProperties,
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  memo,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { Layer } from "../../primitives/layer.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { type ToastRecord, type ToastTone, toast, toastStore } from "./toast-store.js"

export type ToasterPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

/** How far each collapsed toast peeks out from behind the one in front, in px. */
const LIFT = 14
const SWIPE_DISTANCE = 56
const SWIPE_VELOCITY = 0.35

const icons: Record<Exclude<ToastTone, "default" | "loading">, ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9.25" />
      <path
        d="m8.5 12.25 2.5 2.5 4.75-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9.25" />
      <path d="m9.25 9.25 5.5 5.5m0-5.5-5.5 5.5" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M10.3 3.9 2.6 17.25A2 2 0 0 0 4.33 20.25h15.34a2 2 0 0 0 1.73-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        strokeLinejoin="round"
      />
      <path d="M12 9v4.25M12 16.75h.01" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 11v5.25M12 7.75h.01" strokeLinecap="round" />
    </svg>
  ),
}

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
  </svg>
)

const toneIcon = (tone: ToastTone): ReactNode =>
  tone === "loading" ? (
    <span className="kg-toast__spinner size-[0.95rem] animate-spin rounded-full border-2 border-current border-e-transparent [animation-duration:0.7s] motion-reduce:[animation-duration:1.6s]" />
  ) : tone === "default" ? null : (
    icons[tone]
  )

/*
 * Paper Layers: a toast is a white sheet with an ink edge and offset. The tone is a paper chip
 * holding a distinct glyph, so status never rests on colour alone. Collapsed toasts stack as a
 * deck that peeks out by LIFT; enter uses @starting-style and exit a transition, which
 * getAnimations() waits for before the toast is removed.
 */
const toasterVariants = variants({
  base: [
    "kg-toaster pointer-events-none z-kg-toast w-[min(22.25rem,calc(100vw-var(--kg-space)*12))] max-w-none outline-none",
    "[--_edge:calc(var(--kg-space)*6)] max-[30rem]:[--_edge:calc(var(--kg-space)*4)]",
    "max-[30rem]:inset-x-(--_edge) max-[30rem]:mx-0 max-[30rem]:w-auto",
  ],
  variants: {
    y: {
      top: "top-(--_edge) [--_dir:1]",
      bottom: "bottom-(--_edge) [--_dir:-1]",
    },
    x: {
      left: "left-(--_edge)",
      center: "inset-x-0 mx-auto",
      right: "right-(--_edge)",
    },
  },
})

const toastVariants = variants({
  base: [
    "kg-toast absolute inset-x-0 touch-pan-y rounded-kg-lg border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-md outline-none",
    "[transform:translateY(var(--_ty))_scale(var(--_scale))]",
    "transition-[transform,translate,scale,opacity] duration-[var(--kg-duration-slow)] ease-kg-out",
    "starting:opacity-0 motion-safe:starting:translate-y-[calc(var(--_dir)*-100%)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
    "data-overflow:pointer-events-none data-overflow:opacity-0",
    "data-swiping:cursor-grabbing data-swiping:transition-transform data-swiping:select-none",
    "data-[state=closed]:pointer-events-none data-[state=closed]:scale-[0.97] data-[state=closed]:opacity-0! data-[state=closed]:duration-(--kg-duration-base) data-[state=closed]:ease-[var(--kg-ease-in)]",
    "motion-safe:data-[state=closed]:translate-y-[calc(var(--_dir)*-30%)]",
    "[--_swipe-dir:1] data-[swipe-out=left]:[--_swipe-dir:-1] data-swipe-out:[translate:calc(var(--_swipe-dir)*110%)_0]!",
  ],
  variants: {
    y: {
      top: "top-0 origin-top",
      bottom: "bottom-0 origin-bottom",
    },
    behind: {
      true: "h-(--_front-height) overflow-hidden",
      false: "",
    },
  },
})

const iconPaper: Record<ToastTone, string> = {
  default: "bg-kg-muted",
  loading: "bg-kg-muted",
  success: "bg-kg-paper-sage",
  error: "bg-kg-paper-rose",
  warning: "bg-kg-paper-butter",
  info: "bg-kg-paper-sky",
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"

interface ToastItemProps {
  toast: ToastRecord
  y: "top" | "bottom"
  expanded: boolean
  index: number
  offset: number
  front: boolean
  overflow: boolean
  paused: boolean
  defaultDuration: number
  closeButton: boolean
  closeLabel: string
  onHeight: (id: string, height: number) => void
  onFocusLost: () => void
}

interface SwipeState {
  pointerId: number
  x: number
  y: number
  dx: number
  time: number
  dragging: boolean
}

const ToastItem = memo(
  ({
    toast: record,
    y,
    expanded,
    index,
    offset,
    front,
    overflow,
    paused,
    defaultDuration,
    closeButton,
    closeLabel,
    onHeight,
    onFocusLost,
  }: ToastItemProps) => {
    const ref = useRef<HTMLLIElement | null>(null)
    const innerRef = useRef<HTMLDivElement | null>(null)
    const swipe = useRef<SwipeState | null>(null)
    const [swipeOut, setSwipeOut] = useState<"left" | "right" | null>(null)
    const { id, tone, closing, version } = record
    const duration =
      record.duration ?? (tone === "loading" ? Infinity : defaultDuration)
    const remaining = useRef(duration)
    const dismissible = record.dismissible !== false
    const important = record.important ?? tone === "error"

    useIsomorphicLayoutEffect(() => {
      const inner = innerRef.current
      if (!inner) return
      const measure = () => onHeight(id, inner.offsetHeight)
      measure()
      const observer = new ResizeObserver(measure)
      observer.observe(inner)
      return () => observer.disconnect()
    }, [id, onHeight])

    // Declared before the timer so, on an update, the reset runs after the timer's cleanup.
    useEffect(() => {
      remaining.current = duration
    }, [version, duration])

    useEffect(() => {
      if (paused || closing || !Number.isFinite(duration)) return
      const start = Date.now()
      const timer = setTimeout(
        () => {
          record.onAutoClose?.(record)
          toastStore.expire(id)
        },
        Math.max(0, remaining.current),
      )
      return () => {
        clearTimeout(timer)
        remaining.current -= Date.now() - start
      }
    }, [paused, closing, duration, version])

    useEffect(() => {
      if (!closing) return
      const node = ref.current
      const animations = node?.getAnimations?.() ?? []
      if (animations.length === 0) {
        toastStore.remove(id)
        return
      }
      let cancelled = false
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(
        () => {
          if (!cancelled) toastStore.remove(id)
        },
      )
      return () => {
        cancelled = true
      }
    }, [closing, id])

    const close = () => {
      if (ref.current?.contains(document.activeElement)) onFocusLost()
      toast.dismiss(id)
    }

    const resetSwipe = (node: HTMLElement) => {
      delete node.dataset.swiping
      node.style.removeProperty("translate")
      node.style.removeProperty("opacity")
    }

    const onPointerDown = (event: ReactPointerEvent<HTMLLIElement>) => {
      if (!dismissible || closing || event.button !== 0) return
      if ((event.target as HTMLElement).closest("button, a, input, textarea, select"))
        return
      swipe.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dx: 0,
        time: event.timeStamp,
        dragging: false,
      }
    }

    const onPointerMove = (event: ReactPointerEvent<HTMLLIElement>) => {
      const state = swipe.current
      if (!state || state.pointerId !== event.pointerId) return
      const dx = event.clientX - state.x
      const dy = event.clientY - state.y
      if (!state.dragging) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        // A mostly vertical gesture is a scroll or a stray touch, not a dismissal.
        if (Math.abs(dy) > Math.abs(dx)) {
          swipe.current = null
          return
        }
        state.dragging = true
        event.currentTarget.setPointerCapture?.(event.pointerId)
        event.currentTarget.dataset.swiping = ""
      }
      state.dx = dx
      event.currentTarget.style.translate = `${dx}px 0`
      event.currentTarget.style.opacity = String(1 - Math.min(Math.abs(dx) / 220, 0.6))
    }

    const finishSwipe = (
      event: ReactPointerEvent<HTMLLIElement>,
      cancelled: boolean,
    ) => {
      const state = swipe.current
      if (!state || state.pointerId !== event.pointerId) return
      swipe.current = null
      if (!state.dragging) return
      const elapsed = Math.max(1, event.timeStamp - state.time)
      const velocity = Math.abs(state.dx) / elapsed
      if (
        !cancelled &&
        (Math.abs(state.dx) > SWIPE_DISTANCE || velocity > SWIPE_VELOCITY)
      ) {
        delete event.currentTarget.dataset.swiping
        setSwipeOut(state.dx > 0 ? "right" : "left")
        close()
      } else {
        resetSwipe(event.currentTarget)
      }
    }

    const onKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>) => {
      if (
        event.key !== "Escape" ||
        !dismissible ||
        event.target !== event.currentTarget
      )
        return
      event.preventDefault()
      close()
    }

    const icon = record.icon === undefined ? toneIcon(tone) : record.icon
    const behind = !expanded && !front && !closing

    return (
      <li
        ref={ref}
        role={important ? "alert" : "status"}
        aria-atomic="true"
        tabIndex={0}
        className={toastVariants({ y, behind })}
        data-tone={tone}
        data-state={closing ? "closed" : "open"}
        data-front={front || undefined}
        data-overflow={overflow || undefined}
        data-swipe-out={swipeOut ?? undefined}
        style={
          {
            zIndex: 100 - index,
            "--_ty": `${(y === "top" ? 1 : -1) * (expanded ? offset : index * LIFT)}px`,
            "--_scale": expanded ? 1 : 1 - index * 0.05,
          } as CSSProperties
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finishSwipe(event, false)}
        onPointerCancel={(event) => finishSwipe(event, true)}
        onKeyDown={onKeyDown}
      >
        <div
          ref={innerRef}
          className={cx(
            "kg-toast__inner flex items-start gap-3 px-4 py-3.5 transition-opacity duration-(--kg-duration-base) ease-kg-out",
            behind && "opacity-0",
          )}
        >
          {icon != null && (
            <span
              className={cx(
                "kg-toast__icon inline-grid size-7 shrink-0 place-items-center rounded-full border-2 border-kg-ink text-kg-fg [&_svg]:size-4",
                iconPaper[tone],
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <div className="kg-toast__content grid min-w-0 flex-1 gap-0.5 pt-1">
            <div className="kg-toast__title text-kg-base font-semibold leading-[1.4] [overflow-wrap:anywhere]">
              {record.title}
            </div>
            {record.description != null && (
              <div className="kg-toast__description text-kg-sm leading-[1.45] text-kg-fg-muted [overflow-wrap:anywhere]">
                {record.description}
              </div>
            )}
          </div>
          {record.action && (
            <button
              type="button"
              className={cx(
                "kg-toast__action h-7 shrink-0 cursor-pointer self-center rounded-full border-2 border-kg-ink bg-kg-accent px-3 font-[inherit] text-kg-xs font-semibold text-kg-accent-fg",
                "shadow-[2px_2px_0_var(--kg-paper-sage)] transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
                "hover:-translate-px hover:shadow-[3px_3px_0_var(--kg-paper-sage)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                focusRing,
              )}
              onClick={(event) => {
                record.action?.onClick(event)
                if (!event.defaultPrevented) close()
              }}
            >
              {record.action.label}
            </button>
          )}
          {closeButton && dismissible && (
            <button
              type="button"
              className={cx(
                "kg-toast__close -me-1.5 -mt-0.5 inline-grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-kg-fg-muted",
                "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted hover:text-kg-fg [&_svg]:size-3.5",
                focusRing,
              )}
              aria-label={closeLabel}
              onClick={close}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </li>
    )
  },
)

ToastItem.displayName = "ToastItem"

export interface ToasterProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  position?: ToasterPosition
  /** Toasts shown at once; older ones wait behind and keep their timers paused. */
  max?: number
  /** Default time on screen, in ms. Loading toasts stay until updated. */
  duration?: number
  /** Space between expanded toasts, in px. */
  gap?: number
  /** Show a close button on every dismissible toast. */
  closeButton?: boolean
  /** Always show the stack expanded instead of only on hover and focus. */
  expand?: boolean
  /** Accessible name of the notifications landmark. */
  label?: string
  closeLabel?: string
  /** Moves focus to the newest toast, e.g. "Alt+T". `false` disables it. */
  hotkey?: string | false
}

const matchesHotkey = (event: KeyboardEvent, hotkey: string): boolean => {
  const parts = hotkey.toLowerCase().split("+")
  const key = parts.at(-1) ?? ""
  const wants = (modifier: string) => parts.includes(modifier)
  return (
    event.altKey === wants("alt") &&
    event.ctrlKey === wants("ctrl") &&
    event.shiftKey === wants("shift") &&
    event.metaKey === (wants("meta") || wants("cmd")) &&
    // `code` survives Alt producing a different character on macOS.
    (event.code.toLowerCase() === `key${key}` || event.key.toLowerCase() === key)
  )
}

/**
 * Renders the queue fed by `toast()`. A Sonner-style deck: collapsed into a stack, it fans out
 * on hover or focus, and timers pause while it is expanded or the tab is hidden.
 */
export const Toaster = forwardRef<HTMLDivElement, ToasterProps>(
  (
    {
      position = "bottom-right",
      max = 3,
      duration = 4000,
      gap = 12,
      closeButton = false,
      expand = false,
      label = "Notifications",
      closeLabel = "Close notification",
      hotkey = "Alt+T",
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const toasts = useSyncExternalStore(
      toastStore.subscribe,
      toastStore.getSnapshot,
      toastStore.getServerSnapshot,
    )
    const regionRef = useRef<HTMLDivElement | null>(null)
    const ref = useComposedRefs(regionRef, forwardedRef)
    const listRef = useRef<HTMLOListElement | null>(null)
    const [heights, setHeights] = useState<Record<string, number>>({})
    const [hovered, setHovered] = useState(false)
    const [focused, setFocused] = useState(false)
    const [hidden, setHidden] = useState(false)
    const frozen = useRef(new Map<string, { index: number; offset: number }>())
    const [y, x] = position.split("-") as [
      "top" | "bottom",
      "left" | "center" | "right",
    ]

    const onHeight = useCallback((id: string, height: number) => {
      setHeights((current) =>
        current[id] === height ? current : { ...current, [id]: height },
      )
    }, [])

    // Focus inside a toast that is about to leave would fall to <body>; keep it in the region.
    const onFocusLost = useCallback(
      () => regionRef.current?.focus({ preventScroll: true }),
      [],
    )

    useEffect(() => {
      const update = () => setHidden(document.visibilityState === "hidden")
      update()
      document.addEventListener("visibilitychange", update)
      return () => document.removeEventListener("visibilitychange", update)
    }, [])

    useEffect(() => {
      if (!hotkey) return
      const handle = (event: KeyboardEvent) => {
        if (!matchesHotkey(event, hotkey)) return
        const first = listRef.current?.querySelector<HTMLElement>(
          ".kg-toast:not([data-state='closed'])",
        )
        if (!first) return
        event.preventDefault()
        first.focus()
      }
      document.addEventListener("keydown", handle)
      return () => document.removeEventListener("keydown", handle)
    }, [hotkey])

    useEffect(() => {
      if (toasts.length === 0) {
        setHovered(false)
        setFocused(false)
      }
      const ids = new Set(toasts.map((entry) => entry.id))
      setHeights((current) => {
        const stale = Object.keys(current).filter((id) => !ids.has(id))
        if (stale.length === 0) return current
        const next = { ...current }
        for (const id of stale) delete next[id]
        return next
      })
    }, [toasts])

    const live = toasts.filter((entry) => !entry.closing)
    const layout = new Map<string, { index: number; offset: number }>()
    let running = 0
    live.forEach((entry, index) => {
      layout.set(entry.id, { index, offset: running })
      running += (heights[entry.id] ?? 0) + gap
    })
    // A leaving toast holds its last slot while the others close the gap around it.
    for (const entry of toasts) {
      if (entry.closing)
        layout.set(entry.id, frozen.current.get(entry.id) ?? { index: 0, offset: 0 })
    }
    useEffect(() => {
      for (const entry of live) {
        const slot = layout.get(entry.id)
        if (slot) frozen.current.set(entry.id, slot)
      }
      for (const id of frozen.current.keys())
        if (!layout.has(id)) frozen.current.delete(id)
    })

    const visible = live.slice(0, max)
    const expanded = expand || hovered || focused
    const frontHeight = heights[visible[0]?.id ?? ""] ?? 0
    const expandedHeight =
      visible.reduce((sum, entry) => sum + (heights[entry.id] ?? 0), 0) +
      Math.max(0, visible.length - 1) * gap
    const collapsedHeight =
      visible.length > 0 ? frontHeight + (visible.length - 1) * LIFT : 0
    const paused = hovered || focused || hidden

    return (
      <Layer
        ref={ref}
        role="region"
        aria-label={label}
        aria-keyshortcuts={hotkey || undefined}
        tabIndex={-1}
        className={toasterVariants({ x, y, className })}
        data-x={x}
        data-y={y}
        style={style}
        {...props}
      >
        <ol
          ref={listRef}
          className="kg-toaster__list pointer-events-auto relative m-0 list-none p-0 data-empty:pointer-events-none"
          data-expanded={expanded || undefined}
          data-empty={toasts.length === 0 || undefined}
          style={
            {
              height: expanded ? expandedHeight : collapsedHeight,
              "--_front-height": `${frontHeight}px`,
            } as CSSProperties
          }
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(event: FocusEvent<HTMLOListElement>) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setFocused(false)
            }
          }}
        >
          {toasts.map((entry) => {
            const slot = layout.get(entry.id) ?? { index: 0, offset: 0 }
            const overflow = slot.index >= max
            return (
              <ToastItem
                key={entry.id}
                toast={entry}
                y={y}
                expanded={expanded}
                index={slot.index}
                offset={slot.offset}
                front={slot.index === 0 && !entry.closing}
                overflow={overflow}
                paused={paused || overflow}
                defaultDuration={duration}
                closeButton={closeButton}
                closeLabel={closeLabel}
                onHeight={onHeight}
                onFocusLost={onFocusLost}
              />
            )
          })}
        </ol>
      </Layer>
    )
  },
)

Toaster.displayName = "Toaster"
