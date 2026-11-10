"use client"

import { forwardRef, type KeyboardEvent, useEffect, useRef } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { useShortcut } from "../command-palette/shortcut.js"
import { useField } from "../field/field.js"
import { Input, type InputProps } from "../input/input.js"
import { Kbd } from "../kbd/kbd.js"

export interface SearchFieldProps extends Omit<
  InputProps,
  "type" | "value" | "defaultValue" | "onClear" | "leading"
> {
  value?: string
  defaultValue?: string
  /** Every keystroke. */
  onValueChange?: (value: string) => void
  /** The settled query: after `debounce` ms of quiet, or at once when cleared. */
  onSearch?: (value: string) => void
  /** Delay before `onSearch`, in ms. */
  debounce?: number
  /** Focuses the field from anywhere and shows the keys as a hint, e.g. `["/"]`. */
  shortcut?: readonly string[]
  /** Accessible name when no `Field` label is present. */
  label?: string
}

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onSearch,
      debounce = 0,
      shortcut,
      label = "Search",
      placeholder = "Search",
      clearLabel = "Clear search",
      className,
      onKeyDown,
      onChange,
      ...props
    },
    forwardedRef,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const local = useRef<HTMLInputElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const search = useEventCallback(onSearch)
    const settled = useRef(value)
    const field = useField()

    useEffect(() => {
      if (settled.current === value) return
      const flush = () => {
        settled.current = value
        search(value)
      }
      if (debounce <= 0 || value === "") {
        flush()
        return
      }
      const timer = setTimeout(flush, debounce)
      return () => clearTimeout(timer)
    }, [value, debounce, search])

    useShortcut(shortcut ?? [], () => local.current?.focus(), {
      enabled: Boolean(shortcut?.length),
    })

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      // Escape empties a filled field first; only an empty one lets Escape close its dialog.
      if (event.defaultPrevented || event.key !== "Escape" || value === "") return
      event.preventDefault()
      event.stopPropagation()
      setValue("")
    }

    return (
      <Input
        ref={ref}
        type="search"
        aria-label={field || props["aria-labelledby"] ? undefined : label}
        className={cx(
          "kg-search-field [&_.kg-input__control::-webkit-search-decoration]:appearance-none",
          className,
        )}
        leading={<SearchIcon />}
        trailing={
          shortcut?.length && value === "" ? (
            <Kbd keys={[...shortcut]} size="sm" className={cx(
                "kg-search-field__kbd transition-[opacity,scale] duration-(--kg-duration-fast) ease-kg-out",
                "[.kg-search-field:focus-within_&]:opacity-0 [.kg-search-field:focus-within_&]:scale-90",
              )} />
          ) : undefined
        }
        placeholder={placeholder}
        clearLabel={clearLabel}
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange?.(event)
          setValue(event.currentTarget.value)
        }}
        onClear={() => {}}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  },
)

SearchField.displayName = "SearchField"
