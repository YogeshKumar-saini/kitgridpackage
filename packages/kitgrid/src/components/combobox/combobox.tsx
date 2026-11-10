"use client"

import {
  type ChangeEvent,
  type FocusEvent,
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { resolveFieldControl, useField } from "../field/field.js"
import {
  type InputGroupSize,
  inputGroupAddon,
  inputGroupButton,
  inputGroupControl,
  inputGroupVariants,
} from "../input-group/input-group.js"
import {
  CheckIcon,
  ChevronDownIcon,
  emptyClass,
  firstEnabled,
  listboxClass,
  optionCheckClass,
  optionClass,
  optionDescriptionClass,
  optionIconClass,
  optionLabelClass,
  optionTextClass,
  Highlight,
  matchesQuery,
  stepIndex,
  usePopup,
  useScrollActive,
  XIcon,
} from "./internal.js"
import { Layer } from "../../primitives/layer.js"

export interface ComboboxOption {
  value: string
  /** Plain text: shown, announced and matched against the query. */
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
}

export interface ComboboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "type" | "name"
> {
  options: readonly ComboboxOption[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  /** Called as the user types. */
  onInputChange?: (query: string) => void
  filter?: (option: ComboboxOption, query: string) => boolean
  size?: InputGroupSize
  invalid?: boolean
  /** Shows a clear button while a value is set. */
  clearable?: boolean
  clearLabel?: string
  emptyMessage?: ReactNode
  /** Decorative icon before the text. */
  leading?: ReactNode
  /** Submits the value through a hidden input. */
  name?: string
  onOpenChange?: (open: boolean) => void
}

const defaultFilter = (option: ComboboxOption, query: string) =>
  matchesQuery(option.label, query)

/**
 * An APG editable combobox with list autocomplete. Focus stays in the input; the active option
 * is conveyed with `aria-activedescendant`. The value is always one of the options.
 */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue = null,
      onValueChange,
      onInputChange,
      filter = defaultFilter,
      size = "md",
      invalid,
      disabled,
      required,
      clearable,
      clearLabel = "Clear",
      emptyMessage = "No results",
      leading,
      name,
      onOpenChange,
      placeholder,
      id,
      className,
      style,
      onKeyDown,
      onBlur,
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
    const [value, setValue] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [open, setOpenState] = useState(false)
    const [query, setQuery] = useState<string | null>(null)
    const [active, setActive] = useState(-1)
    const groupRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const ref = useComposedRefs(inputRef, forwardedRef)
    const baseId = useId()
    const inputId = control.id ?? `${baseId}-input`
    const listId = `${baseId}-listbox`
    const optionId = (index: number) => `${baseId}-option-${index}`

    const selected = options.find((option) => option.value === value)
    const typing = query !== null
    const items = useMemo(
      () =>
        typing && query.trim()
          ? options.filter((option) => filter(option, query))
          : options,
      [options, filter, query, typing],
    )

    const setOpen = (next: boolean) => {
      if (next === open) return
      setOpenState(next)
      onOpenChange?.(next)
    }
    const close = () => {
      setOpen(false)
      setQuery(null)
      setActive(-1)
    }
    const {
      ref: listRef,
      present,
      state,
    } = usePopup({
      open,
      anchorRef: groupRef,
      onDismiss: close,
    })
    useScrollActive(listRef, active, open)

    const openAt = (index: number) => {
      setActive(index)
      setOpen(true)
    }
    const commit = (option: ComboboxOption | undefined) => {
      if (option && !option.disabled) setValue(option.value)
      close()
    }

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value
      setQuery(next)
      onInputChange?.(next)
      const filtered = next.trim()
        ? options.filter((option) => filter(option, next))
        : options
      openAt(next.trim() ? firstEnabled(filtered) : -1)
    }

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented || control.disabled) return
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp": {
          event.preventDefault()
          const delta = event.key === "ArrowDown" ? 1 : -1
          if (!open) {
            const current = items.findIndex((option) => option.value === value)
            openAt(
              event.altKey ? -1 : current >= 0 ? current : stepIndex(items, -1, delta),
            )
          } else if (event.altKey && event.key === "ArrowUp") {
            commit(items[active])
          } else setActive((index) => stepIndex(items, index, delta))
          return
        }
        case "Enter":
          if (open) {
            event.preventDefault()
            if (active >= 0) commit(items[active])
            else close()
          }
          return
        case "Escape":
          if (open) {
            event.preventDefault()
            close()
          } else if (clearable && value !== null) {
            event.preventDefault()
            setValue(null)
          }
          return
      }
    }

    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      onBlur?.(event)
      // Typing an option's exact label and leaving the field picks it, as people expect.
      if (typing) {
        const exact = options.find(
          (option) =>
            !option.disabled &&
            option.label.toLocaleLowerCase() === query.trim().toLocaleLowerCase(),
        )
        if (exact) setValue(exact.value)
        else if (!query.trim() && clearable) setValue(null)
      }
      close()
    }

    return (
      <>
        <div
          ref={groupRef}
          className={inputGroupVariants({
            size,
            end: "tight",
            className: cx("kg-combobox", className),
          })}
          style={style}
          data-size={size}
          data-state={open ? "open" : "closed"}
          data-invalid={control.invalid || undefined}
          data-disabled={control.disabled || undefined}
          onPointerDown={(event) => {
            if (event.target === groupRef.current) event.preventDefault()
            inputRef.current?.focus()
          }}
        >
          {(leading ?? selected?.icon) != null && (
            <span className={inputGroupAddon()} aria-hidden="true">
              {leading ?? selected?.icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={present ? listId : undefined}
            aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
            aria-describedby={control.describedBy}
            aria-invalid={control.invalid || undefined}
            aria-errormessage={control.errorMessage}
            aria-required={control.required || undefined}
            disabled={control.disabled}
            placeholder={placeholder}
            className={inputGroupControl}
            value={typing ? query : (selected?.label ?? "")}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={() => {
              if (!open) openAt(items.findIndex((option) => option.value === value))
            }}
            {...props}
          />
          {clearable && value !== null && !control.disabled && (
            <button
              type="button"
              tabIndex={-1}
              className={inputGroupButton}
              aria-label={clearLabel}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setValue(null)
                inputRef.current?.focus()
              }}
            >
              <XIcon />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={cx(
              inputGroupButton,
              "kg-combobox__toggle [&_svg]:transition-[rotate] [&_svg]:duration-(--kg-duration-base) [&_svg]:ease-kg-out",
              "[[data-state=open]>&_svg]:rotate-180",
            )}
            disabled={control.disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              inputRef.current?.focus()
              if (open) close()
              else openAt(items.findIndex((option) => option.value === value))
            }}
          >
            <ChevronDownIcon />
          </button>
        </div>
        {name !== undefined && <input type="hidden" name={name} value={value ?? ""} />}
        {present && (
          <Layer
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={control.labelId}
            aria-label={control.labelId ? undefined : props["aria-label"]}
            className={listboxClass(size)}
            data-state={state}
            data-size={size}
            onMouseDown={(event) => event.preventDefault()}
          >
            {items.length === 0 ? (
              <div className={emptyClass} role="presentation">
                {emptyMessage}
              </div>
            ) : (
              items.map((option, index) => (
                <div
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  data-active={index === active || undefined}
                  data-index={index}
                  className={optionClass}
                  onPointerMove={() => {
                    if (!option.disabled && active !== index) setActive(index)
                  }}
                  onClick={() => commit(option)}
                >
                  {option.icon != null && (
                    <span className={optionIconClass} aria-hidden="true">
                      {option.icon}
                    </span>
                  )}
                  <span className={optionTextClass}>
                    <span className={optionLabelClass}>
                      <Highlight text={option.label} query={query ?? ""} />
                    </span>
                    {option.description && (
                      <span className={optionDescriptionClass}>
                        {option.description}
                      </span>
                    )}
                  </span>
                  <span className={optionCheckClass} aria-hidden="true">
                    {option.value === value && <CheckIcon />}
                  </span>
                </div>
              ))
            )}
          </Layer>
        )}
        <span className="kg-visually-hidden" aria-live="polite">
          {open && typing
            ? `${items.length} ${items.length === 1 ? "result" : "results"}`
            : ""}
        </span>
      </>
    )
  },
)

Combobox.displayName = "Combobox"
