"use client"

import {
  createContext,
  forwardRef,
  type FocusEvent as ReactFocusEvent,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
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

/* A lifted sheet that settles onto its offset as it opens. */
const cardClass = [
  "kg-hover-card w-[min(20rem,calc(100vw-1rem))] p-4 text-kg-sm leading-normal",
  "text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-xl shadow-kg-md",
  "origin-[var(--kg-origin,center_top)] [--kg-enter-y:0px] data-[side=top]:[--kg-enter-y:4px] data-[side=bottom]:[--kg-enter-y:-4px]",
  "data-[state=open]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-pop-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
]

interface HoverCardContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  show: () => void
  hide: () => void
  triggerRef: RefObject<HTMLElement | null>
  contentId: string
}

const HoverCardContext = createContext<HoverCardContextValue | null>(null)

const useHoverCard = (part: string) => {
  const context = useContext(HoverCardContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <HoverCard>.`)
  return context
}

export interface HoverCardProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Hover or focus time before opening, in ms. */
  openDelay?: number
  /** Grace period that lets the pointer travel from trigger to card, in ms. */
  closeDelay?: number
  children?: ReactNode
}

/**
 * A preview card for sighted pointer and keyboard users. It supplements a link that already
 * works on its own, so it never holds content that is unreachable elsewhere.
 */
export const HoverCard = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  openDelay = 500,
  closeDelay = 240,
  children,
}: HoverCardProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })
  const triggerRef = useRef<HTMLElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const contentId = `${useId()}-hover-card`
  useEffect(() => () => clearTimeout(timer.current), [])

  const value = useMemo<HoverCardContextValue>(
    () => ({
      open,
      setOpen,
      show: () => {
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setOpen(true), openDelay)
      },
      hide: () => {
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setOpen(false), closeDelay)
      },
      triggerRef,
      contentId,
    }),
    [open, setOpen, openDelay, closeDelay, contentId],
  )

  return <HoverCardContext.Provider value={value}>{children}</HoverCardContext.Provider>
}

HoverCard.displayName = "HoverCard"

export interface HoverCardTriggerProps extends HTMLAttributes<HTMLElement> {
  /** Merge behaviour onto the single child (usually a link). Defaults to true. */
  asChild?: boolean
}

export const HoverCardTrigger = forwardRef<HTMLElement, HoverCardTriggerProps>(
  (
    { asChild = true, onPointerEnter, onPointerLeave, onFocus, onBlur, ...props },
    forwardedRef,
  ) => {
    const context = useHoverCard("HoverCardTrigger")
    const ref = useComposedRefs(context.triggerRef, forwardedRef)
    const shared = {
      ref,
      "data-state": context.open ? "open" : "closed",
      "aria-describedby": context.open ? context.contentId : undefined,
      onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => {
        onPointerEnter?.(event)
        if (event.pointerType !== "touch") context.show()
      },
      onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => {
        onPointerLeave?.(event)
        context.hide()
      },
      onFocus: (event: ReactFocusEvent<HTMLElement>) => {
        onFocus?.(event)
        context.show()
      },
      onBlur: (event: ReactFocusEvent<HTMLElement>) => {
        onBlur?.(event)
        context.hide()
      },
    }
    if (asChild) return <Slot {...shared} {...props} />
    return <span {...shared} {...props} />
  },
)

HoverCardTrigger.displayName = "HoverCardTrigger"

export interface HoverCardContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: Side
  align?: Align
  offset?: number
}

export const HoverCardContent = forwardRef<HTMLDivElement, HoverCardContentProps>(
  (
    {
      side = "bottom",
      align = "center",
      offset = 10,
      onPointerEnter,
      onPointerLeave,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const context = useHoverCard("HoverCardContent")
    const { open, triggerRef } = context
    const { ref, present, state } = usePresence<HTMLDivElement>(open)
    const composed = useComposedRefs(ref, forwardedRef)

    useFloating(triggerRef, ref, { open, side, align, offset })
    useDismiss({
      enabled: open,
      refs: [ref, triggerRef],
      onDismiss: () => context.setOpen(false),
    })

    if (!present) return null
    return (
      <Layer
        ref={composed}
        id={context.contentId}
        className={cx(cardClass, className)}
        data-state={state}
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          context.show()
          context.setOpen(true)
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event)
          context.hide()
        }}
        {...props}
      />
    )
  },
)

HoverCardContent.displayName = "HoverCardContent"
