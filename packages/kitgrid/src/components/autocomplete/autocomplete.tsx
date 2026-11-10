"use client"

import {
  type ChangeEvent,
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
import {
  Highlight,
  listboxClass,
  matchesQuery,
  optionClass,
  optionLabelClass,
  stepIndex,
  usePopup,
  useScrollActive,
} from "../combobox/internal.js"
import { resolveFieldControl, useField } from "../field/field.js"
import {
  inputGroupAddon,
  inputGroupControl,
  type InputGroupSize,
  inputGroupVariants,
} from "../input-group/input-group.js"

export interface AutocompleteProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "type" | "onSelect"
> {
  /** Plain-text suggestions matched against what is typed. */
  suggestions: readonly string[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Called when a suggestion is picked, as opposed to typed. */
  onSelect?: (suggestion: string) => void
  /** Shows the rest of the top suggestion as ghost text; Tab or → accepts it. */
  inlineComplete?: boolean
  maxSuggestions?: number
  size?: InputGroupSize
  invalid?: boolean
  leading?: ReactNode
}

/**
 * A free-text field with suggestions. Unlike Combobox the value is whatever is typed; a
 * suggestion only fills it in.
 */
export const Autocomplete = forwardRef<HTMLInputElement, AutocompleteProps>(
  (
    {
      suggestions,
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onSelect,
      inlineComplete = false,
      maxSuggestions = 8,
      size = "md",
      invalid,
      disabled,
      required,
      leading,
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
    const [active, setActive] = useState(-1)
    const groupRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const ref = useComposedRefs(inputRef, forwardedRef)
    const baseId = useId()
    const listId = `${baseId}-listbox`
    const optionId = (index: number) => `${baseId}-option-${index}`

    const items = useMemo(() => {
      const query = value.trim()
      if (!query) return []
      return suggestions
        .filter((item) => matchesQuery(item, query) && item !== value)
        .slice(0, maxSuggestions)
        .map((label) => ({ label }))
    }, [suggestions, value, maxSuggestions])

    const shown = open && items.length > 0
    const close = () => {
      setOpen(false)
      setActive(-1)
    }
    const { ref: listRef, present, state } = usePopup({
      open: shown,
      anchorRef: groupRef,
      onDismiss: close,
    })
    useScrollActive(listRef, active, shown)

    const lead = items[0]?.label
    const ghost =
      inlineComplete &&
      lead &&
      value &&
      lead.toLocaleLowerCase().startsWith(value.toLocaleLowerCase())
        ? lead.slice(value.length)
        : ""

    const pick = (label: string | undefined) => {
      if (label === undefined) return
      setValue(label)
      onSelect?.(label)
      close()
    }

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const input = event.currentTarget
      const atEnd = input.selectionStart === value.length
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
          if (items.length === 0) return
          event.preventDefault()
          setOpen(true)
          setActive((index) => stepIndex(items, index, event.key === "ArrowDown" ? 1 : -1))
          return
        case "Enter":
          if (shown && active >= 0) {
            event.preventDefault()
            pick(items[active]?.label)
          }
          return
        case "Escape":
          if (shown) {
            event.preventDefault()
            close()
          } else if (value) {
            event.preventDefault()
            setValue("")
          }
          return
        case "Tab":
        case "ArrowRight":
          if (ghost && atEnd && !event.shiftKey) {
            event.preventDefault()
            pick(lead)
          }
      }
    }

    return (
      <>
        <div
          ref={groupRef}
          className={inputGroupVariants({ size, className: cx("kg-autocomplete", className) })}
          style={style}
          data-size={size}
          data-state={shown ? "open" : "closed"}
          data-invalid={control.invalid || undefined}
          data-disabled={control.disabled || undefined}
        >
          {leading != null && (
            <span className={inputGroupAddon()} aria-hidden="true">
              {leading}
            </span>
          )}
          <span className="kg-autocomplete__field relative grid flex-1 self-stretch min-w-0 *:[grid-area:1/1]">
            {ghost && (
              <span className="kg-autocomplete__ghost flex items-center overflow-hidden whitespace-pre text-kg-fg-faint pointer-events-none" aria-hidden="true">
                <span className="kg-autocomplete__typed invisible">{value}</span>
                {ghost}
              </span>
            )}
            <input
              ref={ref}
              id={control.id}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-autocomplete={inlineComplete ? "both" : "list"}
              aria-expanded={shown}
              aria-controls={present ? listId : undefined}
              aria-activedescendant={shown && active >= 0 ? optionId(active) : undefined}
              aria-describedby={control.describedBy}
              aria-invalid={control.invalid || undefined}
              aria-errormessage={control.errorMessage}
              aria-required={control.required || undefined}
              disabled={control.disabled}
              className={inputGroupControl}
              value={value}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setValue(event.target.value)
                setActive(-1)
                setOpen(true)
              }}
              onBlur={(event) => {
                onBlur?.(event)
                close()
              }}
              onKeyDown={handleKeyDown}
              {...props}
            />
          </span>
        </div>
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
            {items.map((item, index) => (
              <div
                key={item.label}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                data-active={index === active || undefined}
                data-index={index}
                className={optionClass}
                onPointerMove={() => setActive(index)}
                onClick={() => pick(item.label)}
              >
                <span className={optionLabelClass}>
                  <Highlight text={item.label} query={value} />
                </span>
              </div>
            ))}
          </Layer>
        )}
      </>
    )
  },
)

Autocomplete.displayName = "Autocomplete"
