"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"

export interface TreeViewNode {
  id: string
  label: ReactNode
  /** Plain text for type-ahead when `label` is not a string. */
  textValue?: string
  icon?: ReactNode
  /** Icon shown while expanded, e.g. an open folder. */
  expandedIcon?: ReactNode
  children?: TreeViewNode[]
  /** Marks a branch whose children load on first expand via `onLoadChildren`. */
  hasChildren?: boolean
  disabled?: boolean
  /** Trailing content such as a count or badge. */
  meta?: ReactNode
}

export type TreeViewSelectionMode = "none" | "single" | "multiple"

export interface TreeViewLabels {
  loading?: string
}

export interface TreeViewProps
  extends Omit<
    HTMLAttributes<HTMLUListElement>,
    "onSelect" | "defaultValue" | "defaultChecked"
  > {
  nodes: TreeViewNode[]
  /** Accessible name. Required unless `aria-labelledby` is given. */
  label?: string
  expanded?: string[]
  defaultExpanded?: string[]
  onExpandedChange?: (ids: string[]) => void
  selectionMode?: TreeViewSelectionMode
  selected?: string[]
  defaultSelected?: string[]
  onSelectedChange?: (ids: string[]) => void
  /** Tri-state checkboxes that cascade to descendants. Replaces selection. */
  checkable?: boolean
  checked?: string[]
  defaultChecked?: string[]
  onCheckedChange?: (ids: string[]) => void
  /** Called the first time a lazy branch (`hasChildren` without `children`) is expanded. */
  onLoadChildren?: (node: TreeViewNode) => Promise<void> | void
  /** Enter or click on a leaf. */
  onAction?: (node: TreeViewNode) => void
  /** Draws indent guides. */
  guides?: boolean
  labels?: TreeViewLabels
}

interface Flat {
  node: TreeViewNode
  level: number
  parent: string | undefined
  setSize: number
  posInSet: number
}

const isBranch = (node: TreeViewNode) => Boolean(node.children?.length || node.hasChildren)

const textOf = (node: TreeViewNode) =>
  node.textValue ?? (typeof node.label === "string" ? node.label : "")

const descendants = (node: TreeViewNode): string[] =>
  (node.children ?? []).flatMap((child) => [child.id, ...descendants(child)])

type CheckState = "true" | "false" | "mixed"

const checkState = (node: TreeViewNode, checked: Set<string>): CheckState => {
  const kids = node.children ?? []
  if (kids.length === 0) return checked.has(node.id) ? "true" : "false"
  const states = kids.map((child) => checkState(child, checked))
  if (states.every((s) => s === "true")) return "true"
  if (states.every((s) => s === "false")) return "false"
  return "mixed"
}

const Chevron = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M6 4l4 4-4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * A hierarchical list following the WAI-ARIA tree pattern: arrows move and open, Home/End
 * jump, `*` expands siblings, typing finds a node, Space selects or checks.
 */
export const TreeView = forwardRef<HTMLUListElement, TreeViewProps>(
  (
    {
      nodes,
      label,
      expanded: expandedProp,
      defaultExpanded = [],
      onExpandedChange,
      selectionMode = "single",
      selected: selectedProp,
      defaultSelected = [],
      onSelectedChange,
      checkable = false,
      checked: checkedProp,
      defaultChecked = [],
      onCheckedChange,
      onLoadChildren,
      onAction,
      guides = true,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const [expanded, setExpanded] = useControllableState({
      value: expandedProp,
      defaultValue: defaultExpanded,
      onChange: onExpandedChange,
    })
    const [selected, setSelected] = useControllableState({
      value: selectedProp,
      defaultValue: defaultSelected,
      onChange: onSelectedChange,
    })
    const [checked, setChecked] = useControllableState({
      value: checkedProp,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    })
    const expandedSet = useMemo(() => new Set(expanded), [expanded])
    const selectedSet = useMemo(() => new Set(selected), [selected])
    const checkedSet = useMemo(() => new Set(checked), [checked])
    const [loading, setLoading] = useState<Set<string>>(() => new Set())
    const loaded = useRef(new Set<string>())
    const items = useRef(new Map<string, HTMLLIElement>())
    const typeahead = useRef({ text: "", time: 0 })
    const baseId = useId()
    const labelId = (id: string) => `${baseId}-${id.replace(/[^\w-]/g, "_")}`

    const visible = useMemo(() => {
      const out: Flat[] = []
      const walk = (list: TreeViewNode[], level: number, parent: string | undefined) => {
        list.forEach((node, index) => {
          out.push({ node, level, parent, setSize: list.length, posInSet: index + 1 })
          if (expandedSet.has(node.id) && node.children) walk(node.children, level + 1, node.id)
        })
      }
      walk(nodes, 1, undefined)
      return out
    }, [nodes, expandedSet])

    const enabled = visible.filter((item) => !item.node.disabled)
    const initialFocus =
      enabled.find((item) => selectedSet.has(item.node.id))?.node.id ?? enabled[0]?.node.id
    const [focused, setFocused] = useState<string | undefined>(initialFocus)
    const focusId = visible.some((item) => item.node.id === focused) ? focused : initialFocus
    const shouldFocus = useRef(false)

    useEffect(() => {
      if (!shouldFocus.current || !focusId) return
      shouldFocus.current = false
      items.current.get(focusId)?.focus()
    }, [focusId])

    const moveTo = (id: string | undefined) => {
      if (!id) return
      shouldFocus.current = true
      setFocused(id)
      if (id === focusId) items.current.get(id)?.focus()
    }

    const setOpen = (node: TreeViewNode, open: boolean) => {
      if (open === expandedSet.has(node.id)) return
      setExpanded((current) =>
        open ? [...current, node.id] : current.filter((id) => id !== node.id),
      )
      if (open && node.hasChildren && !node.children?.length && onLoadChildren && !loaded.current.has(node.id)) {
        loaded.current.add(node.id)
        const result = onLoadChildren(node)
        if (result && typeof (result as Promise<void>).then === "function") {
          setLoading((current) => new Set(current).add(node.id))
          void (result as Promise<void>).finally(() =>
            setLoading((current) => {
              const next = new Set(current)
              next.delete(node.id)
              return next
            }),
          )
        }
      }
    }

    const toggleCheck = (node: TreeViewNode) => {
      const ids = [node.id, ...descendants(node)]
      const on = checkState(node, checkedSet) !== "true"
      setChecked((current) => {
        const next = new Set(current)
        for (const id of ids) {
          if (on) next.add(id)
          else next.delete(id)
        }
        return [...next]
      })
    }

    const select = (node: TreeViewNode, additive: boolean) => {
      if (node.disabled) return
      if (checkable) return toggleCheck(node)
      if (selectionMode === "none") return
      if (selectionMode === "single") return setSelected([node.id])
      setSelected((current) =>
        current.includes(node.id)
          ? additive
            ? current
            : current.filter((id) => id !== node.id)
          : [...current, node.id],
      )
    }

    const activate = (node: TreeViewNode) => {
      if (node.disabled) return
      if (isBranch(node)) setOpen(node, !expandedSet.has(node.id))
      else {
        if (selectionMode === "single" && !checkable) setSelected([node.id])
        onAction?.(node)
      }
    }

    const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
      const index = enabled.findIndex((item) => item.node.id === focusId)
      const current = enabled[index]
      if (!current) return
      const { node } = current
      const open = expandedSet.has(node.id)
      let handled = true
      switch (event.key) {
        case "ArrowDown":
          moveTo(enabled[index + 1]?.node.id)
          if (event.shiftKey && selectionMode === "multiple" && enabled[index + 1])
            select((enabled[index + 1] as Flat).node, true)
          break
        case "ArrowUp":
          moveTo(enabled[index - 1]?.node.id)
          if (event.shiftKey && selectionMode === "multiple" && enabled[index - 1])
            select((enabled[index - 1] as Flat).node, true)
          break
        case "ArrowRight":
          if (!isBranch(node)) break
          if (!open) setOpen(node, true)
          else if (node.children?.[0]) moveTo(node.children.find((c) => !c.disabled)?.id)
          break
        case "ArrowLeft":
          if (isBranch(node) && open) setOpen(node, false)
          else moveTo(current.parent)
          break
        case "Home":
          moveTo(enabled[0]?.node.id)
          break
        case "End":
          moveTo(enabled[enabled.length - 1]?.node.id)
          break
        case "Enter":
          activate(node)
          break
        case " ":
          if (checkable || selectionMode !== "none") select(node, false)
          else activate(node)
          break
        case "*": {
          const siblings = visible
            .filter((item) => item.parent === current.parent && isBranch(item.node))
            .map((item) => item.node)
          for (const sibling of siblings) setOpen(sibling, true)
          break
        }
        default:
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = Date.now()
            const state = typeahead.current
            state.text = now - state.time > 600 ? event.key : state.text + event.key
            state.time = now
            const needle = state.text.toLowerCase()
            const ordered = [...enabled.slice(index + 1), ...enabled.slice(0, index + 1)]
            const match =
              ordered.find((item) => textOf(item.node).toLowerCase().startsWith(needle)) ??
              (needle.length > 1
                ? undefined
                : ordered.find((item) => textOf(item.node).toLowerCase().startsWith(event.key)))
            moveTo(match?.node.id)
          } else handled = false
      }
      if (handled) event.preventDefault()
    }

    const words = { loading: "Loading", ...labels }

    const renderNodes = (list: TreeViewNode[], level: number): ReactNode =>
      list.map((node, index) => {
        const branch = isBranch(node)
        const open = branch && expandedSet.has(node.id)
        const state = checkable ? checkState(node, checkedSet) : undefined
        const isSelected = !checkable && selectionMode !== "none" ? selectedSet.has(node.id) : undefined
        const busy = loading.has(node.id)
        return (
          <li
            key={node.id}
            ref={(element) => {
              if (element) items.current.set(node.id, element)
              else items.current.delete(node.id)
            }}
            role="treeitem"
            className="kg-tree-view__item outline-none"
            aria-labelledby={labelId(node.id)}
            aria-level={level}
            aria-setsize={list.length}
            aria-posinset={index + 1}
            aria-expanded={branch ? open : undefined}
            aria-selected={isSelected}
            aria-checked={state}
            aria-disabled={node.disabled || undefined}
            aria-busy={busy || undefined}
            tabIndex={node.id === focusId ? 0 : -1}
            data-state={state === "true" || isSelected ? "selected" : undefined}
            onFocus={(event) => {
              if (event.target === event.currentTarget) setFocused(node.id)
            }}
          >
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard is handled on the tree. */}
            <div
              className={cx(
                "kg-tree-view__row relative flex min-h-(--_row) items-center gap-1.5 rounded-kg-md ps-(--_pad) pe-2 transition-colors duration-(--kg-duration-fast) ease-kg-out",
                "[:focus-visible>&]:outline-2 [:focus-visible>&]:-outline-offset-2 [:focus-visible>&]:outline-kg-ring",
                node.disabled
                  ? "cursor-not-allowed text-kg-fg-faint"
                  : isSelected
                    ? "cursor-pointer bg-kg-paper-sage text-kg-fg before:absolute before:inset-y-1.5 before:start-0 before:w-[3px] before:rounded-full before:bg-kg-ink"
                    : "cursor-pointer hover:bg-kg-muted",
              )}
              style={{ "--_level": level - 1, "--_pad": `calc(${level - 1} * var(--_indent) + 0.25rem)` } as CSSProperties}
              onClick={(event) => {
                if (node.disabled) return
                moveTo(node.id)
                if (checkable) toggleCheck(node)
                else if (branch) {
                  setOpen(node, !open)
                  if (selectionMode !== "none")
                    select(node, false)
                } else {
                  select(node, false)
                  onAction?.(node)
                }
              }}
            >
              <span
                className={cx(
                  "kg-tree-view__chevron inline-grid size-4 flex-none place-items-center [&_svg]:size-3.5 [&_svg]:transition-transform [&_svg]:duration-(--kg-duration-base) [&_svg]:ease-kg-spring",
                  isSelected ? "text-kg-fg" : "text-kg-fg-muted",
                  open && "[&_svg]:rotate-90",
                )}
                data-visible={branch || undefined}
              >
                {branch && (busy ? <span className="kg-tree-view__spinner size-3 animate-spin rounded-full border-[1.5px] border-kg-border-strong border-t-transparent [animation-duration:0.7s] motion-reduce:[animation-duration:2.4s] [[data-kg-motion=reduce]_&]:[animation-duration:2.4s]" /> : <Chevron />)}
              </span>
              {checkable && (
                <span
                  className={cx(
                    "kg-tree-view__checkbox inline-grid size-4 flex-none place-items-center rounded-kg-xs border-2 border-kg-ink transition-colors duration-(--kg-duration-fast) ease-kg-out",
                    "[&_svg]:size-3 [&_svg]:fill-none [&_svg]:stroke-kg-accent-fg [&_svg]:stroke-[2.2] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round] [&_svg]:transition-[opacity,scale] [&_svg]:duration-(--kg-duration-spring) [&_svg]:ease-(--kg-ease-bounce)",
                    state === "true" || state === "mixed"
                      ? "bg-kg-accent"
                      : "bg-kg-surface [&_svg]:scale-60 [&_svg]:opacity-0",
                  )}
                  data-state={state}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 16 16">
                    {state === "mixed" ? (
                      <path d="M4.5 8h7" />
                    ) : (
                      <path d="M4 8.5l2.5 2.5 5.5-6" />
                    )}
                  </svg>
                </span>
              )}
              {(node.icon || node.expandedIcon) && (
                <span
                  className={cx(
                    "kg-tree-view__icon inline-flex flex-none [&_svg]:size-4",
                    isSelected ? "text-kg-accent-strong" : "text-kg-fg-muted",
                  )}
                  aria-hidden="true"
                >
                  {open && node.expandedIcon ? node.expandedIcon : node.icon}
                </span>
              )}
              <span id={labelId(node.id)} className="kg-tree-view__label min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {node.label}
              </span>
              {node.meta != null && <span
                  className={cx(
                    "kg-tree-view__meta flex-none text-kg-xs tabular-nums",
                    isSelected ? "text-kg-fg" : "text-kg-fg-muted",
                  )}
                >
                  {node.meta}
                </span>}
            </div>
            {open && (
              // biome-ignore lint/a11y/useSemanticElements: role="group" is required by the tree pattern.
              <ul
                role="group"
                className={cx(
                  "kg-tree-view__group relative m-0 list-none p-0 transition-[opacity,translate] duration-(--kg-duration-base) ease-kg-out starting:-translate-y-[3px] starting:opacity-0",
                  guides &&
                    "before:absolute before:inset-y-0.5 before:start-(--_guide) before:w-px before:bg-kg-ink/25",
                )}
                data-guides={guides || undefined}
                style={guides ? ({ "--_guide": `calc(${level - 1} * var(--_indent) + 0.75rem)` } as CSSProperties) : undefined}
              >
                {node.children?.length ? (
                  renderNodes(node.children, level + 1)
                ) : busy ? (
                  <li
                    role="none"
                    className="kg-tree-view__loading flex min-h-(--_row) items-center ps-(--_pad) text-kg-sm text-kg-fg-muted"
                    style={{ "--_level": level, "--_pad": `calc(${level} * var(--_indent) + 1.625rem)` } as CSSProperties}
                  >
                    {words.loading}
                  </li>
                ) : null}
              </ul>
            )}
          </li>
        )
      })

    return (
      <ul
        ref={ref}
        role="tree"
        aria-label={label}
        aria-multiselectable={selectionMode === "multiple" && !checkable ? true : undefined}
        className={cx(
          "kg-tree-view m-0 list-none p-0 text-[length:var(--_fs,var(--kg-text-base))] text-kg-fg select-none [--_indent:1.125rem] [--_row:1.875rem]",
          className,
        )}
        onKeyDown={onKeyDown}
        {...props}
      >
        {renderNodes(nodes, 1)}
      </ul>
    )
  },
)
TreeView.displayName = "TreeView"
