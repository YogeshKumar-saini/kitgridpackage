"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../dropdown-menu/dropdown-menu.js"
import { Tag } from "../tag/tag.js"

export interface FilterBarFilter {
  id: string
  /** The dimension, e.g. "Region". */
  label: string
  /** What it is filtered to, e.g. "North, West". */
  value: string
  /** Set on this view alone rather than inherited from the page; drawn in the accent. */
  local?: boolean
}

export interface FilterBarScope {
  value: string
  label: string
}

export interface FilterBarLabels {
  /** Names the bar for assistive tech. */
  bar?: string
  filters?: string
  reset?: string
  remove?: (filter: FilterBarFilter) => string
}

export interface FilterBarProps extends HTMLAttributes<HTMLDivElement> {
  filters: readonly FilterBarFilter[]
  onRemove?: (id: string) => void
  /** Offered while a filter is applied or the scope differs from `defaultScope`. */
  onReset?: () => void
  /** Choices for the scope menu, such as stores, teams or date ranges. */
  scopes?: readonly FilterBarScope[]
  scope?: string
  defaultScope?: string
  onScopeChange?: (scope: string) => void
  /** The menu's heading and the word before the current scope, e.g. "Store". */
  scopeLabel?: string
  labels?: FilterBarLabels
  /** Extra controls at the end of the bar, such as a date picker. */
  children?: ReactNode
}

const Chevron = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m4 6 4 4 4-4" />
  </svg>
)

const scopeClass = [
  "kg-filter-bar__scope inline-flex h-kg-sm max-w-[18rem] cursor-pointer items-center gap-1.5 ps-3 pe-2.5",
  "rounded-full border-2 border-kg-ink bg-kg-surface font-[inherit] text-kg-fg",
  "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "hover:-translate-px hover:shadow-kg-xs active:translate-0 active:shadow-none aria-expanded:shadow-kg-xs",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  "[&_svg]:size-[0.875rem] [&_svg]:shrink-0 [&_svg]:text-kg-fg-muted [&_svg]:transition-[rotate] [&_svg]:duration-(--kg-duration-base) [&_svg]:ease-kg-out",
  "aria-expanded:[&_svg]:rotate-180",
].join(" ")

const resetClass = [
  "kg-filter-bar__reset h-kg-sm cursor-pointer rounded-kg-md border-0 bg-transparent px-2.5 font-[inherit] font-[560] text-kg-fg-muted",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted hover:text-kg-fg",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

/**
 * The filters a view is drawn under: a scope menu, one removable chip per applied filter and
 * a reset. Chips are a labelled list, each remove button names the filter it clears.
 */
export const FilterBar = forwardRef<HTMLDivElement, FilterBarProps>(
  (
    {
      filters,
      onRemove,
      onReset,
      scopes,
      scope: scopeProp,
      defaultScope,
      onScopeChange,
      scopeLabel = "Scope",
      labels,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const initial = defaultScope ?? scopes?.[0]?.value ?? ""
    const [scope, setScope] = useControllableState({
      value: scopeProp,
      defaultValue: initial,
      onChange: onScopeChange,
    })
    const current = scopes?.find((option) => option.value === scope)
    const dirty = filters.length > 0 || (scopes !== undefined && scope !== initial)

    return (
      <div
        ref={ref}
        role="group"
        aria-label={labels?.bar ?? "Filters"}
        className={cx("kg-filter-bar flex min-w-0 flex-wrap items-center gap-2 text-kg-sm", className)}
        {...props}
      >
        {scopes && scopes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className={scopeClass}>
              <span className="kg-filter-bar__scope-label text-kg-fg-muted">{scopeLabel}</span>
              <span className="kg-filter-bar__scope-value min-w-0 truncate font-[580]">
                {current?.label ?? scope}
              </span>
              <Chevron />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup value={scope} onValueChange={setScope}>
                <DropdownMenuLabel>{scopeLabel}</DropdownMenuLabel>
                {scopes.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    closeOnSelect
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {filters.length > 0 && (
          <ul
            className="kg-filter-bar__chips m-0 flex list-none flex-wrap gap-1.5 p-0"
            aria-label={labels?.filters ?? "Active filters"}>
            {filters.map((filter) => (
              <li key={filter.id}>
                <Tag
                  size="sm"
                  tone={filter.local ? "accent" : "neutral"}
                  onRemove={onRemove ? () => onRemove(filter.id) : undefined}
                  removeLabel={
                    labels?.remove?.(filter) ?? `Remove ${filter.label}: ${filter.value}`
                  }
                >
                  <span
                    className={cx(
                      "kg-filter-bar__chip-label inline-block",
                      filter.local ? undefined : "text-kg-fg-muted",
                    )}
                  >
                    {filter.label}
                  </span>
                  <span className="kg-filter-bar__chip-value ms-[0.3em] inline-block max-w-[12rem] truncate align-bottom font-[580]">
                    {filter.value}
                  </span>
                </Tag>
              </li>
            ))}
          </ul>
        )}
        {onReset && dirty && (
          <button type="button" className={resetClass} onClick={onReset}>
            {labels?.reset ?? "Reset"}
          </button>
        )}
        {children != null && <div className="kg-filter-bar__extra ms-auto flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    )
  },
)

FilterBar.displayName = "FilterBar"
