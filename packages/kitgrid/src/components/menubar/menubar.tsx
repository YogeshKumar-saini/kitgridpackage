"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
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
import { useFloating } from "../../hooks/use-floating.js"
import { usePresence } from "../../hooks/use-presence.js"
import { Layer } from "../../primitives/layer.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import {
  createMenuCheckboxItem,
  createMenuItem,
  createMenuLabel,
  createMenuSeparator,
  focusMenuItem,
  type MenuCoreCheckboxItemProps,
  MenuCoreContext,
  type MenuCoreItemProps,
  menuContentClass,
  useMenuKeyboard,
} from "../context-menu/menu-core.js"

const triggerClass = [
  "kg-menubar__trigger inline-flex h-[calc(var(--kg-control-sm)-0.25rem)] items-center px-3 cursor-default select-none",
  "[font-family:inherit] text-kg-sm font-medium text-kg-fg-muted bg-transparent border-0 rounded-kg-sm",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:bg-kg-muted interactive:hover:text-kg-fg data-[state=open]:bg-kg-paper-sage data-[state=open]:text-kg-fg data-[state=open]:interactive:hover:bg-kg-paper-sage",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring disabled:opacity-50",
]

type OpenFocus = "first" | "last" | "menu"

const TRIGGER = "[data-kg-menubar-trigger]:not([disabled])"

interface MenubarContextValue {
  value: string | null
  setValue: (value: string | null) => void
  openFocus: RefObject<OpenFocus>
  rootRef: RefObject<HTMLDivElement | null>
  focusTrigger: (value: string) => void
}

const MenubarContext = createContext<MenubarContextValue | null>(null)

const useMenubar = (part: string) => {
  const context = useContext(MenubarContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <Menubar>.`)
  return context
}

const triggersOf = (root: HTMLElement | null): HTMLElement[] =>
  root ? Array.from(root.querySelectorAll<HTMLElement>(TRIGGER)) : []

export interface MenubarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** The open menu's value, or null when all are closed. */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
}

/** An APG menubar: one tab stop, arrow keys between menus, menus that follow the pointer. */
export const Menubar = forwardRef<HTMLDivElement, MenubarProps>(
  (
    { value: valueProp, defaultValue = null, onValueChange, onKeyDown, className, ...props },
    forwardedRef,
  ) => {
    const [value, setValue] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const rootRef = useRef<HTMLDivElement | null>(null)
    const ref = useComposedRefs(rootRef, forwardedRef)
    const openFocus = useRef<OpenFocus>("menu")

    useEffect(() => {
      const triggers = triggersOf(rootRef.current)
      if (!triggers.some((trigger) => trigger.tabIndex === 0) && triggers[0])
        triggers[0].tabIndex = 0
    })

    const context = useMemo<MenubarContextValue>(
      () => ({
        value,
        setValue,
        openFocus,
        rootRef,
        focusTrigger: (target) => {
          triggersOf(rootRef.current)
            .find((trigger) => trigger.dataset.value === target)
            ?.focus()
        },
      }),
      [value, setValue],
    )

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      const target = event.target as HTMLElement
      if (event.defaultPrevented || !target.matches(TRIGGER)) return
      const triggers = triggersOf(rootRef.current)
      const index = triggers.indexOf(target)
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
      let next = -1
      if (event.key === "ArrowRight") next = index + (rtl ? -1 : 1)
      else if (event.key === "ArrowLeft") next = index + (rtl ? 1 : -1)
      else if (event.key === "Home") next = 0
      else if (event.key === "End") next = triggers.length - 1
      else return
      event.preventDefault()
      triggers[(next + triggers.length) % triggers.length]?.focus()
    }

    return (
      <MenubarContext.Provider value={context}>
        <div
          ref={ref}
          role="menubar"
          aria-orientation="horizontal"
          className={cx("kg-menubar inline-flex items-center gap-0.5 p-1 bg-kg-surface border-2 border-kg-ink rounded-kg-lg shadow-kg-sm", className)}
          onKeyDown={handleKeyDown}
          {...props}
        />
      </MenubarContext.Provider>
    )
  },
)

Menubar.displayName = "Menubar"

interface MenubarMenuContextValue {
  value: string
  open: boolean
  triggerRef: RefObject<HTMLButtonElement | null>
  triggerId: string
  contentId: string
}

const MenubarMenuContext = createContext<MenubarMenuContextValue | null>(null)

const useMenubarMenu = (part: string) => {
  const context = useContext(MenubarMenuContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <MenubarMenu>.`)
  return context
}

export interface MenubarMenuProps {
  /** Identifies the menu for the Menubar's `value`. Generated when omitted. */
  value?: string
  children?: ReactNode
}

export const MenubarMenu = ({ value: valueProp, children }: MenubarMenuProps) => {
  const root = useMenubar("MenubarMenu")
  const id = useId()
  const value = valueProp ?? id
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const context = useMemo(
    () => ({
      value,
      open: root.value === value,
      triggerRef,
      triggerId: `${id}-trigger`,
      contentId: `${id}-menu`,
    }),
    [value, root.value, id],
  )
  return <MenubarMenuContext.Provider value={context}>{children}</MenubarMenuContext.Provider>
}

MenubarMenu.displayName = "MenubarMenu"

export interface MenubarTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export const MenubarTrigger = forwardRef<HTMLButtonElement, MenubarTriggerProps>(
  ({ onClick, onKeyDown, onPointerEnter, onFocus, className, ...props }, forwardedRef) => {
    const root = useMenubar("MenubarTrigger")
    const menu = useMenubarMenu("MenubarTrigger")
    const ref = useComposedRefs(menu.triggerRef, forwardedRef)

    const openWith = (focus: OpenFocus) => {
      root.openFocus.current = focus
      root.setValue(menu.value)
    }

    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        id={menu.triggerId}
        tabIndex={-1}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls={menu.open ? menu.contentId : undefined}
        data-state={menu.open ? "open" : "closed"}
        data-value={menu.value}
        data-kg-menubar-trigger=""
        className={cx(triggerClass, className)}
        onFocus={(event) => {
          onFocus?.(event)
          for (const trigger of triggersOf(root.rootRef.current))
            trigger.tabIndex = trigger === event.currentTarget ? 0 : -1
        }}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented) return
          if (menu.open) root.setValue(null)
          else openWith(event.detail === 0 ? "first" : "menu")
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          // Once any menu is open the bar behaves like a desktop menubar: hovering switches.
          if (root.value !== null && !menu.open && event.pointerType !== "touch") {
            event.currentTarget.focus()
            openWith("menu")
          }
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openWith("first")
          } else if (event.key === "ArrowUp") {
            event.preventDefault()
            openWith("last")
          }
        }}
        {...props}
      />
    )
  },
)

MenubarTrigger.displayName = "MenubarTrigger"

export interface MenubarContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  offset?: number
}

export const MenubarContent = forwardRef<HTMLDivElement, MenubarContentProps>(
  ({ align = "start", offset = 6, onKeyDown, className, ...props }, forwardedRef) => {
    const root = useMenubar("MenubarContent")
    const menu = useMenubarMenu("MenubarContent")
    const { open } = menu
    const { ref, present, state } = usePresence<HTMLDivElement>(open)
    const composed = useComposedRefs(ref, forwardedRef)

    const close = (returnFocus: boolean) => {
      root.setValue(null)
      if (returnFocus) root.focusTrigger(menu.value)
    }
    const keyboard = useMenuKeyboard(close)

    useFloating(menu.triggerRef, ref, { open, side: "bottom", align, offset })
    useDismiss({
      enabled: open,
      refs: [ref, root.rootRef],
      onDismiss: (reason) => close(reason === "escape"),
    })

    useEffect(() => {
      if (!open) return
      const focus = root.openFocus.current
      if (focus === "menu") ref.current?.focus({ preventScroll: true })
      else focusMenuItem(ref.current, focus)
    }, [open])

    const core = useMemo(() => ({ close }), [menu.value])

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault()
        const triggers = triggersOf(root.rootRef.current)
        const index = triggers.findIndex((trigger) => trigger.dataset.value === menu.value)
        const step = event.key === "ArrowRight" ? 1 : -1
        const next = triggers[(index + step + triggers.length) % triggers.length]
        if (!next?.dataset.value) return
        root.openFocus.current = "first"
        next.tabIndex = 0
        if (triggers[index]) triggers[index].tabIndex = -1
        root.setValue(next.dataset.value)
        return
      }
      keyboard(event)
    }

    if (!present) return null

    return (
      <MenuCoreContext.Provider value={core}>
        <Layer
          ref={composed}
          id={menu.contentId}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={menu.triggerId}
          tabIndex={-1}
          className={cx(menuContentClass, "kg-menubar__content [--kg-enter-y:-4px]", className)}
          data-state={state}
          onKeyDown={handleKeyDown}
          {...props}
        />
      </MenuCoreContext.Provider>
    )
  },
)

MenubarContent.displayName = "MenubarContent"

export interface MenubarItemProps extends MenuCoreItemProps {}
export const MenubarItem = createMenuItem("MenubarItem")

export interface MenubarCheckboxItemProps extends MenuCoreCheckboxItemProps {}
export const MenubarCheckboxItem = createMenuCheckboxItem("MenubarCheckboxItem")

export interface MenubarSeparatorProps extends HTMLAttributes<HTMLDivElement> {}
export const MenubarSeparator = createMenuSeparator("MenubarSeparator")

export interface MenubarLabelProps extends HTMLAttributes<HTMLDivElement> {}
export const MenubarLabel = createMenuLabel("MenubarLabel")
