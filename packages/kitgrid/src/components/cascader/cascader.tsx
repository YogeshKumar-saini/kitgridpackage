"use client"

import {
  type ButtonHTMLAttributes,
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { Layer } from "../../primitives/layer.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  listboxClass,
  optionClass,
  optionLabelClass,
  triggerLabelledBy,
  usePopup,
} from "../combobox/internal.js"
import { resolveFieldControl, useField } from "../field/field.js"
import {
  type SearchSelectProps,
  searchSelectChevron,
  searchSelectValue,
  searchSelectVariants,
} from "../search-select/search-select.js"

const columnClass = cx(
  "kg-cascader__column w-44 max-h-64 p-1 overflow-y-auto overscroll-contain",
  "not-first:border-s-2 not-first:border-kg-ink",
  "origin-left animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)] [--kg-enter-y:0px]",
)

/* The open path stays tinted; the focused row gets the ring, not the tint. */
const cascaderOptionClass = cx(
  optionClass,
  "kg-cascader__option outline-none interactive:hover:bg-kg-muted data-trail:bg-kg-muted",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
)

const endClass = cx(
  "kg-cascader__end inline-grid shrink-0 ms-auto text-kg-fg-faint [&_svg]:size-3.5",
  "[[data-trail]>&]:text-kg-fg [[aria-selected=true]>&]:text-kg-fg",
)

export interface CascaderOption {
  value: string
  label: string
  disabled?: boolean
  children?: readonly CascaderOption[]
}

export interface CascaderProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "defaultValue" | "onChange" | "children" | "type" | "name"
> {
  options: readonly CascaderOption[]
  /** The chosen path, root first. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (path: string[]) => void
  /** Lets a branch be chosen without going down to a leaf. */
  selectBranches?: boolean
  placeholder?: string
  separator?: string
  size?: SearchSelectProps["size"]
  invalid?: boolean
  /** Submits the path joined with `/` through a hidden input. */
  name?: string
}

const walk = (options: readonly CascaderOption[], path: readonly string[]) => {
  const columns: (readonly CascaderOption[])[] = [options]
  const chosen: CascaderOption[] = []
  let level = options
  for (const key of path) {
    const match = level.find((option) => option.value === key)
    if (!match) break
    chosen.push(match)
    if (!match.children?.length) break
    level = match.children
    columns.push(level)
  }
  return { columns, chosen }
}

/**
 * Picks a path through nested options one column at a time, like region, city and district.
 * Right or Enter opens a branch, Left steps back, Enter on a leaf picks the whole path.
 */
export const Cascader = forwardRef<HTMLButtonElement, CascaderProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue = [],
      onValueChange,
      selectBranches = false,
      placeholder = "Select",
      separator = " / ",
      size = "md",
      invalid,
      disabled,
      name,
      id,
      className,
      onClick,
      onKeyDown,
      "aria-describedby": describedBy,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    forwardedRef,
  ) => {
    const control = resolveFieldControl(useField(), {
      id,
      disabled,
      invalid,
      "aria-describedby": describedBy,
    })
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [open, setOpen] = useState(false)
    const [trail, setTrail] = useState<string[]>([])
    const [focus, setFocus] = useState<{ column: number; value: string } | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const ref = useComposedRefs(triggerRef, forwardedRef)
    const panelRef = useRef<HTMLDivElement>(null)
    const baseId = useId()
    const triggerId = control.id ?? `${baseId}-trigger`

    const { columns } = walk(options, trail)
    const { chosen } = walk(options, value)

    const close = (refocus = true) => {
      setOpen(false)
      if (refocus) triggerRef.current?.focus()
    }
    const { ref: layerRef, present, state } = usePopup({
      open,
      anchorRef: triggerRef,
      onDismiss: () => close(),
      matchWidth: false,
    })

    useEffect(() => {
      if (!open || !focus) return
      const column = panelRef.current?.querySelector(`[data-column="${focus.column}"]`)
      for (const item of column?.querySelectorAll<HTMLElement>("[data-value]") ?? [])
        if (item.dataset.value === focus.value) item.focus()
    }, [open, focus])

    const openPanel = () => {
      const first = options.find((option) => !option.disabled)
      setTrail(value)
      const lastIndex = Math.max(0, value.length - 1)
      const lastValue = value[lastIndex] ?? first?.value
      setFocus(lastValue ? { column: value.length ? lastIndex : 0, value: lastValue } : null)
      setOpen(true)
    }

    const enter = (column: number, option: CascaderOption, pick: boolean) => {
      if (option.disabled) return
      const nextTrail = [...trail.slice(0, column), option.value]
      setTrail(nextTrail)
      const branch = Boolean(option.children?.length)
      if (branch && !(pick && selectBranches)) {
        const child = option.children?.find((c) => !c.disabled)
        if (child) setFocus({ column: column + 1, value: child.value })
        return
      }
      setValue(nextTrail)
      close()
    }

    const handleKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!focus) return
      const list = columns[focus.column] ?? []
      const index = list.findIndex((option) => option.value === focus.value)
      const option = list[index]
      const move = (delta: number) => {
        for (let i = index + delta; i >= 0 && i < list.length; i += delta) {
          const target = list[i]
          if (target && !target.disabled) {
            setFocus({ column: focus.column, value: target.value })
            setTrail((prev) => [...prev.slice(0, focus.column), target.value])
            return
          }
        }
      }
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          return move(1)
        case "ArrowUp":
          event.preventDefault()
          return move(-1)
        case "ArrowRight":
          event.preventDefault()
          if (option?.children?.length) enter(focus.column, option, false)
          return
        case "ArrowLeft": {
          event.preventDefault()
          if (focus.column === 0) return
          const parent = trail[focus.column - 1]
          if (parent) {
            setFocus({ column: focus.column - 1, value: parent })
            setTrail((prev) => prev.slice(0, focus.column))
          }
          return
        }
        case "Enter":
        case " ":
          event.preventDefault()
          if (option) enter(focus.column, option, true)
          return
        case "Tab":
          event.preventDefault()
          close()
      }
    }

    const shown = chosen.map((option) => option.label).join(separator)

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
            hasValue: chosen.length > 0,
          })}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={present ? `${baseId}-panel` : undefined}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || undefined}
          disabled={control.disabled}
          className={searchSelectVariants({ variant: "field", size, className: cx("kg-cascader", className) })}
          data-size={size}
          data-variant="field"
          data-state={open ? "open" : "closed"}
          data-invalid={control.invalid || undefined}
          data-placeholder={shown ? undefined : ""}
          {...props}
          onClick={(event) => {
            onClick?.(event)
            if (event.defaultPrevented) return
            if (open) close(false)
            else openPanel()
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault()
              openPanel()
            }
          }}
        >
          <span id={`${baseId}-value`} className={searchSelectValue}>{shown || placeholder}</span>
          <span className={searchSelectChevron} aria-hidden="true">
            <ChevronDownIcon />
          </span>
        </button>
        {name !== undefined && <input type="hidden" name={name} value={value.join("/")} />}
        {present && (
          <Layer
            ref={layerRef}
            id={`${baseId}-panel`}
            role="dialog"
            aria-labelledby={control.labelId}
            aria-label={control.labelId ? undefined : props["aria-label"]}
            className={cx(listboxClass(size), "kg-cascader__popup max-w-[calc(100vw-1rem)] overflow-x-auto")}
            data-state={state}
          >
            <div ref={panelRef} className="kg-cascader__columns flex" onKeyDown={handleKey}>
              {columns.map((list, column) => (
                <div
                  key={trail.slice(0, column).join("/") || "root"}
                  role="listbox"
                  aria-label={column === 0 ? (props["aria-label"] ?? "Options") : chosenLabel(columns, trail, column)}
                  data-column={column}
                  className={columnClass}
                >
                  {list.map((option) => {
                    const inTrail = trail[column] === option.value
                    const picked = value[column] === option.value && value.length === column + 1
                    const branch = Boolean(option.children?.length)
                    return (
                      <div
                        key={option.value}
                        role="option"
                        tabIndex={focus?.column === column && focus.value === option.value ? 0 : -1}
                        aria-selected={value[column] === option.value}
                        aria-disabled={option.disabled || undefined}
                        aria-haspopup={branch ? "listbox" : undefined}
                        aria-expanded={branch ? inTrail : undefined}
                        data-value={option.value}
                        data-trail={inTrail || undefined}
                        className={cascaderOptionClass}
                        onFocus={() => setFocus({ column, value: option.value })}
                        onClick={() => enter(column, option, true)}
                      >
                        <span className={optionLabelClass}>{option.label}</span>
                        <span className={endClass} aria-hidden="true">
                          {branch ? <ChevronRightIcon /> : picked ? <CheckIcon /> : null}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </Layer>
        )}
      </>
    )
  },
)

const chosenLabel = (
  columns: (readonly CascaderOption[])[],
  trail: readonly string[],
  column: number,
) => columns[column - 1]?.find((option) => option.value === trail[column - 1])?.label

Cascader.displayName = "Cascader"
