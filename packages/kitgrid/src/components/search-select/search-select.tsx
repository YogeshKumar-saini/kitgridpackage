"use client"

import {
  type ButtonHTMLAttributes,
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
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
  ChevronDownIcon,
  emptyClass,
  firstEnabled,
  Highlight,
  listboxClass,
  matchesQuery,
  optionCheckClass,
  optionClass,
  optionIconClass,
  optionLabelClass,
  optionTextClass,
  SearchIcon,
  stepIndex,
  triggerLabelledBy,
  usePopup,
  useScrollActive,
} from "../combobox/internal.js"
import { resolveFieldControl, useField } from "../field/field.js"
import type { InputGroupSize } from "../input-group/input-group.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/* Paper Layers: a trigger shaped like Select's, or chromeless inside another field. */
export const searchSelectVariants = variants({
  base: [
    "kg-search-select flex items-center gap-2 min-w-0 [font:inherit] leading-none text-start text-kg-fg cursor-pointer",
    "[-webkit-tap-highlight-color:transparent]",
    "transition-[background-color,border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
  ],
  variants: {
    variant: {
      field: [
        "w-full rounded-kg-md border-2 border-kg-ink bg-kg-surface",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
        "focus-visible:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
        "data-[state=open]:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
        "data-invalid:border-kg-danger data-invalid:[--_lift:var(--kg-danger)]",
      ],
      // A host field can set --_bare-h to fit the trigger inside its own padding.
      bare: [
        "w-auto h-(--_bare-h,100%) px-1.5 rounded-kg-sm border-0 bg-transparent",
        "interactive:hover:bg-kg-muted data-[state=open]:bg-kg-muted",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
      ],
    },
    size: {
      sm: "text-kg-sm",
      md: "text-kg-base",
      lg: "text-kg-md",
    },
  },
  defaults: { variant: "field", size: "md" },
  compound: [
    { variant: "field", size: "sm", class: "h-kg-sm ps-2.5 pe-2" },
    { variant: "field", size: "md", class: "h-kg-md ps-3 pe-2.5" },
    { variant: "field", size: "lg", class: "h-kg-lg ps-4 pe-3" },
  ],
})

export type SearchSelectVariant = NonNullable<
  VariantProps<typeof searchSelectVariants>["variant"]
>

export const searchSelectValue =
  "kg-search-select__value flex items-center gap-2 flex-1 min-w-0 truncate [[data-placeholder]>&]:text-kg-fg-faint"

export const searchSelectChevron = cx(
  "kg-search-select__chevron inline-grid shrink-0 text-kg-fg-muted",
  "[&_svg]:size-4 [&_svg]:transition-[rotate] [&_svg]:duration-(--kg-duration-base) [&_svg]:ease-kg-out",
  "[[data-state=open]>&_svg]:rotate-180",
)

export interface SearchSelectOption extends ComboboxOption {
  /** Extra words that match the search but are not shown, e.g. a country code. */
  keywords?: readonly string[]
  /** Trailing detail, e.g. a dial code or a count. */
  aside?: string
}

export interface SearchSelectProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "defaultValue" | "onChange" | "children" | "type" | "name"
> {
  options: readonly SearchSelectOption[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  /** Accessible name of the search box. */
  searchLabel?: string
  emptyMessage?: ReactNode
  /** Custom trigger content for the selected option. */
  renderValue?: (option: SearchSelectOption) => ReactNode
  size?: InputGroupSize
  /** `bare` drops the field chrome so the trigger can sit inside another control. */
  variant?: SearchSelectVariant
  invalid?: boolean
  name?: string
}

const filterOptions = (options: readonly SearchSelectOption[], query: string) =>
  query.trim()
    ? options.filter(
        (option) =>
          matchesQuery(option.label, query) ||
          option.keywords?.some((word) => matchesQuery(word, query)) ||
          (option.aside !== undefined && matchesQuery(option.aside, query)),
      )
    : options

/** A select for long lists: the popup opens with a search box that filters as you type. */
export const SearchSelect = forwardRef<HTMLButtonElement, SearchSelectProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue = null,
      onValueChange,
      placeholder = "Select",
      searchPlaceholder = "Search",
      searchLabel = "Search",
      emptyMessage = "No results",
      renderValue,
      size = "md",
      variant = "field",
      invalid,
      disabled,
      name,
      id,
      className,
      onClick,
      onKeyDown,
      "aria-describedby": describedBy,
      "aria-labelledby": ariaLabelledBy,
      "aria-errormessage": errorMessage,
      ...props
    },
    forwardedRef,
  ) => {
    const control = resolveFieldControl(useField(), {
      id,
      disabled,
      invalid,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
    })
    const [value, setValue] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((value: string | null) => void) | undefined,
    })
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [active, setActive] = useState(-1)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const ref = useComposedRefs(triggerRef, forwardedRef)
    const baseId = useId()
    const listId = `${baseId}-listbox`
    const triggerId = control.id ?? `${baseId}-trigger`
    const optionId = (index: number) => `${baseId}-option-${index}`

    const items = useMemo(() => filterOptions(options, query), [options, query])
    const selected = options.find((option) => option.value === value)

    const close = (refocus = true) => {
      setOpen(false)
      setQuery("")
      if (refocus) triggerRef.current?.focus()
    }
    const {
      ref: layerRef,
      present,
      state,
    } = usePopup({
      open,
      anchorRef: triggerRef,
      onDismiss: () => close(),
    })
    const listRef = useRef<HTMLDivElement>(null)
    useScrollActive(listRef, active, open)

    useEffect(() => {
      if (open) searchRef.current?.focus()
    }, [open])

    const openList = () => {
      const index = options.findIndex((option) => option.value === value)
      setActive(index >= 0 ? index : firstEnabled(options))
      setOpen(true)
    }
    const commit = (option: SearchSelectOption | undefined) => {
      if (!option || option.disabled) return
      setValue(option.value)
      close()
    }

    const handleSearchKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
          event.preventDefault()
          setActive((index) =>
            stepIndex(items, index, event.key === "ArrowDown" ? 1 : -1),
          )
          return
        case "Enter":
          event.preventDefault()
          commit(items[active])
          return
        case "Tab":
          event.preventDefault()
          close()
      }
    }

    return (
      <>
        <button
          ref={ref}
          type="button"
          id={triggerId}
          aria-labelledby={triggerLabelledBy({
            labelledBy: ariaLabelledBy,
            labelId: control.labelId,
            ariaLabel: props["aria-label"],
            selfId: triggerId,
            valueId: `${baseId}-value`,
            hasValue: selected !== undefined,
          })}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={present ? listId : undefined}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || undefined}
          aria-errormessage={control.errorMessage}
          disabled={control.disabled}
          className={searchSelectVariants({ variant, size, className })}
          data-size={size}
          data-variant={variant}
          data-state={open ? "open" : "closed"}
          data-invalid={control.invalid || undefined}
          data-placeholder={selected ? undefined : ""}
          {...props}
          onClick={(event) => {
            onClick?.(event)
            if (event.defaultPrevented) return
            if (open) close()
            else openList()
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (event.defaultPrevented || open) return
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
              openList()
            }
          }}
        >
          <span id={`${baseId}-value`} className={searchSelectValue}>
            {selected
              ? renderValue
                ? renderValue(selected)
                : selected.label
              : placeholder}
          </span>
          <span className={searchSelectChevron} aria-hidden="true">
            <ChevronDownIcon />
          </span>
        </button>
        {name !== undefined && <input type="hidden" name={name} value={value ?? ""} />}
        {present && (
          <Layer
            ref={layerRef}
            className={cx(
              listboxClass(size, "panel"),
              "kg-search-select__popup min-w-60",
            )}
            data-state={state}
            data-size={size}
          >
            <div className="kg-search-select__search flex items-center gap-2 px-3 border-b-2 border-kg-ink text-kg-fg-muted [&_svg]:shrink-0 [&_svg]:size-4">
              <SearchIcon />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                autoComplete="off"
                aria-label={searchLabel}
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                placeholder={searchPlaceholder}
                className="kg-search-select__input flex-1 min-w-0 h-kg-md p-0 [font:inherit] text-kg-fg bg-transparent border-0 outline-none caret-kg-accent-strong placeholder:text-kg-fg-faint placeholder:opacity-100"
                value={query}
                onChange={(event) => {
                  const next = event.target.value
                  setQuery(next)
                  setActive(firstEnabled(filterOptions(options, next)))
                }}
                onKeyDown={handleSearchKey}
              />
            </div>
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={control.labelId}
              aria-label={control.labelId ? undefined : props["aria-label"]}
              className="kg-search-select__list p-1 overflow-y-auto overscroll-contain"
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
                        <Highlight text={option.label} query={query} />
                      </span>
                    </span>
                    {option.aside && (
                      <span className="kg-search-select__aside shrink-0 text-kg-xs tabular-nums text-kg-fg-muted">
                        {option.aside}
                      </span>
                    )}
                    <span className={optionCheckClass} aria-hidden="true">
                      {option.value === value && <CheckIcon />}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Layer>
        )}
      </>
    )
  },
)

SearchSelect.displayName = "SearchSelect"
