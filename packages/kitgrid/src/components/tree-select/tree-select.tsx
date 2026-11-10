"use client"

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
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
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  listboxClass,
  optionCheckClass,
  optionIconClass,
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

/* The treeitem takes focus; its row shows the tint, the ring and the selection. */
const rowClass = cx(
  "kg-tree-select__row relative flex items-center gap-1.5 min-h-(--kg-control-sm) py-1 ps-(--_ps) pe-2.5",
  "leading-[1.3] rounded-kg-sm cursor-default select-none transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "[:not([aria-disabled=true])>&]:hover:bg-kg-muted [:focus>&]:bg-kg-muted",
  "[:focus-visible>&]:outline-2 [:focus-visible>&]:-outline-offset-2 [:focus-visible>&]:outline-kg-ring",
  "[[aria-selected=true]>&]:font-semibold",
  "[[aria-disabled=true]>&]:opacity-50 [[aria-disabled=true]>&]:cursor-not-allowed",
)

/* A hairline guide shows each level's parent. */
const groupClass = cx(
  "kg-tree-select__group relative",
  "before:absolute before:top-0 before:bottom-2 before:start-3.5 before:w-px before:bg-kg-border before:content-['']",
  "[[role=group]_&]:before:start-8",
)

const twistClass = cx(
  "kg-tree-select__twist inline-grid place-items-center shrink-0 size-5 rounded-kg-xs text-kg-fg-faint hover:text-kg-fg",
  "[&_svg]:size-[0.85rem] [&_svg]:transition-[rotate] [&_svg]:duration-(--kg-duration-base) [&_svg]:ease-kg-out",
  "[&[data-open]_svg]:rotate-90",
)

export interface TreeSelectNode {
  value: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  children?: readonly TreeSelectNode[]
}

export interface TreeSelectProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "defaultValue" | "onChange" | "children" | "type" | "name"
> {
  nodes: readonly TreeSelectNode[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string) => void
  /** Lets branches be chosen too, not only leaves. */
  selectBranches?: boolean
  placeholder?: string
  /** Separator for the path shown in the field. */
  separator?: string
  size?: SearchSelectProps["size"]
  invalid?: boolean
  name?: string
}

interface Flat {
  node: TreeSelectNode
  level: number
  parent: string | null
  path: string[]
}

const flatten = (
  nodes: readonly TreeSelectNode[],
  level = 1,
  parent: string | null = null,
  path: string[] = [],
): Flat[] =>
  nodes.flatMap((node) => [
    { node, level, parent, path: [...path, node.label] },
    ...flatten(node.children ?? [], level + 1, node.value, [...path, node.label]),
  ])

/**
 * A select whose options are a tree, following the APG tree view pattern: arrows walk and
 * fold branches, Enter picks, Escape closes.
 */
export const TreeSelect = forwardRef<HTMLButtonElement, TreeSelectProps>(
  (
    {
      nodes,
      value: valueProp,
      defaultValue = null,
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
    const [value, setValue] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((value: string | null) => void) | undefined,
    })
    const all = useMemo(() => flatten(nodes), [nodes])
    const byValue = useMemo(() => new Map(all.map((item) => [item.node.value, item])), [all])
    const ancestors = (key: string | null) => {
      const out: string[] = []
      let current = key ? byValue.get(key)?.parent : null
      while (current) {
        out.push(current)
        current = byValue.get(current)?.parent ?? null
      }
      return out
    }

    const [open, setOpen] = useState(false)
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ancestors(value)))
    const [focused, setFocused] = useState<string | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const ref = useComposedRefs(triggerRef, forwardedRef)
    const treeRef = useRef<HTMLDivElement>(null)
    const treeId = useId()
    const triggerId = control.id ?? `${treeId}-trigger`

    const visible = all.filter((item) => ancestors(item.node.value).every((a) => expanded.has(a)))
    const selected = value ? byValue.get(value) : undefined

    const close = (refocus = true) => {
      setOpen(false)
      if (refocus) triggerRef.current?.focus()
    }
    const { ref: layerRef, present, state } = usePopup({
      open,
      anchorRef: triggerRef,
      onDismiss: () => close(),
    })

    useEffect(() => {
      if (!open || !focused) return
      const items = treeRef.current?.querySelectorAll<HTMLElement>("[data-value]") ?? []
      for (const item of items) if (item.dataset.value === focused) item.focus()
    }, [open, focused])

    const openTree = () => {
      setExpanded((prev) => new Set([...prev, ...ancestors(value)]))
      setFocused(value ?? all.find((item) => !item.node.disabled)?.node.value ?? null)
      setOpen(true)
    }

    const toggleBranch = (key: string, force?: boolean) =>
      setExpanded((prev) => {
        const next = new Set(prev)
        if (force ?? !next.has(key)) next.add(key)
        else next.delete(key)
        return next
      })

    const choose = (item: Flat) => {
      if (item.node.disabled) return
      const branch = Boolean(item.node.children?.length)
      if (branch && !selectBranches) return toggleBranch(item.node.value)
      setValue(item.node.value)
      close()
    }

    const handleTreeKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const index = visible.findIndex((item) => item.node.value === focused)
      const item = visible[index]
      if (!item) return
      const branch = Boolean(item.node.children?.length)
      const isOpen = expanded.has(item.node.value)
      const focusAt = (at: number) => {
        const target = visible[Math.max(0, Math.min(visible.length - 1, at))]
        if (target) setFocused(target.node.value)
      }
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          return focusAt(index + 1)
        case "ArrowUp":
          event.preventDefault()
          return focusAt(index - 1)
        case "Home":
          event.preventDefault()
          return focusAt(0)
        case "End":
          event.preventDefault()
          return focusAt(visible.length - 1)
        case "ArrowRight":
          event.preventDefault()
          if (branch && !isOpen) toggleBranch(item.node.value, true)
          else if (branch) focusAt(index + 1)
          return
        case "ArrowLeft":
          event.preventDefault()
          if (branch && isOpen) toggleBranch(item.node.value, false)
          else if (item.parent) setFocused(item.parent)
          return
        case "Enter":
        case " ":
          event.preventDefault()
          return choose(item)
        case "Tab":
          event.preventDefault()
          return close()
      }
    }

    const renderLevel = (items: readonly TreeSelectNode[]): ReactNode =>
      items.map((node) => {
        const item = byValue.get(node.value) as Flat
        const branch = Boolean(node.children?.length)
        const isOpen = expanded.has(node.value)
        // Named by its own label only, not by the nested group it contains.
        const labelId = `${treeId}-label-${all.indexOf(item)}`
        return (
          <div
            key={node.value}
            role="treeitem"
            aria-labelledby={labelId}
            aria-level={item.level}
            aria-expanded={branch ? isOpen : undefined}
            aria-selected={node.value === value}
            aria-disabled={node.disabled || undefined}
            tabIndex={node.value === focused ? 0 : -1}
            data-value={node.value}
            className="kg-tree-select__item outline-none"
            onFocus={(event) => {
              if (event.target === event.currentTarget) setFocused(node.value)
            }}
            onClick={(event) => {
              event.stopPropagation()
              setFocused(node.value)
              choose(item)
            }}
          >
            <span
              className={rowClass}
              style={{ "--_ps": `calc(var(--kg-space) * ${1 + (item.level - 1) * 4.5})` } as CSSProperties}
            >
              <span
                className={twistClass}
                data-open={isOpen || undefined}
                aria-hidden="true"
                onClick={(event) => {
                  if (!branch) return
                  event.stopPropagation()
                  setFocused(node.value)
                  toggleBranch(node.value)
                }}
              >
                {branch && <ChevronRightIcon />}
              </span>
              {node.icon != null && (
                <span className={optionIconClass} aria-hidden="true">
                  {node.icon}
                </span>
              )}
              <span id={labelId} className="kg-tree-select__label flex-1 min-w-0 truncate">
                {node.label}
              </span>
              {branch && (
                <span className="kg-tree-select__count text-kg-xs font-normal tabular-nums text-kg-fg-muted" aria-hidden="true">
                  {node.children?.length}
                </span>
              )}
              <span className={optionCheckClass} aria-hidden="true">
                {node.value === value && <CheckIcon />}
              </span>
            </span>
            {branch && isOpen && (
              <div role="group" className={groupClass}>
                {renderLevel(node.children ?? [])}
              </div>
            )}
          </div>
        )
      })

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
            valueId: `${treeId}-value`,
            hasValue: selected !== undefined,
          })}
          aria-haspopup="tree"
          aria-expanded={open}
          aria-controls={present ? treeId : undefined}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || undefined}
          disabled={control.disabled}
          className={searchSelectVariants({ variant: "field", size, className: cx("kg-tree-select", className) })}
          data-size={size}
          data-variant="field"
          data-state={open ? "open" : "closed"}
          data-invalid={control.invalid || undefined}
          data-placeholder={selected ? undefined : ""}
          {...props}
          onClick={(event) => {
            onClick?.(event)
            if (event.defaultPrevented) return
            if (open) close(false)
            else openTree()
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault()
              openTree()
            }
          }}
        >
          <span id={`${treeId}-value`} className={searchSelectValue}>
            {selected ? (
              <>
                {selected.path.length > 1 && (
                  <span className="kg-tree-select__path text-kg-fg-muted">
                    {selected.path.slice(0, -1).join(separator)}
                    {separator}
                  </span>
                )}
                {selected.node.label}
              </>
            ) : (
              placeholder
            )}
          </span>
          <span className={searchSelectChevron} aria-hidden="true">
            <ChevronDownIcon />
          </span>
        </button>
        {name !== undefined && <input type="hidden" name={name} value={value ?? ""} />}
        {present && (
          <Layer
            ref={layerRef}
            className={cx(listboxClass(size), "kg-tree-select__popup min-w-64")}
            data-state={state}
            data-size={size}
          >
            <div
              ref={treeRef}
              id={treeId}
              role="tree"
              aria-labelledby={control.labelId}
              aria-label={control.labelId ? undefined : props["aria-label"]}
              onKeyDown={handleTreeKey}
            >
              {renderLevel(nodes)}
            </div>
          </Layer>
        )}
      </>
    )
  },
)

TreeSelect.displayName = "TreeSelect"
