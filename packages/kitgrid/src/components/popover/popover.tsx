"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
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
import { focusInto, shouldReclaimFocus } from "../dialog/focus.js"

/*
 * Paper Layers: a sheet lifted off the page, settling onto its offset as it opens. Consumers
 * resize it by setting --_popover-width, --_popover-pad and --_popover-radius on the content.
 */
const popoverClass = [
  "kg-popover w-(--_popover-width,max-content) max-w-[min(24rem,calc(100vw-1rem))] p-(--_popover-pad,calc(var(--kg-space)*4)) rounded-(--_popover-radius,var(--kg-radius-lg))",
  "data-match-width:w-(--kg-anchor-width,max-content) data-match-width:max-w-[calc(100vw-1rem)]",
  "text-kg-base leading-normal text-kg-fg bg-kg-surface border-2 border-kg-ink shadow-kg-md outline-none",
  "origin-[var(--kg-origin,center)] [--kg-enter-y:0px]",
  "data-[side=top]:[--kg-enter-y:4px] data-[side=bottom]:[--kg-enter-y:-4px]",
  "data-[state=open]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-pop-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
]

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  /** Closes, optionally handing focus back to the trigger. */
  close: (returnFocus: boolean) => void
  returnFocus: RefObject<boolean>
  triggerRef: RefObject<HTMLElement | null>
  anchorRef: RefObject<HTMLElement | null>
  contentId: string
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

const usePopoverContext = (part: string): PopoverContextValue => {
  const context = useContext(PopoverContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <Popover>.`)
  return context
}

export interface PopoverProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

/** Owns the open state of a non-modal dialog anchored to its trigger. Renders no element. */
export const Popover = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: PopoverProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })
  const triggerRef = useRef<HTMLElement | null>(null)
  const anchorRef = useRef<HTMLElement | null>(null)
  const returnFocus = useRef(true)
  const contentId = `${useId()}-popover`

  const close = useCallback(
    (shouldReturn: boolean) => {
      returnFocus.current = shouldReturn
      setOpen(false)
    },
    [setOpen],
  )

  const value = useMemo<PopoverContextValue>(
    () => ({ open, setOpen, close, returnFocus, triggerRef, anchorRef, contentId }),
    [open, setOpen, close, contentId],
  )

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>
}

Popover.displayName = "Popover"

export interface PopoverTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Merge behaviour onto the single child element instead of rendering a <button>. */
  asChild?: boolean
}

export const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ asChild = false, onClick, ...props }, forwardedRef) => {
    const context = usePopoverContext("PopoverTrigger")
    const ref = useComposedRefs(context.triggerRef, forwardedRef)
    const shared = {
      ref,
      "aria-haspopup": "dialog" as const,
      "aria-expanded": context.open,
      "aria-controls": context.open ? context.contentId : undefined,
      "data-state": context.open ? "open" : "closed",
      onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (context.open) context.close(true)
        else context.setOpen(true)
      },
    }
    if (asChild) return <Slot {...shared} {...props} />
    return <button type="button" {...shared} {...props} />
  },
)

PopoverTrigger.displayName = "PopoverTrigger"

export interface PopoverAnchorProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

/** Positions the popover against this element instead of the trigger. */
export const PopoverAnchor = forwardRef<HTMLDivElement, PopoverAnchorProps>(
  ({ asChild = false, ...props }, forwardedRef) => {
    const context = usePopoverContext("PopoverAnchor")
    const ref = useComposedRefs(context.anchorRef, forwardedRef)
    if (asChild) return <Slot ref={ref} {...props} />
    return <div ref={ref} {...props} />
  },
)

PopoverAnchor.displayName = "PopoverAnchor"

export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: Side
  align?: Align
  /** Gap from the anchor, in px. */
  offset?: number
  /** Make the popover at least as wide as its anchor. */
  matchWidth?: boolean
  /** Receives focus on open. Defaults to the first focusable element, else the popover. */
  initialFocus?: RefObject<HTMLElement | null>
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      side = "bottom",
      align = "center",
      offset = 8,
      matchWidth = false,
      initialFocus,
      onBlur,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const context = usePopoverContext("PopoverContent")
    const { open, triggerRef, anchorRef, returnFocus, close } = context
    const { ref, present, state } = usePresence<HTMLDivElement>(open)
    const composed = useComposedRefs(ref, forwardedRef)
    const anchor = useMemo<RefObject<HTMLElement | null>>(
      () => ({
        get current() {
          return anchorRef.current ?? triggerRef.current
        },
      }),
      [anchorRef, triggerRef],
    )

    useFloating(anchor, ref, { open, side, align, offset, matchWidth })
    useDismiss({
      enabled: open,
      refs: [ref, triggerRef, anchorRef],
      onDismiss: (reason) => close(reason === "escape"),
    })

    const wasOpen = useRef(false)
    useEffect(() => {
      const node = ref.current
      if (open) {
        wasOpen.current = true
        returnFocus.current = true
        if (node) focusInto(node, initialFocus?.current)
        return
      }
      if (!wasOpen.current) return
      wasOpen.current = false
      if (returnFocus.current && shouldReclaimFocus(node)) triggerRef.current?.focus()
    }, [open])

    const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
      onBlur?.(event)
      const next = event.relatedTarget as Node | null
      // Tabbing out of a non-modal popover closes it; switching windows (null target) doesn't.
      if (
        !next ||
        event.currentTarget.contains(next) ||
        triggerRef.current?.contains(next)
      )
        return
      close(false)
    }

    if (!present) return null

    return (
      <Layer
        ref={composed}
        id={context.contentId}
        role="dialog"
        tabIndex={-1}
        className={cx(popoverClass, className)}
        data-state={state}
        data-match-width={matchWidth || undefined}
        onBlur={handleBlur}
        {...props}
      />
    )
  },
)

PopoverContent.displayName = "PopoverContent"

export interface PopoverCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const PopoverClose = forwardRef<HTMLButtonElement, PopoverCloseProps>(
  ({ asChild = false, onClick, ...props }, ref) => {
    const context = usePopoverContext("PopoverClose")
    const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) context.close(true)
    }
    if (asChild) return <Slot ref={ref} onClick={handleClick} {...props} />
    return <button ref={ref} type="button" onClick={handleClick} {...props} />
  },
)

PopoverClose.displayName = "PopoverClose"
