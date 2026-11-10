"use client"

import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type HTMLAttributes,
  type Key,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

export type SwipeDeckDirection = "left" | "right"

export interface SwipeDeckLabels {
  /** Names the deck region. */
  region?: string
  skip?: string
  save?: string
  undo?: string
  /** Read with the top card: how to use the keyboard. */
  hint?: string
  skipStamp?: string
  saveStamp?: string
  /** Polite status after a swipe or an undo. */
  status?: (
    label: string,
    action: SwipeDeckDirection | "undo",
    remaining: number,
  ) => string
  /** Fallback card name when `itemLabel` is not given. */
  card?: (position: number, total: number) => string
  empty?: string
}

export interface SwipeDeckCardContext {
  index: number
  /** True for the card on top of the deck. */
  top: boolean
}

export interface SwipeDeckProps<T> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "onChange"
> {
  items: readonly T[]
  renderCard: (item: T, context: SwipeDeckCardContext) => ReactNode
  getKey?: (item: T, index: number) => Key
  /** Names each card for assistive tech and the status messages. */
  itemLabel?: (item: T) => string
  /** `right` saves, `left` skips. */
  onSwipe?: (item: T, direction: SwipeDeckDirection) => void
  onUndo?: (item: T, direction: SwipeDeckDirection) => void
  /** After the last card leaves. */
  onEmpty?: () => void
  /** Shown once every card has been swiped. */
  empty?: ReactNode
  /** Cards rendered in the stack, top included. */
  visible?: number
  /** Drag distance that commits a swipe, as a fraction of the card width. */
  threshold?: number
  /** Skip, undo and save buttons. */
  controls?: boolean
  /** Offer an undo button. */
  undo?: boolean
  labels?: SwipeDeckLabels
}

const defaultLabels: Required<SwipeDeckLabels> = {
  region: "Product discovery",
  skip: "Skip",
  save: "Save",
  undo: "Undo last swipe",
  hint: "Press the left arrow to skip or the right arrow to save.",
  skipStamp: "Skip",
  saveStamp: "Save",
  status: (label, action, remaining) =>
    `${action === "undo" ? "Restored" : action === "right" ? "Saved" : "Skipped"} ${label}. ${remaining} left.`,
  card: (position, total) => `Card ${position} of ${total}`,
  empty: "You have seen everything.",
}

interface Pose {
  x: number
  y: number
  grab: 1 | -1
}

interface Gesture {
  id: number
  originX: number
  originY: number
  moved: boolean
  samples: { t: number; x: number; y: number }[]
}

const ROTATION = 0.07
const MAX_ROTATION = 24

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

const SkipIcon = () => (
  <Icon>
    <path d="M17.5 6.5 6.5 17.5M6.5 6.5l11 11" />
  </Icon>
)
const SaveIcon = () => (
  <Icon>
    <path d="M12 20.25s-7.75-4.6-7.75-10.4A4.35 4.35 0 0 1 12 7.4a4.35 4.35 0 0 1 7.75 2.45c0 5.8-7.75 10.4-7.75 10.4Z" />
  </Icon>
)
const UndoIcon = () => (
  <Icon>
    <path d="M9 14 4.5 9.5 9 5" />
    <path d="M4.5 9.5H15a4.75 4.75 0 0 1 0 9.5h-2.5" />
  </Icon>
)

const SwipeDeckInner = <T,>(
  {
    items,
    renderCard,
    getKey,
    itemLabel,
    onSwipe,
    onUndo,
    onEmpty,
    empty,
    visible = 3,
    threshold = 0.3,
    controls = true,
    undo = true,
    labels,
    className,
    onKeyDown,
    ...props
  }: SwipeDeckProps<T>,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) => {
  const text = { ...defaultLabels, ...labels }
  const [history, setHistory] = useState<
    { index: number; direction: SwipeDeckDirection }[]
  >([])
  const [returning, setReturning] = useState<{
    index: number
    direction: SwipeDeckDirection
  } | null>(null)
  const [message, setMessage] = useState("")
  const reduced = useReducedMotion()
  const local = useRef<HTMLDivElement>(null)
  const ref = useComposedRefs(local, forwardedRef)
  const stageRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const pose = useRef<Pose>({ x: 0, y: 0, grab: 1 })
  const frame = useRef(0)
  const busy = useRef(false)
  const suppressClick = useRef(false)
  const lastHeight = useRef(0)
  const hintId = useId()

  const position = Math.min(history.length, items.length)
  const remaining = items.length - position
  const stack = items.slice(position, position + Math.max(1, visible))
  const top = stack[0]
  const nameOf = (item: T, index: number) =>
    itemLabel?.(item) ?? text.card(index + 1, items.length)

  const latest = useRef({ position, items, onSwipe, onEmpty, nameOf, text })
  useIsomorphicLayoutEffect(() => {
    latest.current = { position, items, onSwipe, onEmpty, nameOf, text }
  })

  const write = (x: number, y: number) => {
    const card = topRef.current
    const root = local.current
    if (!card || !root) return
    pose.current = { ...pose.current, x, y }
    const limit = Math.max(card.offsetWidth * threshold, 1)
    const turn = reduced
      ? 0
      : clamp(x * ROTATION * pose.current.grab, -MAX_ROTATION, MAX_ROTATION)
    card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${turn.toFixed(2)}deg)`
    root.style.setProperty("--_save", clamp(x / limit, 0, 1).toFixed(3))
    root.style.setProperty("--_skip", clamp(-x / limit, 0, 1).toFixed(3))
    root.style.setProperty("--_lift", clamp(Math.abs(x) / limit, 0, 1).toFixed(3))
  }

  const clearPose = () => {
    const card = topRef.current
    const root = local.current
    pose.current = { x: 0, y: 0, grab: 1 }
    card?.style.removeProperty("transform")
    card?.style.removeProperty("opacity")
    for (const name of ["--_save", "--_skip", "--_lift"])
      root?.style.removeProperty(name)
  }

  // The deck re-renders with every card one slot closer; clearing the lift in the same frame
  // means nothing visibly moves.
  useIsomorphicLayoutEffect(() => {
    clearPose()
    local.current?.removeAttribute("data-dragging")
    busy.current = false
    const card = topRef.current
    if (card?.offsetHeight) lastHeight.current = card.offsetHeight
  }, [position])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const commit = (direction: SwipeDeckDirection) => {
    const {
      position: index,
      items: list,
      onSwipe: swipe,
      onEmpty: done,
      nameOf: name,
    } = latest.current
    const item = list[index]
    if (item === undefined) return
    setHistory((current) => [...current, { index, direction }])
    setReturning(null)
    setMessage(
      latest.current.text.status(name(item, index), direction, list.length - index - 1),
    )
    swipe?.(item, direction)
    if (index === list.length - 1) done?.()
  }

  /** Carries the card off with its release velocity, then commits the swipe. */
  const throwCard = (direction: SwipeDeckDirection, vx: number, vy: number) => {
    const card = topRef.current
    if (!card) return commit(direction)
    busy.current = true
    local.current?.setAttribute("data-dragging", "")
    const sign = direction === "right" ? 1 : -1
    const width = card.offsetWidth || 320
    const exit = width * 1.45
    let speedX = sign * Math.max(Math.abs(vx), reduced ? 1.6 : 1.9)
    const speedY = reduced ? 0 : clamp(vy, -1.2, 1.2)
    let last = performance.now()
    cancelAnimationFrame(frame.current)
    const step = (now: number) => {
      const dt = Math.min(Math.max(now - last, 0), 64) || 16
      last = now
      speedX *= 1.012
      const x = pose.current.x + speedX * dt
      const y = pose.current.y + speedY * dt
      write(x, y)
      card.style.opacity = String(
        1 - clamp((Math.abs(x) - width * 0.75) / (width * 0.7), 0, 1),
      )
      if (Math.abs(x) >= exit) {
        frame.current = 0
        commit(direction)
        return
      }
      frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }

  /** A 2D spring that starts from the release velocity. */
  const springBack = (vx: number, vy: number) => {
    if (reduced) {
      clearPose()
      local.current?.removeAttribute("data-dragging")
      return
    }
    busy.current = true
    let { x, y } = pose.current
    let sx = vx * 1000
    let sy = vy * 1000
    let last = performance.now()
    cancelAnimationFrame(frame.current)
    const step = (now: number) => {
      const elapsed = Math.min(Math.max((now - last) / 1000, 0), 0.064) || 1 / 60
      last = now
      const steps = Math.ceil(elapsed * 240)
      const dt = elapsed / steps
      for (let i = 0; i < steps; i++) {
        sx += (-260 * x - 22 * sx) * dt
        sy += (-260 * y - 22 * sy) * dt
        x += sx * dt
        y += sy * dt
      }
      if (Math.hypot(x, y) < 0.4 && Math.hypot(sx, sy) < 8) {
        frame.current = 0
        busy.current = false
        clearPose()
        local.current?.removeAttribute("data-dragging")
        return
      }
      write(x, y)
      frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }

  const act = (direction: SwipeDeckDirection) => {
    if (busy.current || top === undefined) return
    pose.current = { x: 0, y: 0, grab: 1 }
    throwCard(direction, 0, -0.12)
  }

  const undoLast = () => {
    const previous = history[history.length - 1]
    if (!previous || busy.current) return
    cancelAnimationFrame(frame.current)
    const item = items[previous.index]
    setHistory((current) => current.slice(0, -1))
    setReturning(previous)
    if (item !== undefined) {
      setMessage(text.status(nameOf(item, previous.index), "undo", remaining + 1))
      onUndo?.(item, previous.direction)
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || busy.current) return
    const card = event.currentTarget
    suppressClick.current = false
    cancelAnimationFrame(frame.current)
    const rect = card.getBoundingClientRect()
    pose.current.grab = event.clientY < rect.top + rect.height / 2 ? 1 : -1
    gesture.current = {
      id: event.pointerId,
      originX: event.clientX - pose.current.x,
      originY: event.clientY - pose.current.y,
      moved: false,
      samples: [{ t: event.timeStamp, x: event.clientX, y: event.clientY }],
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (!current || current.id !== event.pointerId) return
    const x = event.clientX - current.originX
    const y = event.clientY - current.originY
    if (!current.moved) {
      if (Math.hypot(x - pose.current.x, y - pose.current.y) < 4) return
      current.moved = true
      event.currentTarget.setPointerCapture?.(event.pointerId)
      local.current?.setAttribute("data-dragging", "")
    }
    write(x, y * 0.6)
    current.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY })
    while (
      current.samples.length > 2 &&
      event.timeStamp - (current.samples[0]?.t ?? 0) > 100
    )
      current.samples.shift()
  }

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled = false,
  ) => {
    const current = gesture.current
    if (!current || current.id !== event.pointerId) return
    gesture.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    if (!current.moved) {
      if (pose.current.x || pose.current.y) springBack(0, 0)
      return
    }
    suppressClick.current = true
    const first = current.samples[0]
    const elapsed = first ? event.timeStamp - first.t : 0
    const fresh = first && elapsed > 0 && elapsed < 120
    const vx = fresh ? (event.clientX - first.x) / elapsed : 0
    const vy = fresh ? ((event.clientY - first.y) / elapsed) * 0.6 : 0
    const width = topRef.current?.offsetWidth ?? 320
    const { x } = pose.current
    const far = Math.abs(x) > width * threshold
    const fast = Math.abs(vx) > 0.55 && Math.sign(vx) === Math.sign(x || vx)
    if (!cancelled && (far || fast))
      throwCard((fast ? vx : x) > 0 ? "right" : "left", vx, vy)
    else springBack(vx, vy)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    if (
      (event.target as HTMLElement).closest(
        "input, textarea, select, [contenteditable]",
      )
    )
      return
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
    act((event.key === "ArrowRight") !== rtl ? "right" : "left")
  }

  // Cards behind the top one are decorative until they reach it.
  useIsomorphicLayoutEffect(() => {
    for (const node of stageRef.current?.querySelectorAll<HTMLElement>(
      "[data-deck-card]",
    ) ?? [])
      node.inert = !node.hasAttribute("data-top")
  })

  const emptyHeight = lastHeight.current ? { minHeight: lastHeight.current } : undefined

  return (
    <div
      ref={ref}
      className={cx(
        "kg-swipe-deck group/deck grid min-w-0 justify-items-center gap-7 text-kg-fg [-webkit-tap-highlight-color:transparent]",
        "[--_lift:0] [--_save:0] [--_skip:0] [--_width:var(--kg-swipe-deck-width,20rem)]",
        className,
      )}
      role="region"
      aria-label={text.region}
      data-empty={top === undefined || undefined}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <div
        ref={stageRef}
        className="kg-swipe-deck__stage relative grid w-[min(100%,var(--_width))] pb-7"
        style={top === undefined ? emptyHeight : undefined}
      >
        {stack.map((item, offset) => {
          const index = position + offset
          const isTop = offset === 0
          const back = returning?.index === index ? returning.direction : undefined
          return (
            <div
              key={getKey?.(item, index) ?? index}
              ref={isTop ? topRef : undefined}
              className={cx(cardClass, isTop ? topCardClass : backCardClass)}
              data-deck-card=""
              data-top={isTop || undefined}
              data-return={back}
              role={isTop ? "group" : undefined}
              aria-roledescription={isTop ? "card" : undefined}
              aria-label={isTop ? nameOf(item, index) : undefined}
              aria-describedby={isTop ? hintId : undefined}
              aria-hidden={isTop ? undefined : true}
              tabIndex={isTop ? 0 : undefined}
              style={{ "--_d": offset, zIndex: stack.length - offset } as CSSProperties}
              onPointerDown={isTop ? handlePointerDown : undefined}
              onPointerMove={isTop ? handlePointerMove : undefined}
              onPointerUp={isTop ? handlePointerUp : undefined}
              onPointerCancel={
                isTop ? (event) => handlePointerUp(event, true) : undefined
              }
              onClickCapture={(event) => {
                if (!suppressClick.current) return
                suppressClick.current = false
                event.preventDefault()
                event.stopPropagation()
              }}
              onAnimationEnd={(event) => {
                if (back && event.target === event.currentTarget) setReturning(null)
              }}
            >
              {renderCard(item, { index, top: isTop })}
              {isTop && (
                <>
                  <span
                    className={cx(
                      stampClass,
                      "start-5 -rotate-10 border-kg-ink bg-kg-accent text-kg-accent-fg opacity-(--_save) [scale:calc(var(--_save)*0.3+0.7)]",
                    )}
                    data-kind="save"
                    aria-hidden="true"
                  >
                    <SaveIcon />
                    {text.saveStamp}
                  </span>
                  <span
                    className={cx(
                      stampClass,
                      "end-5 rotate-10 border-kg-ink bg-kg-surface text-kg-fg opacity-(--_skip) [scale:calc(var(--_skip)*0.3+0.7)]",
                    )}
                    data-kind="skip"
                    aria-hidden="true"
                  >
                    <SkipIcon />
                    {text.skipStamp}
                  </span>
                </>
              )}
            </div>
          )
        })}
        {top === undefined && (
          <div className="kg-swipe-deck__empty grid animate-[kg-fade-in_var(--kg-duration-slow)_var(--kg-ease-out)_backwards] place-items-center rounded-kg-xl border-2 border-dashed border-kg-ink p-8 text-center text-kg-fg-muted [grid-area:1/1]">
            {empty ?? <p className="kg-swipe-deck__empty-text m-0">{text.empty}</p>}
          </div>
        )}
      </div>

      {controls && (
        <div className="kg-swipe-deck__controls flex items-center gap-5">
          <button
            type="button"
            className={cx(
              actionClass,
              "size-14 bg-kg-surface text-kg-fg shadow-kg-sm interactive:hover:bg-kg-paper-sage enabled:[scale:calc(var(--_skip)*0.14+1)] [&_svg]:size-[1.4rem]",
            )}
            data-action="skip"
            aria-label={text.skip}
            disabled={top === undefined}
            onClick={() => act("left")}
          >
            <SkipIcon />
          </button>
          {undo && (
            <button
              type="button"
              className={cx(
                actionClass,
                "size-11 bg-kg-surface text-kg-fg-muted shadow-kg-xs interactive:hover:bg-kg-paper-sage [&_svg]:size-[1.1rem]",
              )}
              data-action="undo"
              aria-label={text.undo}
              disabled={history.length === 0}
              onClick={undoLast}
            >
              <UndoIcon />
            </button>
          )}
          <button
            type="button"
            className={cx(
              actionClass,
              "size-14 bg-kg-accent text-kg-accent-fg shadow-[3px_3px_0_var(--kg-paper-sage)] interactive:hover:bg-kg-accent-hover enabled:[scale:calc(var(--_save)*0.14+1)] [&_svg]:size-[1.4rem]",
            )}
            data-action="save"
            aria-label={text.save}
            disabled={top === undefined}
            onClick={() => act("right")}
          >
            <SaveIcon />
          </button>
        </div>
      )}

      <span id={hintId} className="kg-visually-hidden">
        {text.hint}
      </span>
      <span
        className="kg-visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </span>
    </div>
  )
}

/*
 * Paper Layers: each card is a sheet; the ones behind sit lower and smaller by their depth
 * (--_d), less the lift the drag writes to the root (--_lift). Every calc leads with a var so
 * Tailwind keeps the private names intact.
 */
const cardClass = [
  "kg-swipe-deck__card relative touch-pan-y overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-md outline-none select-none [grid-area:1/1] [-webkit-user-select:none] origin-[50%_100%]",
  "[--_slot:max(calc(var(--_d)-(var(--_lift))),0)] [transform:translateY(calc(var(--_slot)*0.875rem))_scale(calc(var(--_slot)*-0.06+1))]",
  "[transition:transform_var(--kg-duration-spring)_var(--kg-ease-spring),filter_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "animate-[kg-swipe-deck-rise_var(--kg-duration-slower)_var(--kg-ease-out)_backwards]",
  "data-[return=left]:animate-[kg-swipe-deck-return_var(--kg-duration-spring)_var(--kg-ease-spring)_backwards] data-[return=left]:[--_from:-1]",
  "data-[return=right]:animate-[kg-swipe-deck-return_var(--kg-duration-spring)_var(--kg-ease-spring)_backwards] data-[return=right]:[--_from:1]",
  "group-data-dragging/deck:animate-none group-data-dragging/deck:transition-none",
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-kg-ring [&_img]:pointer-events-none [&_img]:[-webkit-user-drag:none]",
]

/* The top card takes a flat paper tint on the side it leans toward: sage to save, rose to skip. */
const topCardClass = [
  "cursor-grab group-data-dragging/deck:cursor-grabbing",
  "before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:bg-kg-paper-rose before:opacity-[calc(var(--_skip)*0.55)] before:content-['']",
  "after:pointer-events-none after:absolute after:inset-0 after:z-1 after:rounded-[inherit] after:bg-kg-paper-sage after:opacity-[calc(var(--_save)*0.55)] after:content-['']",
]

const backCardClass = "pointer-events-none [filter:brightness(calc(var(--_slot)*-0.05+1))]"

const stampClass =
  "kg-swipe-deck__stamp pointer-events-none absolute top-5 z-2 inline-flex items-center gap-1.5 rounded-full border-2 ps-2.5 pe-3.5 py-1.5 text-kg-md font-[750] tracking-[0.04em] uppercase shadow-kg-md [&_svg]:size-[1.1rem]"

const actionClass = [
  "kg-swipe-deck__action grid cursor-pointer place-items-center rounded-full border-2 border-kg-ink p-0",
  "transition-[scale,translate,box-shadow,background-color,opacity] duration-(--kg-duration-base) ease-kg-out group-data-dragging/deck:transition-none",
  "interactive:active:translate-y-[2px] interactive:active:shadow-none",
  "disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-kg-ring",
]

/**
 * A physical deck of cards to fling left (skip) or right (save). Rotation follows the grab point,
 * releases carry their velocity, the next card rises from behind, and every swipe can be undone.
 */
export const SwipeDeck = forwardRef(SwipeDeckInner) as (<T>(
  props: SwipeDeckProps<T> & RefAttributes<HTMLDivElement>,
) => ReactElement | null) & { displayName?: string }

SwipeDeck.displayName = "SwipeDeck"
