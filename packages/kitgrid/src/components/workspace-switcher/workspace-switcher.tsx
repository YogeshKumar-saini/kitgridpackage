"use client"

import {
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { hueFromString } from "../avatar/avatar-utils.js"
import {
  Popover,
  PopoverContent,
  type PopoverContentProps,
  PopoverTrigger,
} from "../popover/popover.js"

export interface WorkspaceSwitcherWorkspace {
  id: string
  name: string
  /** Image URL for the logo. A tinted initial is drawn when missing. */
  logo?: string
  /** A quiet line such as "Pro · 12 members". */
  meta?: ReactNode
}

export interface WorkspaceSwitcherLabels {
  search?: string
  empty?: string
  create?: string
  /** Names the trigger, receiving the current workspace name. */
  trigger?: (name: string) => string
}

export interface WorkspaceSwitcherProps
  extends Omit<PopoverContentProps, "defaultValue" | "onChange"> {
  workspaces: readonly WorkspaceSwitcherWorkspace[]
  value?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  /** Adds a "Create workspace" row at the bottom. */
  onCreate?: () => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  labels?: WorkspaceSwitcherLabels
  triggerClassName?: string
}

const optionClass = cx(
  "kg-workspace-switcher__option group/option flex cursor-pointer items-center gap-2.5 rounded-kg-sm px-2 py-1.5",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out data-active:bg-kg-paper-sage data-active:text-kg-fg",
)

const nameClass = "kg-workspace-switcher__name truncate text-kg-sm font-medium"

const words = {
  search: "Find workspace",
  empty: "No workspaces match",
  create: "Create workspace",
  trigger: (name: string) => `Switch workspace, current: ${name}`,
}

const papers = [
  "bg-kg-paper-sage",
  "bg-kg-paper-peach",
  "bg-kg-paper-sky",
  "bg-kg-paper-butter",
  "bg-kg-paper-rose",
]

/* Paper Layers: the logo tile is a slip of category paper picked from the name, in an ink edge. */
const Logo = ({ workspace }: { workspace?: WorkspaceSwitcherWorkspace }) => (
  <span
    className={cx(
      "kg-workspace-switcher__logo grid size-7 shrink-0 place-items-center overflow-hidden rounded-kg-sm border-2 border-kg-ink",
      "text-kg-xs font-bold uppercase text-kg-fg [&_img]:size-full [&_img]:object-cover",
      workspace ? papers[hueFromString(workspace.name) % papers.length] : "bg-kg-muted",
    )}
    aria-hidden="true"
  >
    {workspace?.logo ? <img src={workspace.logo} alt="" /> : (workspace?.name.trim()[0] ?? "?")}
  </span>
)

/**
 * The workspace name at the top of a sidebar. Opens a searchable list: the field is an ARIA
 * combobox, so arrows move through matches and Enter switches.
 */
export const WorkspaceSwitcher = forwardRef<HTMLDivElement, WorkspaceSwitcherProps>(
  (
    {
      workspaces,
      value: valueProp,
      defaultValue,
      onValueChange,
      onCreate,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      labels,
      triggerClassName,
      className,
      align = "start",
      ...props
    },
    ref,
  ) => {
    const t = { ...words, ...labels }
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? workspaces[0]?.id,
      onChange: (next) => {
        if (next != null) onValueChange?.(next)
      },
    })
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const [query, setQuery] = useState("")
    const [active, setActive] = useState(0)
    const listId = useId()

    const current = workspaces.find((workspace) => workspace.id === value)
    const needle = query.trim().toLowerCase()
    const matches = needle
      ? workspaces.filter((workspace) => workspace.name.toLowerCase().includes(needle))
      : workspaces
    const rows = matches.length + (onCreate ? 1 : 0)

    useEffect(() => {
      if (!open) return
      setQuery("")
      setActive(Math.max(workspaces.findIndex((workspace) => workspace.id === value), 0))
    }, [open])

    const choose = (index: number) => {
      const workspace = matches[index]
      if (workspace) {
        setValue(workspace.id)
        setOpen(false)
      } else if (onCreate && index === matches.length) {
        setOpen(false)
        onCreate()
      }
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (rows === 0) return
      const move: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }
      if (event.key in move) {
        event.preventDefault()
        setActive((index) => (index + (move[event.key] as number) + rows) % rows)
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault()
        setActive(event.key === "Home" ? 0 : rows - 1)
      } else if (event.key === "Enter") {
        event.preventDefault()
        choose(active)
      }
    }

    const optionId = (index: number) => `${listId}-${index}`

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cx(
            "kg-workspace-switcher__trigger flex h-[calc(var(--kg-control-md)+0.25rem)] w-full min-w-0 items-center gap-2.5 ps-1.5 pe-2",
            "rounded-kg-md border-2 border-transparent bg-transparent text-start [font-family:inherit] text-kg-sm font-semibold text-kg-fg cursor-pointer",
            "transition-[background-color,border-color] duration-(--kg-duration-fast) ease-kg-out",
            "interactive:hover:bg-kg-muted data-[state=open]:border-kg-ink data-[state=open]:bg-kg-muted",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            triggerClassName,
          )}
          aria-label={current ? t.trigger(current.name) : undefined}
        >
          <Logo workspace={current} />
          <span className="kg-workspace-switcher__current min-w-0 flex-1 truncate">{current?.name}</span>
          <svg
            className="kg-workspace-switcher__chevron size-4 shrink-0 text-kg-fg-muted"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path d="m5 6 3-3 3 3M5 10l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </PopoverTrigger>
        <PopoverContent
          ref={ref}
          align={align}
          aria-label={t.search}
          className={cx(
            "kg-workspace-switcher [--_popover-width:min(18rem,calc(100vw-1rem))] [--_popover-pad:calc(var(--kg-space)*1.5)]",
            className,
          )}
          {...props}
        >
          <div
            className={cx(
              "kg-workspace-switcher__search -mx-1.5 -mt-1.5 mb-1.5 flex items-center gap-2 border-b-2 border-kg-ink px-3",
              "[&_svg]:size-[0.9375rem] [&_svg]:shrink-0 [&_svg]:text-kg-fg-muted",
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" strokeLinecap="round" />
            </svg>
            <input
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={rows > 0 ? optionId(Math.min(active, rows - 1)) : undefined}
              aria-label={t.search}
              placeholder={t.search}
              className="h-kg-md min-w-0 flex-1 border-0 bg-transparent p-0 [font-family:inherit] text-kg-sm text-kg-fg outline-none placeholder:text-kg-fg-faint"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div id={listId} role="listbox" aria-label={t.search} className="kg-workspace-switcher__list grid max-h-72 gap-px overflow-y-auto">
            {matches.map((workspace, index) => (
              <div
                key={workspace.id}
                id={optionId(index)}
                role="option"
                aria-selected={workspace.id === value}
                data-active={index === active || undefined}
                className={optionClass}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <Logo workspace={workspace} />
                <span className="kg-workspace-switcher__text grid min-w-0 flex-1">
                  <span className={nameClass}>{workspace.name}</span>
                  {workspace.meta != null && (
                    <span className="kg-workspace-switcher__meta text-kg-xs text-kg-fg-muted">{workspace.meta}</span>
                  )}
                </span>
                <svg
                  className={cx(
                    "kg-workspace-switcher__check size-4 shrink-0 scale-60 text-kg-accent-strong opacity-0",
                    "transition-[opacity,scale] duration-(--kg-duration-base) ease-kg-spring motion-reduce:transition-none",
                    "group-aria-selected/option:scale-100 group-aria-selected/option:opacity-100",
                  )}
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="m3.5 8.3 2.8 2.8 6.2-6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ))}
            {matches.length === 0 && <div className="kg-workspace-switcher__empty p-4 text-center text-kg-sm text-kg-fg-muted">{t.empty}</div>}
            {onCreate && (
              <div
                id={optionId(matches.length)}
                role="option"
                aria-selected={false}
                data-active={active === matches.length || undefined}
                data-create=""
                className={cx(optionClass, "mt-1 rounded-t-none border-t-2 border-kg-ink text-kg-fg-muted")}
                onPointerMove={() => setActive(matches.length)}
                onClick={() => choose(matches.length)}
              >
                <span
                  className="kg-workspace-switcher__plus grid size-7 place-items-center rounded-kg-sm border-2 border-dashed border-kg-ink text-kg-md"
                  aria-hidden="true"
                >
                  +
                </span>
                <span className={nameClass}>{t.create}</span>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  },
)

WorkspaceSwitcher.displayName = "WorkspaceSwitcher"
