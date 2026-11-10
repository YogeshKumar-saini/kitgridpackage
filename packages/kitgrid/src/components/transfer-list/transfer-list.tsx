"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  useId,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  emptyClass,
  matchesQuery,
  optionClass,
  optionDescriptionClass,
  optionLabelClass,
  optionTextClass,
  SearchIcon,
  stepIndex,
} from "../combobox/internal.js"

export interface TransferListOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface TransferListLabels {
  source: string
  target: string
  moveRight: string
  moveLeft: string
  search: string
  empty: string
}

export interface TransferListProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  options: readonly TransferListOption[]
  /** Values in the target list, in order. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  searchable?: boolean
  labels?: Partial<TransferListLabels>
  disabled?: boolean
}

const defaultLabels: TransferListLabels = {
  source: "Available",
  target: "Selected",
  moveRight: "Move to selected",
  moveLeft: "Move to available",
  search: "Filter",
  empty: "Nothing here",
}

const box = cx(
  "kg-transfer-list__box inline-grid place-items-center shrink-0 size-4 rounded-kg-xs",
  "border-2 border-kg-ink bg-kg-surface text-transparent [&_svg]:size-[0.7rem]",
  "transition-[background-color,border-color,color] duration-(--kg-duration-fast) ease-kg-out",
  "[[aria-selected=true]>&]:border-kg-accent [[aria-selected=true]>&]:bg-kg-accent [[aria-selected=true]>&]:text-kg-accent-fg",
  "peer-checked:border-kg-accent peer-checked:bg-kg-accent peer-checked:text-kg-accent-fg",
  "peer-indeterminate:border-kg-accent peer-indeterminate:bg-kg-accent peer-indeterminate:[&_svg]:hidden",
  "peer-indeterminate:after:h-[2px] peer-indeterminate:after:w-2 peer-indeterminate:after:rounded-full peer-indeterminate:after:bg-kg-accent-fg",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-kg-ring",
)

const move = cx(
  "kg-transfer-list__move relative inline-grid place-items-center size-9 p-0 rounded-full cursor-pointer",
  "border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-[3px_3px_0_var(--kg-ink)]",
  "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:-translate-px interactive:hover:shadow-[5px_5px_0_var(--kg-ink)]",
  "interactive:active:translate-x-[3px] interactive:active:translate-y-[3px] interactive:active:shadow-none",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  "[&_svg]:size-4 max-[36rem]:[&_svg]:rotate-90",
)

const badge = cx(
  "kg-transfer-list__badge absolute -top-1.5 -right-1.5 grid place-items-center min-w-[1.1rem] h-[1.1rem] px-1",
  "rounded-full bg-kg-accent text-kg-accent-fg text-[0.65rem] font-bold tabular-nums",
  "animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
)

interface PaneProps {
  id: string
  title: string
  items: readonly TransferListOption[]
  checked: ReadonlySet<string>
  onToggle: (value: string) => void
  onToggleAll: (values: string[], on: boolean) => void
  onMove: () => void
  searchable: boolean
  searchLabel: string
  emptyLabel: string
  disabled: boolean
}

const Pane = ({
  id,
  title,
  items,
  checked,
  onToggle,
  onToggleAll,
  onMove,
  searchable,
  searchLabel,
  emptyLabel,
  disabled,
}: PaneProps) => {
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(-1)
  const shown = query.trim() ? items.filter((item) => matchesQuery(item.label, query)) : items
  const enabled = shown.filter((item) => !item.disabled)
  const picked = enabled.filter((item) => checked.has(item.value)).length
  const all = enabled.length > 0 && picked === enabled.length
  const titleId = `${id}-title`
  const optionId = (index: number) => `${id}-option-${index}`

  const handleKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault()
        setActive((index) => stepIndex(shown, index, event.key === "ArrowDown" ? 1 : -1))
        return
      case "Home":
        event.preventDefault()
        setActive(stepIndex(shown, -1, 1))
        return
      case "End":
        event.preventDefault()
        setActive(stepIndex(shown, -1, -1))
        return
      case " ": {
        event.preventDefault()
        const item = shown[active]
        if (item && !item.disabled) onToggle(item.value)
        return
      }
      case "Enter":
        event.preventDefault()
        onMove()
        return
      case "a":
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault()
          onToggleAll(
            enabled.map((item) => item.value),
            !all,
          )
        }
    }
  }

  return (
    <section
      className={cx(
        "kg-transfer-list__pane grid grid-rows-[auto_auto_minmax(0,1fr)] min-w-0 h-(--kg-transfer-list-height,15rem)",
        "overflow-hidden rounded-kg-lg border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-sm",
      )}
      aria-labelledby={titleId}
    >
      <header className="kg-transfer-list__header flex items-center gap-2.5 px-3 py-2.5 border-b-2 border-kg-ink bg-kg-surface-sunken">
        <label className="kg-transfer-list__all relative inline-grid">
          <input
            type="checkbox"
            className="kg-transfer-list__all-input peer absolute -inset-1 m-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            checked={all}
            disabled={disabled || enabled.length === 0}
            ref={(node) => {
              if (node) node.indeterminate = picked > 0 && !all
            }}
            onChange={() =>
              onToggleAll(
                enabled.map((item) => item.value),
                !all,
              )
            }
            aria-label={`${title}: select all`}
          />
          <span className={box} aria-hidden="true">
            <CheckIcon />
          </span>
        </label>
        <h3 id={titleId} className="kg-transfer-list__title flex-1 m-0 text-kg-sm font-semibold">
          {title}
        </h3>
        <span className="kg-transfer-list__count text-kg-xs tabular-nums text-kg-fg-muted">
          {picked > 0 ? `${picked}/${items.length}` : items.length}
        </span>
      </header>
      {searchable && (
        <div
          className={cx(
            "kg-transfer-list__search flex items-center gap-2 px-3 border-b-2 border-kg-ink text-kg-fg-faint",
            "[&_svg]:size-3.5 [&_svg]:shrink-0",
            "focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-kg-ring",
          )}
        >
          <SearchIcon />
          <input
            type="search"
            className={cx(
              "kg-transfer-list__search-input flex-1 min-w-0 h-kg-sm p-0 border-0 bg-transparent outline-none",
              "font-[inherit] text-kg-sm text-kg-fg placeholder:text-kg-fg-faint",
              "[&::-webkit-search-cancel-button]:appearance-none",
            )}
            aria-label={`${searchLabel} ${title}`}
            placeholder={searchLabel}
            value={query}
            disabled={disabled}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(-1)
            }}
          />
        </div>
      )}
      <div
        role="listbox"
        aria-multiselectable="true"
        aria-labelledby={titleId}
        aria-activedescendant={active >= 0 && shown[active] ? optionId(active) : undefined}
        tabIndex={disabled ? -1 : 0}
        className={cx(
          "kg-transfer-list__list p-1 overflow-y-auto overscroll-contain text-kg-sm outline-none",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
        )}
        onKeyDown={handleKey}
        onFocus={() => {
          if (active < 0) setActive(stepIndex(shown, -1, 1))
        }}
      >
        {shown.length === 0 ? (
          <div className={emptyClass} role="presentation">
            {emptyLabel}
          </div>
        ) : (
          shown.map((item, index) => {
            const on = checked.has(item.value)
            return (
              <div
                key={item.value}
                id={optionId(index)}
                role="option"
                aria-selected={on}
                aria-disabled={item.disabled || undefined}
                data-active={index === active || undefined}
                className={cx(
                  optionClass,
                  "kg-transfer-list__option not-aria-disabled:cursor-pointer hover:bg-kg-muted",
                  "animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
                )}
                onClick={() => {
                  setActive(index)
                  if (!item.disabled && !disabled) onToggle(item.value)
                }}
                onDoubleClick={() => {
                  if (!item.disabled && !disabled) {
                    if (!on) onToggle(item.value)
                    onMove()
                  }
                }}
              >
                <span className={box} aria-hidden="true">
                  <CheckIcon />
                </span>
                <span className={optionTextClass}>
                  <span className={optionLabelClass}>{item.label}</span>
                  {item.description && (
                    <span className={optionDescriptionClass}>{item.description}</span>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

/**
 * Two multi-select lists with move buttons between them. Space checks, Enter moves the
 * checked items across, Ctrl or Cmd+A checks everything visible. Double-click moves one item.
 */
export const TransferList = forwardRef<HTMLDivElement, TransferListProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue = [],
      onValueChange,
      searchable = false,
      labels: labelsProp,
      disabled = false,
      className,
      ...props
    },
    ref,
  ) => {
    const labels = { ...defaultLabels, ...labelsProp }
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [checked, setChecked] = useState<Set<string>>(() => new Set())
    const baseId = useId()

    const target = value
      .map((v) => options.find((option) => option.value === v))
      .filter((option): option is TransferListOption => option !== undefined)
    const source = options.filter((option) => !value.includes(option.value))

    const toggle = (key: string) =>
      setChecked((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
    const toggleAll = (keys: string[], on: boolean) =>
      setChecked((prev) => {
        const next = new Set(prev)
        for (const key of keys) {
          if (on) next.add(key)
          else next.delete(key)
        }
        return next
      })

    const movingRight = source.filter((option) => checked.has(option.value))
    const movingLeft = target.filter((option) => checked.has(option.value))

    const moveRight = () => {
      if (!movingRight.length) return
      setValue([...value, ...movingRight.map((option) => option.value)])
      toggleAll(movingRight.map((option) => option.value), false)
    }
    const moveLeft = () => {
      if (!movingLeft.length) return
      const leaving = new Set(movingLeft.map((option) => option.value))
      setValue(value.filter((v) => !leaving.has(v)))
      toggleAll([...leaving], false)
    }

    return (
      <div
        ref={ref}
        className={cx(
          "kg-transfer-list grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3 w-full",
          "max-[36rem]:grid-cols-1 data-disabled:opacity-50",
          className,
        )}
        data-disabled={disabled || undefined}
        {...props}
      >
        <Pane
          id={`${baseId}-source`}
          title={labels.source}
          items={source}
          checked={checked}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onMove={moveRight}
          searchable={searchable}
          searchLabel={labels.search}
          emptyLabel={labels.empty}
          disabled={disabled}
        />
        <div className="kg-transfer-list__actions flex flex-col justify-center gap-2 max-[36rem]:flex-row">
          <button
            type="button"
            className={move}
            aria-label={labels.moveRight}
            disabled={disabled || movingRight.length === 0}
            onClick={moveRight}
          >
            <ChevronRightIcon />
            {movingRight.length > 0 && (
              <span className={badge} aria-hidden="true">
                {movingRight.length}
              </span>
            )}
          </button>
          <button
            type="button"
            className={move}
            aria-label={labels.moveLeft}
            disabled={disabled || movingLeft.length === 0}
            onClick={moveLeft}
          >
            <ChevronLeftIcon />
            {movingLeft.length > 0 && (
              <span className={badge} aria-hidden="true">
                {movingLeft.length}
              </span>
            )}
          </button>
        </div>
        <Pane
          id={`${baseId}-target`}
          title={labels.target}
          items={target}
          checked={checked}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onMove={moveLeft}
          searchable={searchable}
          searchLabel={labels.search}
          emptyLabel={labels.empty}
          disabled={disabled}
        />
      </div>
    )
  },
)

TransferList.displayName = "TransferList"
