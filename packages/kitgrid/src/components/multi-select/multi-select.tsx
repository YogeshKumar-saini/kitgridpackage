"use client"

import {
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
import { Layer } from "../../primitives/layer.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import type { ComboboxOption } from "../combobox/combobox.js"
import {
  CheckIcon,
  emptyClass,
  firstEnabled,
  Highlight,
  listboxClass,
  matchesQuery,
  optionClass,
  optionDescriptionClass,
  optionIconClass,
  optionLabelClass,
  optionTextClass,
  stepIndex,
  usePopup,
  useScrollActive,
} from "../combobox/internal.js"
import { resolveFieldControl, useField } from "../field/field.js"
import {
  type InputGroupSize,
  inputGroupControl,
  inputGroupVariants,
} from "../input-group/input-group.js"
import { Chip, useChipKeys } from "../tag-input/chips.js"

export type MultiSelectOption = ComboboxOption

const moreClass = cx(
  "kg-multi-select__more inline-grid place-items-center min-w-7 h-6 px-1.5 rounded-full",
  "text-kg-xs font-semibold tabular-nums text-kg-fg-muted border-2 border-dashed border-kg-border-strong",
)

/* Paper Layers: an ink box with a mint check once selected, like Checkbox. */
const boxClass = cx(
  "kg-multi-select__box inline-grid place-items-center shrink-0 size-4 rounded-kg-xs",
  "border-2 border-kg-ink bg-kg-surface text-kg-accent-fg transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "[[aria-selected=true]>&]:bg-kg-accent",
  "[&_svg]:size-3 [&_svg]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)] [&_svg]:[--kg-enter-y:0px]",
)

export interface MultiSelectProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "type" | "name"
> {
  options: readonly MultiSelectOption[]
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  max?: number
  /** Chips beyond this collapse into a "+n" count. */
  maxChips?: number
  size?: InputGroupSize
  invalid?: boolean
  emptyMessage?: ReactNode
  removeLabel?: (label: string) => string
  /** Submits the values comma-separated through a hidden input. */
  name?: string
}

/**
 * A filterable multi-select: chips in the field, a multi-selectable listbox below. Enter
 * toggles the active option and keeps the list open for the next pick.
 */
export const MultiSelect = forwardRef<HTMLInputElement, MultiSelectProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue = [],
      onValueChange,
      max,
      maxChips,
      size = "md",
      invalid,
      disabled,
      required,
      emptyMessage = "No results",
      removeLabel = (label) => `Remove ${label}`,
      name,
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
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [active, setActive] = useState(-1)
    const [pending, setPending] = useState(false)
    const groupRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const ref = useComposedRefs(inputRef, forwardedRef)
    const baseId = useId()
    const listId = `${baseId}-listbox`
    const optionId = (index: number) => `${baseId}-option-${index}`

    const items = useMemo(
      () =>
        query.trim() ? options.filter((option) => matchesQuery(option.label, query)) : options,
      [options, query],
    )
    const chosen = value
      .map((v) => options.find((option) => option.value === v))
      .filter((option): option is MultiSelectOption => option !== undefined)
    const full = max !== undefined && value.length >= max
    const visible = maxChips !== undefined ? chosen.slice(0, maxChips) : chosen
    const hidden = chosen.length - visible.length

    const close = () => {
      setOpen(false)
      setActive(-1)
      setQuery("")
    }
    const { ref: listRef, present, state } = usePopup({
      open,
      anchorRef: groupRef,
      onDismiss: close,
    })
    useScrollActive(listRef, active, open)

    const removeAt = (index: number) => setValue(value.filter((_, at) => at !== index))
    const { focusChip, onChipKeyDown } = useChipKeys(
      groupRef,
      inputRef,
      visible.length,
      (index) => {
        const option = visible[index]
        if (option) setValue(value.filter((v) => v !== option.value))
      },
    )

    const toggle = (option: MultiSelectOption | undefined) => {
      if (!option || option.disabled) return
      if (value.includes(option.value)) setValue(value.filter((v) => v !== option.value))
      else if (!full) setValue([...value, option.value])
      setQuery("")
    }

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented || control.disabled) return
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
          event.preventDefault()
          if (!open) setOpen(true)
          setActive((index) => stepIndex(items, index, event.key === "ArrowDown" ? 1 : -1))
          return
        case "Enter":
          if (open && active >= 0) {
            event.preventDefault()
            toggle(items[active])
          }
          return
        case "Escape":
          if (open) {
            event.preventDefault()
            close()
          }
          return
        case "Backspace":
          if (query === "" && value.length > 0) {
            event.preventDefault()
            if (pending) {
              removeAt(value.length - 1)
              setPending(false)
            } else setPending(true)
          }
          return
        case "ArrowLeft":
          if (query === "" && visible.length > 0) {
            event.preventDefault()
            setPending(false)
            focusChip(visible.length - 1)
          }
          return
      }
      setPending(false)
    }

    return (
      <>
        <div
          ref={groupRef}
          className={inputGroupVariants({
            size,
            multiline: true,
            // Data variants outrank the group's own gap and cursor.
            className: cx("kg-multi-select data-multiline:gap-1 data-multiline:cursor-pointer", className),
          })}
          style={style}
          data-size={size}
          data-multiline=""
          data-state={open ? "open" : "closed"}
          data-invalid={control.invalid || undefined}
          data-disabled={control.disabled || undefined}
          onPointerDown={(event) => {
            if (event.target !== groupRef.current) return
            event.preventDefault()
            inputRef.current?.focus()
            setOpen(true)
          }}
        >
          {visible.map((option, index) => (
            <Chip
              key={option.value}
              index={index}
              label={option.label}
              removeLabel={removeLabel(option.label)}
              pending={pending && index === visible.length - 1 && hidden === 0}
              disabled={control.disabled}
              onRemove={() => {
                setValue(value.filter((v) => v !== option.value))
                inputRef.current?.focus()
              }}
              onKeyDown={onChipKeyDown}
            />
          ))}
          {hidden > 0 && (
            <span className={moreClass}>+{hidden}</span>
          )}
          <input
            ref={ref}
            id={control.id}
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
            placeholder={value.length === 0 ? placeholder : undefined}
            className={inputGroupControl}
            value={query}
            onChange={(event) => {
              const next = event.target.value
              setQuery(next)
              setPending(false)
              setOpen(true)
              setActive(
                next.trim()
                  ? firstEnabled(options.filter((option) => matchesQuery(option.label, next)))
                  : -1,
              )
            }}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            onBlur={(event) => {
              onBlur?.(event)
              setPending(false)
            }}
            {...props}
          />
        </div>
        {name !== undefined && <input type="hidden" name={name} value={value.join(",")} />}
        {present && (
          <Layer
            ref={listRef}
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={control.labelId}
            aria-label={control.labelId ? undefined : props["aria-label"]}
            className={cx(listboxClass(size), "kg-multi-select__listbox")}
            data-state={state}
            data-size={size}
            onMouseDown={(event) => event.preventDefault()}
          >
            {items.length === 0 ? (
              <div className={emptyClass} role="presentation">
                {emptyMessage}
              </div>
            ) : (
              items.map((option, index) => {
                const isSelected = value.includes(option.value)
                const blocked = option.disabled || (full && !isSelected)
                return (
                  <div
                    key={option.value}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={blocked || undefined}
                    data-active={index === active || undefined}
                    data-index={index}
                    // The box shows selection, so the label keeps its weight.
                    className={cx(optionClass, "[[aria-multiselectable]>&]:aria-selected:font-normal")}
                    onPointerMove={() => {
                      if (!option.disabled && active !== index) setActive(index)
                    }}
                    onClick={() => {
                      if (!blocked) toggle(option)
                    }}
                  >
                    <span className={boxClass} aria-hidden="true">
                      {isSelected && <CheckIcon />}
                    </span>
                    {option.icon != null && (
                      <span className={optionIconClass} aria-hidden="true">
                        {option.icon}
                      </span>
                    )}
                    <span className={optionTextClass}>
                      <span className={optionLabelClass}>
                        <Highlight text={option.label} query={query} />
                      </span>
                      {option.description && (
                        <span className={optionDescriptionClass}>
                          {option.description}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })
            )}
          </Layer>
        )}
      </>
    )
  },
)

MultiSelect.displayName = "MultiSelect"
