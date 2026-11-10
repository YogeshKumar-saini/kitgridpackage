"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  forwardRef,
  type HTMLAttributes,
  useContext,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { ROVING_ITEM_SELECTOR, useRovingFocus } from "../../hooks/use-roving-focus.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { type ToggleSize, type ToggleVariant, toggleVariants } from "../toggle/toggle.js"

interface ToggleGroupBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  size?: ToggleSize
  variant?: ToggleVariant
  orientation?: "horizontal" | "vertical"
  disabled?: boolean
  /** Joins the items into one segmented bar. */
  attached?: boolean
}

export interface ToggleGroupSingleProps extends ToggleGroupBaseProps {
  type?: "single"
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  /** Keeps one item pressed: pressing the current item does nothing. */
  required?: boolean
}

export interface ToggleGroupMultipleProps extends ToggleGroupBaseProps {
  type: "multiple"
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  required?: never
}

export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps

export interface ToggleGroupItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string
}

interface GroupContext {
  pressed: (value: string) => boolean
  toggle: (value: string) => void
  size: ToggleSize
  variant: ToggleVariant
  disabled: boolean
  attached: boolean
}

const Context = createContext<GroupContext | null>(null)

const toArray = (value: string | string[] | null | undefined) =>
  value == null ? [] : Array.isArray(value) ? value : [value]

/**
 * A set of toggle buttons with one tab stop and arrow-key navigation. `single` behaves like a
 * radio set that can be cleared; `multiple` like a row of checkboxes.
 */
export const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>((props, ref) => {
  const {
    type = "single",
    value: valueProp,
    defaultValue,
    onValueChange,
    required = false,
    size = "md",
    variant = "ghost",
    orientation = "horizontal",
    disabled = false,
    attached = false,
    className,
    onKeyDown,
    onFocus,
    children,
    ...rest
  } = props
  const [value, setValue] = useControllableState<string[]>({
    value: valueProp === undefined ? undefined : toArray(valueProp),
    defaultValue: toArray(defaultValue),
    onChange: (next) => {
      if (type === "multiple") (onValueChange as ((v: string[]) => void) | undefined)?.(next)
      else (onValueChange as ((v: string | null) => void) | undefined)?.(next[0] ?? null)
    },
  })
  const roving = useRovingFocus({ orientation })

  const context: GroupContext = {
    pressed: (item) => value.includes(item),
    toggle: (item) => {
      if (type === "multiple") {
        setValue(value.includes(item) ? value.filter((v) => v !== item) : [...value, item])
      } else if (value[0] === item) {
        if (!required) setValue([])
      } else setValue([item])
    },
    size,
    variant,
    disabled,
    attached,
  }

  const groupRef = useRef<HTMLDivElement>(null)
  const rootRef = useComposedRefs(groupRef, ref)
  // Roving tabindex lives on the DOM so items need no index: one tab stop, on the first
  // pressed item, else the first enabled one, and it follows focus.
  const setStop = (target?: HTMLElement) => {
    const items = Array.from(
      groupRef.current?.querySelectorAll<HTMLElement>(ROVING_ITEM_SELECTOR) ?? [],
    )
    const stop =
      target ?? items.find((item) => item.getAttribute("aria-pressed") === "true") ?? items[0]
    for (const item of items) item.tabIndex = item === stop ? 0 : -1
  }
  useIsomorphicLayoutEffect(() => {
    if (!groupRef.current?.contains(document.activeElement)) setStop()
  })

  return (
    <div
      ref={rootRef}
      role="group"
      className={cx(
        "kg-toggle-group inline-flex items-center gap-1",
        "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        // Attached: one sheet; its border and padding sit inside the control height.
        "data-attached:gap-0 data-attached:p-[2px] data-attached:rounded-kg-md",
        "data-attached:border-2 data-attached:border-kg-ink data-attached:bg-kg-surface",
        attached && variant === "outline" && "shadow-[3px_3px_0_var(--kg-ink)]",
        className,
      )}
      data-orientation={orientation}
      data-attached={attached || undefined}
      data-variant={variant}
      aria-orientation={orientation}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (!event.defaultPrevented) roving(event)
      }}
      onFocus={(event) => {
        onFocus?.(event)
        if (event.target.matches(ROVING_ITEM_SELECTOR)) setStop(event.target)
      }}
      {...rest}
    >
      <Context.Provider value={context}>{children}</Context.Provider>
    </div>
  )
})

ToggleGroup.displayName = "ToggleGroup"

export const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, className, disabled, onClick, ...props }, ref) => {
    const group = useContext(Context)
    if (!group) throw new Error("ToggleGroupItem must be used inside ToggleGroup")
    const pressed = group.pressed(value)
    const isDisabled = disabled || group.disabled
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={pressed}
        disabled={isDisabled}
        data-kg-item=""
        data-size={group.size}
        data-variant={group.variant}
        data-state={pressed ? "on" : "off"}
        className={toggleVariants({
          // The attached bar is the outline, so its items sit flat inside it.
          variant: group.attached ? "ghost" : group.variant,
          size: group.size,
          className: cx(
            "kg-toggle-group__item",
            "[[data-attached]>&]:h-[calc(var(--_size)-8px)] [[data-attached]>&]:min-w-[calc(var(--_size)-8px)]",
            "[[data-attached]>&]:rounded-kg-sm",
            className,
          ),
        })}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) group.toggle(value)
        }}
        {...props}
      />
    )
  },
)

ToggleGroupItem.displayName = "ToggleGroupItem"
