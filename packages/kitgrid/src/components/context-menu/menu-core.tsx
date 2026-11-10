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
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { ROVING_ITEM_SELECTOR, useRovingFocus } from "../../hooks/use-roving-focus.js"
import { cx } from "../../utils/cx.js"
import {
  createTypeahead,
  findTypeaheadMatch,
  isTypeaheadKey,
  type Typeahead,
} from "../dropdown-menu/typeahead.js"

/*
 * @internal Menu machinery shared by ContextMenu and Menubar. Items reuse the DropdownMenu
 * visual language (`kg-menu__*`), so every menu in the library reads as one family.
 */

/* Paper Layers: the menu is a lifted sheet; the highlighted item is a slip of sage paper. */
export const menuContentClass = [
  "kg-menu min-w-[max(12rem,var(--kg-anchor-width,0px))] max-w-[min(20rem,calc(100vw-1rem))] max-h-[min(28rem,calc(100dvh-2rem))] p-1 overflow-y-auto overscroll-contain",
  "text-kg-base text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-lg shadow-kg-md outline-none",
  "origin-[var(--kg-origin,top_left)] data-[side=top]:[--kg-enter-y:4px]",
  "data-[state=open]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-pop-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
]

const itemClass = [
  "kg-menu__item group/item flex items-center gap-2.5 min-h-(--kg-control-sm) px-2.5 py-1.5 rounded-kg-sm",
  "leading-[1.3] text-kg-fg outline-none cursor-default select-none [-webkit-tap-highlight-color:transparent]",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out focus:bg-kg-paper-sage",
  "data-destructive:text-kg-danger data-destructive:focus:bg-kg-danger data-destructive:focus:text-kg-danger-fg",
  "data-disabled:cursor-not-allowed data-disabled:opacity-50",
]

const glyphClass =
  "inline-grid size-4 shrink-0 place-items-center group-focus/item:text-current group-data-destructive/item:text-current [&_svg]:size-full"
const iconClass = `kg-menu__icon ${glyphClass} text-kg-fg-muted`
const indicatorClass = `kg-menu__indicator ${glyphClass} text-kg-accent-strong`
const textClass = "kg-menu__text min-w-0 flex-1 truncate"
const shortcutClass =
  "kg-menu__shortcut ms-auto ps-4 [font-family:inherit] text-kg-xs tracking-[0.08em] text-kg-fg-faint group-focus/item:text-current"

export interface MenuCoreValue {
  close: (returnFocus: boolean) => void
}

export const MenuCoreContext = createContext<MenuCoreValue | null>(null)

const useMenuCore = (part: string): MenuCoreValue => {
  const context = useContext(MenuCoreContext)
  if (!context) throw new Error(`<${part}> must be rendered inside its menu content.`)
  return context
}

const textOf = (item: HTMLElement): string =>
  item.dataset.textValue ??
  item.querySelector(".kg-menu__text")?.textContent ??
  item.textContent ??
  ""

/** APG menu keyboard map: arrows, Home/End, typeahead, Enter/Space activate, Tab closes. */
export const useMenuKeyboard = (close: (returnFocus: boolean) => void) => {
  const rove = useRovingFocus({ orientation: "vertical", loop: true })
  const typeahead = useRef<Typeahead | null>(null)
  typeahead.current ??= createTypeahead()

  return (event: ReactKeyboardEvent<HTMLElement>) => {
    const search = typeahead.current as Typeahead
    if (event.key === "Tab") {
      event.preventDefault()
      close(true)
      return
    }
    if (isTypeaheadKey(event) && (event.key !== " " || search.active())) {
      event.preventDefault()
      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(ROVING_ITEM_SELECTOR),
      )
      const current = items.indexOf(document.activeElement as HTMLElement)
      items[findTypeaheadMatch(items.map(textOf), search.push(event.key), current)]?.focus()
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      const item = (event.target as HTMLElement).closest<HTMLElement>("[data-kg-item]")
      if (item && event.currentTarget.contains(item)) {
        event.preventDefault()
        item.click()
      }
      return
    }
    rove(event)
  }
}

export const focusMenuItem = (menu: HTMLElement | null, which: "first" | "last") => {
  if (!menu) return
  const items = Array.from(menu.querySelectorAll<HTMLElement>(ROVING_ITEM_SELECTOR))
  const target = which === "first" ? items[0] : items.at(-1)
  ;(target ?? menu).focus({ preventScroll: true })
}

interface ItemBehaviourOptions {
  disabled?: boolean | undefined
  closeOnSelect: boolean
  onSelect?: ((event: Event) => void) | undefined
  onActivate?: (() => void) | undefined
  onClick?: ((event: ReactMouseEvent<HTMLDivElement>) => void) | undefined
  onPointerMove?: ((event: ReactPointerEvent<HTMLDivElement>) => void) | undefined
}

const useItemBehaviour = (part: string, options: ItemBehaviourOptions) => {
  const context = useMenuCore(part)
  const { disabled, closeOnSelect, onSelect, onActivate, onClick, onPointerMove } =
    options
  return {
    tabIndex: -1,
    "data-kg-item": "",
    "aria-disabled": disabled || undefined,
    "data-disabled": disabled || undefined,
    onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
      onClick?.(event)
      if (disabled || event.defaultPrevented) return
      onActivate?.()
      const selection = new Event("kg.menu.select", { cancelable: true })
      onSelect?.(selection)
      if (closeOnSelect && !selection.defaultPrevented) context.close(true)
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event)
      if (disabled || event.pointerType === "touch") return
      if (document.activeElement !== event.currentTarget)
        event.currentTarget.focus({ preventScroll: true })
    },
  }
}

export interface MenuCoreItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  icon?: ReactNode
  /** Display-only shortcut hint, e.g. "⌘C". */
  shortcut?: ReactNode
  destructive?: boolean
  disabled?: boolean
  closeOnSelect?: boolean
  /** Called on click, Enter or Space. `event.preventDefault()` keeps the menu open. */
  onSelect?: (event: Event) => void
  textValue?: string
}

export const createMenuItem = (displayName: string) => {
  const Item = forwardRef<HTMLDivElement, MenuCoreItemProps>(
    (
      {
        icon,
        shortcut,
        destructive = false,
        disabled,
        closeOnSelect = true,
        onSelect,
        textValue,
        onClick,
        onPointerMove,
        className,
        children,
        ...props
      },
      ref,
    ) => {
      const behaviour = useItemBehaviour(displayName, {
        disabled,
        closeOnSelect,
        onSelect,
        onClick,
        onPointerMove,
      })
      return (
        <div
          ref={ref}
          role="menuitem"
          className={cx(itemClass, className)}
          data-destructive={destructive || undefined}
          data-text-value={textValue}
          {...props}
          {...behaviour}
        >
          {icon != null && (
            <span className={iconClass} aria-hidden="true">
              {icon}
            </span>
          )}
          <span className={textClass}>{children}</span>
          {shortcut != null && <kbd className={shortcutClass}>{shortcut}</kbd>}
        </div>
      )
    },
  )
  Item.displayName = displayName
  return Item
}

export interface MenuCoreCheckboxItemProps
  extends Omit<MenuCoreItemProps, "icon" | "destructive"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const createMenuCheckboxItem = (displayName: string) => {
  const Item = forwardRef<HTMLDivElement, MenuCoreCheckboxItemProps>(
    (
      {
        checked: checkedProp,
        defaultChecked = false,
        onCheckedChange,
        shortcut,
        disabled,
        closeOnSelect = false,
        onSelect,
        textValue,
        onClick,
        onPointerMove,
        className,
        children,
        ...props
      },
      ref,
    ) => {
      const [checked, setChecked] = useControllableState({
        value: checkedProp,
        defaultValue: defaultChecked,
        onChange: onCheckedChange,
      })
      const behaviour = useItemBehaviour(displayName, {
        disabled,
        closeOnSelect,
        onSelect,
        onActivate: () => setChecked((value) => !value),
        onClick,
        onPointerMove,
      })
      return (
        <div
          ref={ref}
          role="menuitemcheckbox"
          aria-checked={checked}
          className={cx(itemClass, className)}
          data-state={checked ? "checked" : "unchecked"}
          data-text-value={textValue}
          {...props}
          {...behaviour}
        >
          <span className={indicatorClass} aria-hidden="true">
            {checked && <CheckIcon />}
          </span>
          <span className={textClass}>{children}</span>
          {shortcut != null && <kbd className={shortcutClass}>{shortcut}</kbd>}
        </div>
      )
    },
  )
  Item.displayName = displayName
  return Item
}

export const createMenuSeparator = (displayName: string) => {
  const Separator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div
        ref={ref}
        role="separator"
        className={cx("kg-menu__separator -mx-1 my-1 h-px bg-kg-ink", className)}
        {...props}
      />
    ),
  )
  Separator.displayName = displayName
  return Separator
}

export const createMenuLabel = (displayName: string) => {
  const Label = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={cx("kg-menu__label px-2.5 pt-1.5 pb-1 text-kg-xs font-semibold tracking-[0.02em] text-kg-fg-muted", className)} {...props} />
    ),
  )
  Label.displayName = displayName
  return Label
}
