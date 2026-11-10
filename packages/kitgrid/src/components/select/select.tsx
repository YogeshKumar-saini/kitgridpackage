"use client"

import {
  type ButtonHTMLAttributes,
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
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
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"
import {
  createTypeahead,
  findTypeaheadMatch,
  isTypeaheadKey,
  type Typeahead,
} from "../dropdown-menu/typeahead.js"
import { resolveFieldControl, useField } from "../field/field.js"

export interface SelectOption {
  value: string
  /** Plain text: it is shown, announced and matched by typeahead. */
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
}

export interface SelectGroup {
  label: string
  options: readonly SelectOption[]
}

/* Paper Layers: the same white sheet as Input; focus or an open list lifts it with an offset. */
export const selectVariants = variants({
  base: [
    "kg-select flex items-center gap-2 w-full min-w-0 [font-family:inherit] leading-none text-start",
    "rounded-kg-md border-2 border-kg-ink bg-kg-surface text-kg-fg cursor-pointer",
    "[-webkit-tap-highlight-color:transparent]",
    "transition-[border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
    "focus-visible:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
    "data-[state=open]:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
    "data-invalid:border-kg-danger data-invalid:[--_lift:var(--kg-danger)]",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
  ],
  variants: {
    size: {
      sm: "h-kg-sm ps-2.5 pe-2 text-kg-sm",
      md: "h-kg-md ps-3 pe-2.5 text-kg-base",
      lg: "h-kg-lg ps-4 pe-3 text-kg-md",
    },
  },
  defaults: { size: "md" },
})

export type SelectSize = NonNullable<VariantProps<typeof selectVariants>["size"]>

const listText: Record<SelectSize, string> = {
  sm: "text-kg-sm",
  md: "text-kg-base",
  lg: "text-kg-md",
}

const iconClass =
  "kg-select__icon inline-grid place-items-center shrink-0 size-[1rem] text-kg-fg-muted [&_svg]:size-full [&_img]:size-full"

export interface SelectProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "defaultValue" | "onChange" | "children" | "type" | "name"
> {
  options: readonly (SelectOption | SelectGroup)[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  size?: SelectSize
  invalid?: boolean
  required?: boolean
  /** Submits the value with a surrounding form through a hidden input. */
  name?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  side?: "top" | "bottom"
}

const isGroup = (item: SelectOption | SelectGroup): item is SelectGroup =>
  "options" in item

const PAGE = 10

const ChevronIcon = () => (
  <svg
    className="kg-select__chevron shrink-0 size-[1rem] text-kg-fg-muted"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="m7 15 5 5 5-5M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

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

/**
 * An APG select-only combobox: focus stays on the trigger and the active option is conveyed
 * with `aria-activedescendant`, so screen readers announce it without moving focus.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue,
      onValueChange,
      placeholder = "Select…",
      size = "md",
      invalid,
      required,
      disabled,
      name,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      side = "bottom",
      id,
      className,
      onClick,
      onKeyDown,
      onKeyUp,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
      ...props
    },
    forwardedRef,
  ) => {
    const control = resolveFieldControl(useField(), {
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
    })
    const [value, setValue] = useControllableState<string | undefined>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((value: string | undefined) => void) | undefined,
    })
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const [active, setActive] = useState(-1)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const ref = useComposedRefs(triggerRef, forwardedRef)
    const { ref: listRef, present, state } = usePresence<HTMLDivElement>(open)
    const spaceHandled = useRef(false)
    const typeahead = useRef<Typeahead | null>(null)
    typeahead.current ??= createTypeahead()
    const baseId = useId()
    const listboxId = `${baseId}-listbox`
    const comboboxId = control.id ?? `${baseId}-combobox`
    const optionId = (index: number) => `${baseId}-option-${index}`

    const flat = useMemo(
      () => options.flatMap((item) => (isGroup(item) ? item.options : [item])),
      [options],
    )
    const labels = useMemo(() => flat.map((option) => option.label), [flat])
    const selectedIndex = flat.findIndex((option) => option.value === value)
    const selected = flat[selectedIndex]

    const isDisabled = (index: number) => {
      const option = flat[index]
      return !option || option.disabled === true
    }
    const firstEnabled = () => flat.findIndex((option) => !option.disabled)
    const lastEnabled = () => flat.findLastIndex((option) => !option.disabled)
    /** Moves `distance` enabled options away, stopping at the ends instead of wrapping. */
    const move = (from: number, distance: number) => {
      if (from < 0) return distance > 0 ? firstEnabled() : lastEnabled()
      const direction = Math.sign(distance)
      let index = from
      let remaining = Math.abs(distance)
      for (
        let next = from + direction;
        next >= 0 && next < flat.length;
        next += direction
      ) {
        if (isDisabled(next)) continue
        index = next
        if (--remaining === 0) break
      }
      return index
    }

    const openList = (index?: number) => {
      setActive(index ?? (selectedIndex >= 0 ? selectedIndex : firstEnabled()))
      setOpen(true)
    }
    const close = () => {
      setOpen(false)
      typeahead.current?.reset()
    }
    const commit = (index: number) => {
      const option = flat[index]
      if (option && !option.disabled) setValue(option.value)
      close()
    }

    useFloating(triggerRef, listRef, {
      open,
      side,
      align: "start",
      offset: 6,
      matchWidth: true,
    })
    useDismiss({ enabled: open, refs: [triggerRef, listRef], onDismiss: close })

    // Scrolls only the listbox; scrollIntoView could also scroll the page under a fixed layer.
    useEffect(() => {
      const list = listRef.current
      const option = list?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      if (!open || !list || !option) return
      const top = option.offsetTop
      const bottom = top + option.offsetHeight
      if (top < list.scrollTop) list.scrollTop = top
      else if (bottom > list.scrollTop + list.clientHeight)
        list.scrollTop = bottom - list.clientHeight
    }, [open, active, present])

    const search = (key: string, from: number) =>
      findTypeaheadMatch(
        labels,
        (typeahead.current as Typeahead).push(key),
        from,
        isDisabled,
      )

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented || control.disabled) return
      const { key } = event

      if (!open) {
        // Enter and Space fall through to the native click, which opens the list.
        if (key === "ArrowDown" || key === "ArrowUp") {
          event.preventDefault()
          openList()
        } else if (key === "Home" || key === "End") {
          event.preventDefault()
          openList(key === "Home" ? firstEnabled() : lastEnabled())
        } else if (isTypeaheadKey(event) && key !== " ") {
          event.preventDefault()
          const match = search(key, selectedIndex)
          openList(match >= 0 ? match : undefined)
        }
        return
      }

      const typing = (typeahead.current as Typeahead).active()
      switch (key) {
        case "ArrowDown":
          event.preventDefault()
          setActive((index) => move(index, 1))
          return
        case "ArrowUp":
          event.preventDefault()
          if (event.altKey) commit(active)
          else setActive((index) => move(index, -1))
          return
        case "Home":
          event.preventDefault()
          setActive(firstEnabled())
          return
        case "End":
          event.preventDefault()
          setActive(lastEnabled())
          return
        case "PageDown":
        case "PageUp":
          event.preventDefault()
          setActive((index) => move(index, key === "PageDown" ? PAGE : -PAGE))
          return
        case "Enter":
          event.preventDefault()
          commit(active)
          return
        case "Tab":
          // APG: Tab accepts the active option and lets focus move on.
          commit(active)
          return
        case " ":
          if (!typing) {
            event.preventDefault()
            spaceHandled.current = true
            commit(active)
            return
          }
      }

      if (isTypeaheadKey(event)) {
        event.preventDefault()
        const match = search(key, active)
        if (match >= 0) setActive(match)
      }
    }

    const handleKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      onKeyUp?.(event)
      // Space activates buttons on keyup; without this the list would reopen right away.
      if (event.key === " " && spaceHandled.current) {
        spaceHandled.current = false
        event.preventDefault()
      }
    }

    const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (event.defaultPrevented || control.disabled) return
      if (open) close()
      else openList()
    }

    let index = -1
    const renderOption = (option: SelectOption) => {
      const current = ++index
      const isSelected = current === selectedIndex
      return (
        <div
          key={option.value}
          id={optionId(current)}
          role="option"
          aria-selected={isSelected}
          aria-disabled={option.disabled || undefined}
          data-active={current === active || undefined}
          data-index={current}
          className={cx(
            "kg-select__option flex items-center gap-2.5 min-h-(--kg-control-sm) px-2.5 py-1.5 leading-[1.3]",
            "rounded-kg-sm cursor-default select-none transition-colors duration-(--kg-duration-fast) ease-kg-out",
            "data-active:bg-kg-muted aria-selected:font-semibold",
            "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
          )}
          onPointerMove={() => {
            if (!option.disabled && active !== current) setActive(current)
          }}
          onClick={() => {
            if (!option.disabled) commit(current)
          }}
        >
          {option.icon != null && (
            <span className={iconClass} aria-hidden="true">
              {option.icon}
            </span>
          )}
          <span className="kg-select__option-text grid gap-[0.15em] flex-1 min-w-0">
            <span className="kg-select__option-label truncate">{option.label}</span>
            {option.description && (
              <span className="kg-select__option-description text-kg-xs font-normal text-kg-fg-muted">
                {option.description}
              </span>
            )}
          </span>
          <span
            className="kg-select__check inline-grid place-items-center shrink-0 size-[1rem] text-kg-accent-strong [&_svg]:size-full"
            aria-hidden="true"
          >
            {isSelected && <CheckIcon />}
          </span>
        </div>
      )
    }

    return (
      <>
        <button
          ref={ref}
          type="button"
          role="combobox"
          id={comboboxId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={present ? listboxId : undefined}
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          aria-labelledby={labelledBy}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || undefined}
          aria-errormessage={control.errorMessage}
          aria-required={control.required || undefined}
          disabled={control.disabled}
          className={selectVariants({ size, className })}
          data-size={size}
          data-state={open ? "open" : "closed"}
          data-invalid={control.invalid || undefined}
          data-placeholder={selected ? undefined : ""}
          {...props}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
        >
          <span className="kg-select__value flex items-center gap-2 flex-1 min-w-0">
            {selected?.icon != null && (
              <span className={iconClass} aria-hidden="true">
                {selected.icon}
              </span>
            )}
            <span className={cx("kg-select__label truncate", !selected && "text-kg-fg-faint")}>
              {selected ? selected.label : placeholder}
            </span>
          </span>
          <ChevronIcon />
        </button>
        {name !== undefined && <input type="hidden" name={name} value={value ?? ""} />}
        {present && (
          <Layer
            ref={listRef}
            id={listboxId}
            role="listbox"
            // The combobox's own name (label, aria-label or Field) names the listbox too.
            aria-labelledby={labelledBy ?? control.labelId ?? comboboxId}
            className={cx(
              "kg-select__listbox max-h-[min(18rem,calc(100dvh-2rem))] p-1 overflow-y-auto overscroll-contain",
              "rounded-kg-lg border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-md",
              "origin-(--kg-origin,top_center) data-[side=bottom]:[--kg-enter-y:-4px] data-[side=top]:[--kg-enter-y:4px]",
              "data-[state=open]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
              "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-pop-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
              listText[size],
            )}
            data-size={size}
            data-state={state}
            // Keeps focus on the combobox while the pointer picks an option.
            onMouseDown={(event) => event.preventDefault()}
          >
            {options.map((item, position) =>
              isGroup(item) ? (
                <div
                  key={`group-${item.label}`}
                  role="group"
                  aria-labelledby={`${baseId}-group-${position}`}
                  className="kg-select__group [*+&]:mt-1 [*+&]:pt-1 [*+&]:border-t [*+&]:border-kg-border"
                >
                  <div
                    id={`${baseId}-group-${position}`}
                    className="kg-select__group-label px-2.5 pt-1.5 pb-1 text-kg-xs font-semibold tracking-[0.02em] text-kg-fg-muted"
                  >
                    {item.label}
                  </div>
                  {item.options.map(renderOption)}
                </div>
              ) : (
                renderOption(item)
              ),
            )}
          </Layer>
        )}
      </>
    )
  },
)

Select.displayName = "Select"
