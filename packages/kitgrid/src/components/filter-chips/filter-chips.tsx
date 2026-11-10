"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type FilterChipsSize = "sm" | "md" | "lg"
export type FilterChipsSelectionMode = "multiple" | "single"

export interface FilterChipOption<V extends string = string> {
  value: V
  label: string
  /** Matching products, shown after the label. */
  count?: number
  icon?: ReactNode
  disabled?: boolean
}

export interface FilterChipsLabels {
  clearAll?: string
  /** Expander text while options are hidden. */
  more?: (hidden: number) => string
  less?: string
  /** Spoken after the label when a chip has a count. */
  count?: (count: number, formatted: string) => string
}

export interface FilterChipsProps<V extends string = string> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  /** Names the group, e.g. "Material". */
  label: string
  options: readonly FilterChipOption<V>[]
  /** `single` still allows clearing by pressing the active chip again. */
  selectionMode?: FilterChipsSelectionMode
  value?: V[]
  defaultValue?: V[]
  onValueChange?: (value: V[]) => void
  /** Collapse to this many chips behind a "+N more" toggle. Selected chips always stay visible. */
  maxVisible?: number
  /** Show "Clear all" while anything is selected. */
  clearable?: boolean
  size?: FilterChipsSize
  locale?: string
  labels?: FilterChipsLabels
}

const EMPTY: never[] = []

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path pathLength="1" d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

const rootVariants = variants({
  base: "kg-filter-chips flex flex-wrap items-center gap-2 text-(length:--_text)",
  variants: {
    size: {
      sm: "[--_height:calc(var(--kg-control-sm)-0.25rem)] [--_text:var(--kg-text-xs)] [--_pad:calc(var(--kg-space)*2.5)]",
      md: "[--_height:var(--kg-control-sm)] [--_text:var(--kg-text-sm)] [--_pad:calc(var(--kg-space)*3)]",
      lg: "[--_height:var(--kg-control-md)] [--_text:var(--kg-text-base)] [--_pad:calc(var(--kg-space)*4)]",
    },
  },
  defaults: { size: "md" },
})

const pill = [
  "inline-flex h-(--_height) cursor-pointer items-center rounded-full border-2 font-[inherit] text-(length:--_text) leading-none font-[550] whitespace-nowrap",
  "transition-[background-color,border-color,color,translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out [-webkit-tap-highlight-color:transparent]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
]

const chipClass = [
  pill,
  "group/chip border-kg-ink px-(--_pad) bg-kg-surface text-kg-fg interactive:hover:bg-kg-paper-sage interactive:active:translate-y-px",
  "data-selected:bg-kg-accent data-selected:text-kg-accent-fg data-selected:shadow-kg-xs interactive:data-selected:hover:bg-kg-accent",
  "disabled:cursor-not-allowed disabled:opacity-45",
]

const FilterChipsImpl = <V extends string = string>(
  {
    label,
    options,
    selectionMode = "multiple",
    value: valueProp,
    defaultValue = EMPTY,
    onValueChange,
    maxVisible,
    clearable = true,
    size = "md",
    locale,
    labels,
    className,
    ...props
  }: FilterChipsProps<V>,
  forwardedRef: Ref<HTMLDivElement>,
) => {
  const local = useRef<HTMLDivElement>(null)
  const ref = useComposedRefs(local, forwardedRef)
  const [value, setValue] = useControllableState<V[]>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  })
  const [expanded, setExpanded] = useState(false)

  const resolvedLocale = useLocale(locale)
  const text = useMemo(() => {
    const plural = new Intl.PluralRules(resolvedLocale)
    return {
      clearAll: "Clear all",
      more: (hidden: number) => `+${hidden} more`,
      less: "Show less",
      count: (count: number, formatted: string) =>
        `${formatted} ${plural.select(count) === "one" ? "result" : "results"}`,
      ...labels,
    }
  }, [resolvedLocale, labels])
  const numbers = useMemo(() => new Intl.NumberFormat(resolvedLocale), [resolvedLocale])

  const selected = new Set<string>(value)
  const collapsible = maxVisible !== undefined && options.length > maxVisible
  const visible =
    collapsible && !expanded
      ? options.filter(
          (option, index) => index < maxVisible || selected.has(option.value),
        )
      : options
  const hidden = options.length - visible.length

  const toggle = (option: FilterChipOption<V>) => {
    const on = selected.has(option.value)
    if (selectionMode === "single") setValue(on ? [] : [option.value])
    else
      setValue(
        on ? value.filter((item) => item !== option.value) : [...value, option.value],
      )
  }

  const clear = () => {
    setValue([])
    // The button disappears with the selection, so hand focus to the first chip instead.
    local.current
      ?.querySelector<HTMLButtonElement>(".kg-filter-chips__chip:not(:disabled)")
      ?.focus()
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={rootVariants({ size, className })}
      data-size={size}
      {...props}
    >
      {visible.map((option) => {
        const on = selected.has(option.value)
        const formatted =
          option.count === undefined ? undefined : numbers.format(option.count)
        return (
          <button
            key={option.value}
            type="button"
            className={cx("kg-filter-chips__chip", chipClass)}
            aria-pressed={on}
            aria-label={
              option.count === undefined || formatted === undefined
                ? undefined
                : `${option.label}, ${text.count(option.count, formatted)}`
            }
            data-selected={on || undefined}
            disabled={option.disabled}
            onClick={() => toggle(option)}
          >
            <span
              className="kg-filter-chips__check inline-grid grid-cols-[0fr] transition-[grid-template-columns] duration-(--kg-duration-base) ease-kg-out group-data-selected/chip:grid-cols-[1fr] [&_svg]:me-[0.35em] [&_svg]:size-[1em] [&_path]:[stroke-dasharray:1] [&_path]:[stroke-dashoffset:1] [&_path]:transition-[stroke-dashoffset] [&_path]:delay-(--kg-duration-instant) [&_path]:duration-(--kg-duration-slow) [&_path]:ease-kg-out group-data-selected/chip:[&_path]:[stroke-dashoffset:0]"
              aria-hidden="true"
            >
              <span className="inline-grid min-w-0 overflow-hidden">
                <CheckIcon />
              </span>
            </span>
            {option.icon && (
              <span
                className="kg-filter-chips__icon me-[0.4em] inline-grid [&_svg]:size-[1.1em]"
                aria-hidden="true"
              >
                {option.icon}
              </span>
            )}
            <span className="kg-filter-chips__label">{option.label}</span>
            {formatted !== undefined && (
              <span
                className="kg-filter-chips__count ms-[0.45em] text-[0.92em] font-[450] tabular-nums opacity-75"
                aria-hidden="true"
              >
                {formatted}
              </span>
            )}
          </button>
        )
      })}
      {collapsible && (hidden > 0 || expanded) && (
        <button
          type="button"
          className={cx(
            "kg-filter-chips__more",
            pill,
            "border-dashed border-kg-ink bg-transparent px-(--_pad) text-kg-fg hover:bg-kg-paper-sage",
          )}
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? text.less : text.more(hidden)}
        </button>
      )}
      {clearable && value.length > 0 && (
        <button
          type="button"
          className={cx(
            "kg-filter-chips__clear",
            pill,
            "animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)] border-transparent bg-transparent px-[calc(var(--_pad)*0.6)] text-kg-fg-muted underline underline-offset-[0.2em] hover:text-kg-fg",
          )}
          onClick={clear}
        >
          {text.clearAll}
        </button>
      )}
    </div>
  )
}

/** Toggle-button filters for collection pages, with counts, a check animation and Clear all. */
export const FilterChips = forwardRef(FilterChipsImpl) as (<V extends string = string>(
  props: FilterChipsProps<V> & { ref?: Ref<HTMLDivElement> },
) => ReactElement | null) & { displayName?: string }

FilterChips.displayName = "FilterChips"
