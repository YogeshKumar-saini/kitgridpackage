"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  type Dispatch,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useDismiss } from "../../hooks/use-dismiss.js"
import { type Align, type Side, useFloating } from "../../hooks/use-floating.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { usePresence } from "../../hooks/use-presence.js"
import { ROVING_ITEM_SELECTOR, useRovingFocus } from "../../hooks/use-roving-focus.js"
import { Layer } from "../../primitives/layer.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { shouldReclaimFocus } from "../dialog/focus.js"
import {
  createTypeahead,
  findTypeaheadMatch,
  isTypeaheadKey,
  type Typeahead,
} from "./typeahead.js"

type OpenFocus = "first" | "last" | "menu"

/*
 * Paper Layers: the menu is a lifted sheet; the highlighted item is a slip of sage paper.
 * Set --_menu-width on the content to raise its minimum width.
 */
const menuClass = [
  "kg-menu min-w-[max(var(--_menu-width,12rem),var(--kg-anchor-width,0px))] max-w-[min(20rem,calc(100vw-1rem))] max-h-[min(28rem,calc(100dvh-2rem))] p-1 overflow-y-auto overscroll-contain",
  "text-kg-base text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-lg shadow-kg-md outline-none",
  "origin-[var(--kg-origin,top_left)] [--kg-enter-y:0px]",
  "data-[side=top]:[--kg-enter-y:4px] data-[side=bottom]:[--kg-enter-y:-4px]",
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

interface MenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  close: (returnFocus: boolean) => void
  returnFocus: RefObject<boolean>
  openFocus: RefObject<OpenFocus>
  triggerRef: RefObject<HTMLElement | null>
  triggerId: string
  contentId: string
}

const MenuContext = createContext<MenuContextValue | null>(null)

const useMenuContext = (part: string): MenuContextValue => {
  const context = useContext(MenuContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <DropdownMenu>.`)
  return context
}

export interface DropdownMenuProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

/** Owns the open state of an APG menu button. Renders no element. */
export const DropdownMenu = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: DropdownMenuProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })
  const triggerRef = useRef<HTMLElement | null>(null)
  const returnFocus = useRef(true)
  const openFocus = useRef<OpenFocus>("menu")
  const id = useId()

  const close = useCallback(
    (shouldReturn: boolean) => {
      returnFocus.current = shouldReturn
      setOpen(false)
    },
    [setOpen],
  )

  const value = useMemo<MenuContextValue>(
    () => ({
      open,
      setOpen,
      close,
      returnFocus,
      openFocus,
      triggerRef,
      triggerId: `${id}-trigger`,
      contentId: `${id}-menu`,
    }),
    [open, setOpen, close, id],
  )

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

DropdownMenu.displayName = "DropdownMenu"

export interface DropdownMenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Merge behaviour onto the single child element (e.g. a kitgrid Button) instead. */
  asChild?: boolean
}

export const DropdownMenuTrigger = forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ asChild = false, onClick, onKeyDown, ...props }, forwardedRef) => {
  const context = useMenuContext("DropdownMenuTrigger")
  const ref = useComposedRefs(context.triggerRef, forwardedRef)

  const openWith = (focus: OpenFocus) => {
    context.openFocus.current = focus
    context.setOpen(true)
  }

  const shared = {
    ref,
    "aria-haspopup": "menu" as const,
    "aria-expanded": context.open,
    "aria-controls": context.open ? context.contentId : undefined,
    "data-state": context.open ? "open" : "closed",
    onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (event.defaultPrevented) return
      if (context.open) context.close(true)
      // detail is 0 for clicks synthesised from Enter or Space.
      else openWith(event.detail === 0 ? "first" : "menu")
    },
    onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        openWith(event.key === "ArrowDown" ? "first" : "last")
      }
    },
  }

  if (asChild) return <Slot {...shared} {...props} id={context.triggerId} />
  return <button type="button" {...shared} {...props} id={context.triggerId} />
})

DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const textOf = (item: HTMLElement): string =>
  item.dataset.textValue ??
  item.querySelector(".kg-menu__text")?.textContent ??
  item.textContent ??
  ""

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: Side
  align?: Align
  /** Gap from the trigger, in px. */
  offset?: number
  /** Wrap arrow-key navigation from the last item to the first. */
  loop?: boolean
}

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  (
    {
      side = "bottom",
      align = "start",
      offset = 6,
      loop = true,
      onKeyDown,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const context = useMenuContext("DropdownMenuContent")
    const { open, triggerRef, close, returnFocus, openFocus } = context
    const { ref, present, state } = usePresence<HTMLDivElement>(open)
    const composed = useComposedRefs(ref, forwardedRef)
    const rove = useRovingFocus({ orientation: "vertical", loop })
    const typeahead = useRef<Typeahead | null>(null)
    typeahead.current ??= createTypeahead()

    useFloating(triggerRef, ref, { open, side, align, offset })
    useDismiss({
      enabled: open,
      refs: [ref, triggerRef],
      onDismiss: (reason) => close(reason === "escape"),
    })

    const wasOpen = useRef(false)
    useEffect(() => {
      const node = ref.current
      if (open) {
        wasOpen.current = true
        returnFocus.current = true
        if (!node) return
        const items = Array.from(
          node.querySelectorAll<HTMLElement>(ROVING_ITEM_SELECTOR),
        )
        const target =
          openFocus.current === "first"
            ? items[0]
            : openFocus.current === "last"
              ? items.at(-1)
              : undefined
        ;(target ?? node).focus({ preventScroll: true })
        return
      }
      if (!wasOpen.current) return
      wasOpen.current = false
      typeahead.current?.reset()
      if (returnFocus.current && shouldReclaimFocus(node)) triggerRef.current?.focus()
    }, [open])

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const search = typeahead.current as Typeahead

      if (event.key === "Tab") {
        // APG: Tab leaves the menu, closing it, rather than walking through its items.
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
        const match = findTypeaheadMatch(
          items.map(textOf),
          search.push(event.key),
          current,
        )
        items[match]?.focus()
        return
      }

      if (event.key === "Enter" || event.key === " ") {
        const item = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-kg-item]",
        )
        if (item && event.currentTarget.contains(item)) {
          event.preventDefault()
          item.click()
        }
        return
      }

      rove(event)
    }

    if (!present) return null

    return (
      <Layer
        ref={composed}
        id={context.contentId}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby={props["aria-label"] ? undefined : context.triggerId}
        tabIndex={-1}
        className={cx(menuClass, className)}
        data-state={state}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  },
)

DropdownMenuContent.displayName = "DropdownMenuContent"

interface ItemBehaviour {
  disabled?: boolean | undefined
  closeOnSelect: boolean
  onSelect?: ((event: Event) => void) | undefined
  onActivate?: (() => void) | undefined
  onClick?: ((event: ReactMouseEvent<HTMLDivElement>) => void) | undefined
  onPointerMove?: ((event: ReactPointerEvent<HTMLDivElement>) => void) | undefined
  onPointerLeave?: ((event: ReactPointerEvent<HTMLDivElement>) => void) | undefined
}

const useItemBehaviour = (
  part: string,
  {
    disabled,
    closeOnSelect,
    onSelect,
    onActivate,
    onClick,
    onPointerMove,
    onPointerLeave,
  }: ItemBehaviour,
) => {
  const context = useMenuContext(part)
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
    // Hover moves real focus, so pointer and keyboard share one highlight.
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event)
      if (disabled || event.pointerType === "touch") return
      if (document.activeElement !== event.currentTarget) {
        event.currentTarget.focus({ preventScroll: true })
      }
    },
    onPointerLeave: (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event)
      if (document.activeElement === event.currentTarget) {
        event.currentTarget
          .closest<HTMLElement>("[role='menu']")
          ?.focus({ preventScroll: true })
      }
    },
  }
}

interface MenuItemBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  disabled?: boolean
  /** Called on click, Enter or Space. Call `event.preventDefault()` to keep the menu open. */
  onSelect?: (event: Event) => void
  /** Text matched by typeahead when the label isn't plain text. */
  textValue?: string
  /** Keyboard shortcut hint shown at the end, e.g. "⌘K". Display only. */
  shortcut?: ReactNode
}

export interface DropdownMenuItemProps extends MenuItemBaseProps {
  icon?: ReactNode
  /** Styles the item as destructive. Pair with a clear label; color is not the only signal. */
  destructive?: boolean
  closeOnSelect?: boolean
}

export const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  (
    {
      icon,
      shortcut,
      destructive = false,
      disabled,
      onSelect,
      closeOnSelect = true,
      textValue,
      onClick,
      onPointerMove,
      onPointerLeave,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const behaviour = useItemBehaviour("DropdownMenuItem", {
      disabled,
      closeOnSelect,
      onSelect,
      onClick,
      onPointerMove,
      onPointerLeave,
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

DropdownMenuItem.displayName = "DropdownMenuItem"

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const DotIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
  </svg>
)

export interface DropdownMenuCheckboxItemProps extends MenuItemBaseProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** Checkbox items stay open by default so several can be toggled in a row. */
  closeOnSelect?: boolean
}

export const DropdownMenuCheckboxItem = forwardRef<
  HTMLDivElement,
  DropdownMenuCheckboxItemProps
>(
  (
    {
      checked: checkedProp,
      defaultChecked = false,
      onCheckedChange,
      shortcut,
      disabled,
      onSelect,
      closeOnSelect = false,
      textValue,
      onClick,
      onPointerMove,
      onPointerLeave,
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
    const behaviour = useItemBehaviour("DropdownMenuCheckboxItem", {
      disabled,
      closeOnSelect,
      onSelect,
      onActivate: () => setChecked((value) => !value),
      onClick,
      onPointerMove,
      onPointerLeave,
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

DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

interface GroupLabelContextValue {
  setLabelId: Dispatch<SetStateAction<string | undefined>>
}

const GroupLabelContext = createContext<GroupLabelContextValue | null>(null)

const useGroupLabel = () => {
  const [labelId, setLabelId] = useState<string | undefined>(undefined)
  const context = useMemo(() => ({ setLabelId }), [])
  return { labelId, context }
}

export interface DropdownMenuGroupProps extends HTMLAttributes<HTMLDivElement> {}

/** Groups related items; a DropdownMenuLabel inside names the group for screen readers. */
export const DropdownMenuGroup = forwardRef<HTMLDivElement, DropdownMenuGroupProps>(
  ({ className, children, ...props }, ref) => {
    const { labelId, context } = useGroupLabel()
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={labelId}
        className={cx("kg-menu__group", className)}
        {...props}
      >
        <GroupLabelContext.Provider value={context}>
          {children}
        </GroupLabelContext.Provider>
      </div>
    )
  },
)

DropdownMenuGroup.displayName = "DropdownMenuGroup"

interface RadioGroupContextValue {
  value: string | undefined
  setValue: (value: string) => void
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

export interface DropdownMenuRadioGroupProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue"
> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export const DropdownMenuRadioGroup = forwardRef<
  HTMLDivElement,
  DropdownMenuRadioGroupProps
>(
  (
    { value: valueProp, defaultValue, onValueChange, className, children, ...props },
    ref,
  ) => {
    const [value, setValue] = useControllableState<string | undefined>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((value: string | undefined) => void) | undefined,
    })
    const { labelId, context } = useGroupLabel()
    const radio = useMemo<RadioGroupContextValue>(
      () => ({ value, setValue }),
      [value, setValue],
    )
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={labelId}
        className={cx("kg-menu__group", className)}
        {...props}
      >
        <GroupLabelContext.Provider value={context}>
          <RadioGroupContext.Provider value={radio}>
            {children}
          </RadioGroupContext.Provider>
        </GroupLabelContext.Provider>
      </div>
    )
  },
)

DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup"

export interface DropdownMenuRadioItemProps extends MenuItemBaseProps {
  value: string
  /** Radio items stay open by default so the new choice is visible. */
  closeOnSelect?: boolean
}

export const DropdownMenuRadioItem = forwardRef<
  HTMLDivElement,
  DropdownMenuRadioItemProps
>(
  (
    {
      value,
      shortcut,
      disabled,
      onSelect,
      closeOnSelect = false,
      textValue,
      onClick,
      onPointerMove,
      onPointerLeave,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const group = useContext(RadioGroupContext)
    if (!group)
      throw new Error(
        "<DropdownMenuRadioItem> must be inside <DropdownMenuRadioGroup>.",
      )
    const checked = group.value === value
    const behaviour = useItemBehaviour("DropdownMenuRadioItem", {
      disabled,
      closeOnSelect,
      onSelect,
      onActivate: () => group.setValue(value),
      onClick,
      onPointerMove,
      onPointerLeave,
    })
    return (
      <div
        ref={ref}
        role="menuitemradio"
        aria-checked={checked}
        className={cx(itemClass, className)}
        data-state={checked ? "checked" : "unchecked"}
        data-text-value={textValue}
        {...props}
        {...behaviour}
      >
        <span className={indicatorClass} aria-hidden="true">
          {checked && <DotIcon />}
        </span>
        <span className={textClass}>{children}</span>
        {shortcut != null && <kbd className={shortcutClass}>{shortcut}</kbd>}
      </div>
    )
  },
)

DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem"

export interface DropdownMenuLabelProps extends HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuLabel = forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, id: idProp, ...props }, ref) => {
    const group = useContext(GroupLabelContext)
    const generated = useId()
    const id = idProp ?? generated
    useIsomorphicLayoutEffect(() => {
      if (!group) return
      group.setLabelId(id)
      return () => group.setLabelId(undefined)
    }, [group, id])
    return (
      <div
        ref={ref}
        id={id}
        className={cx(
          "kg-menu__label px-2.5 pt-1.5 pb-1 text-kg-xs font-semibold tracking-[0.02em] text-kg-fg-muted",
          className,
        )}
        {...props}
      />
    )
  },
)

DropdownMenuLabel.displayName = "DropdownMenuLabel"

export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuSeparator = forwardRef<
  HTMLDivElement,
  DropdownMenuSeparatorProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cx("kg-menu__separator -mx-1 my-1 h-px bg-kg-ink", className)}
    {...props}
  />
))

DropdownMenuSeparator.displayName = "DropdownMenuSeparator"
