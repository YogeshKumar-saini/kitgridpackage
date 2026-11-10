"use client"

import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useDismiss } from "../../hooks/use-dismiss.js"
import { type Align, type Side, useFloating } from "../../hooks/use-floating.js"
import { usePresence } from "../../hooks/use-presence.js"
import { Layer } from "../../primitives/layer.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

/** Lets pointer travel from the trigger onto the bubble without it closing (WCAG 1.4.13). */
const HOVER_GRACE = 120

/* Paper Layers: a small ink sheet, flat on the page, so it never competes with the sheets around it. */
const tooltipClass = [
  "kg-tooltip z-kg-tooltip max-w-[min(18rem,calc(100vw-1rem))] px-2.5 py-1.5 rounded-kg-sm",
  "bg-kg-accent text-kg-accent-fg text-kg-xs font-medium leading-[1.45] tracking-[0.005em] wrap-break-word",
  "origin-[var(--kg-origin,center)] [--kg-enter-y:0px]",
  "data-[side=top]:[--kg-enter-y:3px] data-[side=bottom]:[--kg-enter-y:-3px]",
  "data-[state=open]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:animate-[kg-fade-out_var(--kg-duration-instant)_var(--kg-ease-in)_forwards]",
  "[&_kbd]:ms-[0.5em] [&_kbd]:font-kg-mono [&_kbd]:text-[0.95em] [&_kbd]:opacity-75",
]

interface TooltipGroup {
  delayDuration: number
  /** True while a tooltip in the group is open or closed within `skipDelayDuration`. */
  isWarm: () => boolean
  /** Registers the open tooltip, closing whichever one was open before it. */
  opened: (dismiss: () => void) => void
  closed: (dismiss: () => void) => void
}

const createGroup = (
  delayDuration: number,
  skipDelayDuration: number,
): TooltipGroup => {
  let current: (() => void) | null = null
  let warmUntil = 0
  return {
    delayDuration,
    isWarm: () => current !== null || Date.now() < warmUntil,
    opened: (dismiss) => {
      if (current && current !== dismiss) current()
      current = dismiss
    },
    closed: (dismiss) => {
      if (current === dismiss) current = null
      warmUntil = Date.now() + skipDelayDuration
    },
  }
}

const TooltipGroupContext = createContext<TooltipGroup>(createGroup(500, 300))

export interface TooltipProviderProps {
  /** Hover time before the first tooltip in the group opens, in ms. */
  delayDuration?: number
  /** After one closes, others open instantly if hovered within this window, in ms. */
  skipDelayDuration?: number
  children?: ReactNode
}

/** Optional: groups tooltips so moving between triggers skips the delay, like a toolbar. */
export const TooltipProvider = ({
  delayDuration = 500,
  skipDelayDuration = 300,
  children,
}: TooltipProviderProps) => {
  const group = useMemo(
    () => createGroup(delayDuration, skipDelayDuration),
    [delayDuration, skipDelayDuration],
  )
  return (
    <TooltipGroupContext.Provider value={group}>
      {children}
    </TooltipGroupContext.Provider>
  )
}

TooltipProvider.displayName = "TooltipProvider"

export interface TooltipProps {
  content: ReactNode
  /** A single focusable element. It receives `aria-describedby` and the hover handlers. */
  children: ReactElement
  side?: Side
  align?: Align
  /** Gap from the trigger, in px. */
  offset?: number
  /** Overrides the provider's delay, in ms. */
  delay?: number
  disabled?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Class for the bubble. */
  className?: string
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      content,
      children,
      side = "top",
      align = "center",
      offset = 6,
      delay,
      disabled = false,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      className,
    },
    forwardedRef,
  ) => {
    const group = useContext(TooltipGroupContext)
    const [openState, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const open = openState && !disabled
    const { ref, present, state } = usePresence<HTMLDivElement>(open)
    const bubbleRef = useComposedRefs(ref, forwardedRef)
    const triggerRef = useRef<HTMLElement | null>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const pressed = useRef(false)
    const id = `${useId()}-tooltip`

    const clear = () => clearTimeout(timer.current)
    const show = (immediate: boolean) => {
      clear()
      if (disabled) return
      const wait = immediate || group.isWarm() ? 0 : (delay ?? group.delayDuration)
      if (wait === 0) setOpen(true)
      else timer.current = setTimeout(() => setOpen(true), wait)
    }
    const hide = (immediate: boolean) => {
      clear()
      if (immediate) setOpen(false)
      else timer.current = setTimeout(() => setOpen(false), HOVER_GRACE)
    }

    useEffect(() => clear, [])
    useEffect(() => {
      if (!open) return
      const dismiss = () => {
        clearTimeout(timer.current)
        setOpen(false)
      }
      group.opened(dismiss)
      return () => group.closed(dismiss)
    }, [open, group, setOpen])

    useFloating(triggerRef, ref, { open, side, align, offset })
    useDismiss({ enabled: open, outside: false, refs: [], onDismiss: () => hide(true) })

    const child = Children.only(children)
    if (!isValidElement(child)) return null
    const own = (child.props as { "aria-describedby"?: string })["aria-describedby"]
    const trigger = cloneElement(child as ReactElement<Record<string, unknown>>, {
      "aria-describedby": cx(present && id, own) || undefined,
    })

    const fromPointer = (handler: () => void) => (event: ReactPointerEvent) => {
      // Touch has no hover; showing on tap would fight the tap's own action.
      if (event.pointerType !== "touch") handler()
    }

    return (
      <>
        <Slot
          ref={triggerRef}
          onPointerEnter={fromPointer(() => show(false))}
          onPointerLeave={fromPointer(() => hide(false))}
          onPointerDown={() => {
            pressed.current = true
            hide(true)
          }}
          onFocus={() => {
            // Focus that follows a click is not a request for help text.
            if (pressed.current) pressed.current = false
            else show(true)
          }}
          onBlur={() => {
            pressed.current = false
            hide(true)
          }}
        >
          {trigger}
        </Slot>
        {present && (
          <Layer
            ref={bubbleRef}
            id={id}
            role="tooltip"
            className={cx(tooltipClass, className)}
            data-state={state}
            onPointerEnter={clear}
            onPointerLeave={fromPointer(() => hide(false))}
          >
            {content}
          </Layer>
        )}
      </>
    )
  },
)

Tooltip.displayName = "Tooltip"
