"use client"

import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useDismiss } from "../../hooks/use-dismiss.js"
import { useFloating } from "../../hooks/use-floating.js"
import { usePresence } from "../../hooks/use-presence.js"
import { Layer } from "../../primitives/layer.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import {
  createMenuCheckboxItem,
  createMenuItem,
  createMenuLabel,
  createMenuSeparator,
  type MenuCoreCheckboxItemProps,
  MenuCoreContext,
  type MenuCoreItemProps,
  focusMenuItem,
  menuContentClass,
  useMenuKeyboard,
} from "./menu-core.js"

interface Point {
  x: number
  y: number
}

interface ContextMenuContextValue {
  open: boolean
  point: Point
  openAt: (point: Point) => void
  close: (returnFocus: boolean) => void
  returnTo: { current: HTMLElement | null }
  contentId: string
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null)

const useContextMenu = (part: string) => {
  const context = useContext(ContextMenuContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <ContextMenu>.`)
  return context
}

export interface ContextMenuProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

/** Owns the open state and the pointer position the menu opens at. Renders no element. */
export const ContextMenu = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: ContextMenuProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 })
  const returnTo = useRef<HTMLElement | null>(null)
  const contentId = `${useId()}-context-menu`

  const value = useMemo<ContextMenuContextValue>(
    () => ({
      open,
      point,
      openAt: (next) => {
        const active = document.activeElement
        returnTo.current = active instanceof HTMLElement ? active : null
        setPoint(next)
        setOpen(true)
      },
      close: (shouldReturn) => {
        setOpen(false)
        if (shouldReturn) requestAnimationFrame(() => returnTo.current?.focus())
      },
      returnTo,
      contentId,
    }),
    [open, point, setOpen, contentId],
  )

  return <ContextMenuContext.Provider value={value}>{children}</ContextMenuContext.Provider>
}

ContextMenu.displayName = "ContextMenu"

const LONG_PRESS = 520

export interface ContextMenuTriggerProps extends HTMLAttributes<HTMLDivElement> {
  /** Merge behaviour onto the single child element instead of rendering a <div>. */
  asChild?: boolean
  disabled?: boolean
}

/**
 * The region that answers right-click, a touch long-press, Shift+F10 and the ContextMenu key.
 * Keyboard opening anchors the menu to the focused element.
 */
export const ContextMenuTrigger = forwardRef<HTMLDivElement, ContextMenuTriggerProps>(
  (
    {
      asChild = false,
      disabled = false,
      onContextMenu,
      onKeyDown,
      onPointerDown,
      onPointerUp,
      onPointerMove,
      onPointerCancel,
      ...props
    },
    ref,
  ) => {
    const context = useContextMenu("ContextMenuTrigger")
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const start = useRef<Point | null>(null)
    const clear = () => {
      clearTimeout(timer.current)
      start.current = null
    }
    useEffect(() => () => clearTimeout(timer.current), [])

    const shared = {
      ref,
      "data-state": context.open ? "open" : "closed",
      "data-disabled": disabled || undefined,
      onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => {
        onContextMenu?.(event)
        if (disabled || event.defaultPrevented) return
        event.preventDefault()
        context.openAt({ x: event.clientX, y: event.clientY })
      },
      onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event)
        if (disabled || event.defaultPrevented) return
        if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
          event.preventDefault()
          const target = event.target as HTMLElement
          const rect = target.getBoundingClientRect()
          context.openAt({ x: rect.left + 8, y: rect.bottom })
        }
      },
      onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
        onPointerDown?.(event)
        if (disabled || event.pointerType !== "touch") return
        start.current = { x: event.clientX, y: event.clientY }
        const point = { x: event.clientX, y: event.clientY }
        timer.current = setTimeout(() => context.openAt(point), LONG_PRESS)
      },
      onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
        onPointerMove?.(event)
        const origin = start.current
        if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10)
          clear()
      },
      onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
        onPointerUp?.(event)
        clear()
      },
      onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => {
        onPointerCancel?.(event)
        clear()
      },
    }

    if (asChild) return <Slot {...shared} {...props} />
    return <div className="kg-context-menu__trigger [-webkit-touch-callout:none]" {...shared} {...props} />
  },
)

ContextMenuTrigger.displayName = "ContextMenuTrigger"

export interface ContextMenuContentProps extends HTMLAttributes<HTMLDivElement> {}

export const ContextMenuContent = forwardRef<HTMLDivElement, ContextMenuContentProps>(
  ({ onKeyDown, className, style, ...props }, forwardedRef) => {
    const context = useContextMenu("ContextMenuContent")
    const { open, point, close } = context
    const { ref, present, state } = usePresence<HTMLDivElement>(open)
    const composed = useComposedRefs(ref, forwardedRef)
    const anchor = useRef<HTMLSpanElement>(null)
    const keyboard = useMenuKeyboard(close)

    useFloating(anchor, ref, { open, side: "bottom", align: "start", offset: 2 })
    useDismiss({
      enabled: open,
      refs: [ref],
      onDismiss: (reason) => close(reason === "escape"),
    })

    useEffect(() => {
      if (open) focusMenuItem(ref.current, "first")
    }, [open, point])

    const core = useMemo(() => ({ close }), [close])
    if (!present) return null

    return (
      <>
        <span
          ref={anchor}
          aria-hidden="true"
          className="kg-context-menu__anchor pointer-events-none fixed size-0"
          style={{ left: point.x, top: point.y }}
        />
        <MenuCoreContext.Provider value={core}>
          <Layer
            ref={composed}
            id={context.contentId}
            role="menu"
            aria-orientation="vertical"
            tabIndex={-1}
            className={cx(menuContentClass, "kg-context-menu [--kg-enter-y:-2px]", className)}
            data-state={state}
            style={style}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              onKeyDown?.(event)
              if (!event.defaultPrevented) keyboard(event)
            }}
            {...props}
          />
        </MenuCoreContext.Provider>
      </>
    )
  },
)

ContextMenuContent.displayName = "ContextMenuContent"

export interface ContextMenuItemProps extends MenuCoreItemProps {}
export const ContextMenuItem = createMenuItem("ContextMenuItem")

export interface ContextMenuCheckboxItemProps extends MenuCoreCheckboxItemProps {}
export const ContextMenuCheckboxItem = createMenuCheckboxItem("ContextMenuCheckboxItem")

export interface ContextMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}
export const ContextMenuSeparator = createMenuSeparator("ContextMenuSeparator")

export interface ContextMenuLabelProps extends HTMLAttributes<HTMLDivElement> {}
export const ContextMenuLabel = createMenuLabel("ContextMenuLabel")
