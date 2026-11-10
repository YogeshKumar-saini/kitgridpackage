"use client"

import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useId,
  version,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useRovingFocus } from "../../hooks/use-roving-focus.js"
import { Slot } from "../../primitives/slot.js"
import { cx } from "../../utils/cx.js"
import { useAppShell } from "../app-shell/app-shell.js"
import { Tooltip } from "../tooltip/tooltip.js"

interface NavContextValue {
  collapsed: boolean
  expand: () => void
}

// React 18 only renders `inert` as a string attribute; React 19 expects a boolean.
const inertProps = (
  Number.parseInt(version, 10) >= 19 ? { inert: true } : { inert: "" }
) as { inert?: boolean }

const NavContext = createContext<NavContextValue>({
  collapsed: false,
  expand: () => {},
})

/** False inside a closed group, so its links drop out of arrow-key navigation. */
const VisibleContext = createContext(true)

/** True inside a group's sublist, where items sit tighter. */
const NestedContext = createContext(false)

/*
 * Paper Layers: items are quiet text on the sidebar sheet; the current page is an ink fill with
 * a mint label, so it reads by weight and surface, never by colour alone.
 */
const itemClass = ({
  current,
  hot,
  collapsed,
  nested,
}: {
  current: boolean
  hot: boolean
  collapsed: boolean
  nested: boolean
}) =>
  cx(
    "kg-sidebar-nav__item relative flex items-center gap-2.5 w-full py-1.5",
    "[font-family:inherit] [font-size:inherit] [line-height:inherit] text-start no-underline",
    "border-0 rounded-kg-md cursor-pointer [-webkit-tap-highlight-color:transparent]",
    "transition-[color,background-color,scale] duration-(--kg-duration-fast) ease-kg-out interactive:active:scale-[0.985]",
    "focus-visible:outline-2 focus-visible:-outline-offset-2",
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    collapsed ? "justify-center px-0" : "px-2.5",
    nested ? "min-h-[2rem]" : "min-h-[2.25rem]",
    current
      ? "font-semibold text-kg-accent-fg bg-kg-accent focus-visible:outline-kg-accent-fg"
      : cx(
          nested ? "font-[450]" : "font-medium",
          hot ? "text-kg-fg" : "text-kg-fg-muted",
          "bg-transparent focus-visible:outline-kg-ring",
          "interactive:hover:text-kg-fg interactive:hover:bg-kg-muted",
        ),
  )

const list = "kg-sidebar-nav__list grid gap-[2px] m-0 p-0 list-none"

export interface SidebarNavProps extends HTMLAttributes<HTMLElement> {
  /** Accessible name of the navigation landmark. */
  label?: string
  /** Shows icons only, with labels in tooltips. Defaults to the surrounding AppShell's rail. */
  collapsed?: boolean
}

export const SidebarNav = forwardRef<HTMLElement, SidebarNavProps>(
  (
    {
      label = "Main",
      collapsed: collapsedProp,
      className,
      onKeyDown,
      children,
      ...props
    },
    ref,
  ) => {
    const shell = useAppShell()
    const collapsed = collapsedProp ?? shell?.collapsed ?? false
    const roving = useRovingFocus({ orientation: "vertical", loop: false })

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      onKeyDown?.(event)
      if (!event.defaultPrevented) roving(event)
    }

    return (
      <NavContext.Provider
        value={{ collapsed, expand: () => shell?.setCollapsed(false) }}
      >
        <nav
          ref={ref}
          aria-label={label}
          className={cx("kg-sidebar-nav flex flex-col gap-4 min-w-0 text-kg-base", className)}
          data-collapsed={collapsed || undefined}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {children}
        </nav>
      </NavContext.Provider>
    )
  },
)

SidebarNav.displayName = "SidebarNav"

export interface SidebarNavSectionProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  /** Heading above the items. Folded to a hairline in the collapsed rail. */
  title?: ReactNode
}

export const SidebarNavSection = forwardRef<HTMLDivElement, SidebarNavSectionProps>(
  ({ title, className, children, ...props }, ref) => {
    const id = useId()
    const { collapsed } = useContext(NavContext)
    return (
      <div ref={ref} className={cx("kg-sidebar-nav__section grid gap-1", className)} {...props}>
        {title != null && (
          <div
            id={id}
            className={cx(
              "kg-sidebar-nav__title flex items-center text-kg-xs font-semibold tracking-[0.04em] text-kg-fg-faint whitespace-nowrap",
              collapsed
                ? "min-h-2 px-2 after:flex-1 after:h-px after:bg-kg-border"
                : "min-h-[1.5rem] px-2.5",
            )}
          >
            <span className={cx("kg-sidebar-nav__title-text", collapsed && "sr-only")}>{title}</span>
          </div>
        )}
        <ul
          className={list}
          aria-labelledby={title != null ? id : undefined}
        >
          {children}
        </ul>
      </div>
    )
  },
)

SidebarNavSection.displayName = "SidebarNavSection"

export interface SidebarNavItemProps extends HTMLAttributes<HTMLElement> {
  icon?: ReactNode
  /** A count or short tag after the label, such as unread items. */
  badge?: ReactNode
  /** Marks the current page with `aria-current="page"`. */
  active?: boolean
  href?: string
  disabled?: boolean
  /** Render the single child (e.g. a router `Link`) as the item, keeping its own children. */
  asChild?: boolean
}

const ItemInner = ({
  icon,
  badge,
  children,
  trailing,
  current = false,
}: {
  icon?: ReactNode
  badge?: ReactNode
  children?: ReactNode
  trailing?: ReactNode
  current?: boolean
}) => {
  const { collapsed } = useContext(NavContext)
  return (
    <>
      {icon != null && (
        <span
          className={cx(
            "kg-sidebar-nav__icon inline-grid place-items-center shrink-0 size-[1.25rem] [&_svg]:size-[1.0625rem]",
            "transition-colors duration-(--kg-duration-fast) ease-kg-out",
            current
              ? "text-kg-accent-fg"
              : "text-kg-fg-faint [.kg-sidebar-nav__item:hover_&]:text-kg-fg-muted",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className={cx("kg-sidebar-nav__label", collapsed ? "sr-only" : "flex-auto min-w-0 truncate")}>
        {children}
      </span>
      {badge != null && (
        <span
          className={cx(
            "kg-sidebar-nav__badge inline-flex items-center justify-center shrink-0 font-semibold tabular-nums leading-none rounded-full",
            current ? "text-kg-accent bg-kg-accent-fg" : "text-kg-fg-muted bg-kg-muted",
            collapsed
              ? "absolute top-px end-[3px] min-w-4 h-4 px-[3px] text-[0.625rem] shadow-[0_0_0_2px_var(--kg-surface)]"
              : "min-w-[1.25rem] h-[1.25rem] px-1.5 text-kg-xs",
          )}
        >
          {badge}
        </span>
      )}
      {trailing}
    </>
  )
}

const textOf = (node: ReactNode): string =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join("")
      : isValidElement(node)
        ? textOf((node.props as { children?: ReactNode }).children)
        : ""

export const SidebarNavItem = forwardRef<HTMLElement, SidebarNavItemProps>(
  (
    {
      icon,
      badge,
      active = false,
      href,
      disabled = false,
      asChild = false,
      className,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const nav = useContext(NavContext)
    const visible = useContext(VisibleContext)
    const nested = useContext(NestedContext)
    const shell = useAppShell()

    const child = asChild ? Children.only(children) : null
    const label = isValidElement(child)
      ? (child.props as { children?: ReactNode }).children
      : children

    const shared = {
      // One ref type for whichever element renders.
      ref: ref as Ref<HTMLAnchorElement & HTMLButtonElement>,
      className: cx(
        itemClass({ current: active, hot: active, collapsed: nav.collapsed, nested }),
        className,
      ),
      "aria-current": active ? ("page" as const) : undefined,
      "aria-disabled": disabled || undefined,
      "data-active": active || undefined,
      "data-kg-item": visible ? "" : undefined,
      tabIndex: visible ? undefined : -1,
      onClick: (event: MouseEvent<HTMLElement>) => {
        if (disabled) {
          event.preventDefault()
          return
        }
        onClick?.(event)
        // Choosing a page on a phone should reveal it, not leave the drawer over it.
        if (!event.defaultPrevented && shell?.mobile) shell.setMobileOpen(false)
      },
      ...props,
    }
    const inner = (
      <ItemInner icon={icon} badge={badge} current={active}>
        {label}
      </ItemInner>
    )

    const element = isValidElement(child) ? (
      <Slot {...shared}>
        {cloneElement(
          child as ReactElement<{ children?: ReactNode }>,
          undefined,
          inner,
        )}
      </Slot>
    ) : href !== undefined && !disabled ? (
      <a href={href} {...shared}>
        {inner}
      </a>
    ) : (
      <button type="button" {...shared}>
        {inner}
      </button>
    )

    return (
      <li className="kg-sidebar-nav__entry min-w-0">
        <Tooltip content={textOf(label)} side="right" disabled={!nav.collapsed}>
          {element}
        </Tooltip>
      </li>
    )
  },
)

SidebarNavItem.displayName = "SidebarNavItem"

export interface SidebarNavGroupProps extends Omit<
  HTMLAttributes<HTMLLIElement>,
  "title" | "defaultValue"
> {
  /** The group's own label, shown on its toggle. */
  label: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Highlights the toggle when one of its pages is current. */
  active?: boolean
}

const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
)

/** A disclosure of nested items. Right Arrow opens it, Left Arrow closes it. */
export const SidebarNavGroup = forwardRef<HTMLLIElement, SidebarNavGroupProps>(
  (
    {
      label,
      icon,
      badge,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      active = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const nav = useContext(NavContext)
    const visible = useContext(VisibleContext)
    const nested = useContext(NestedContext)
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const panelId = useId()
    const expanded = open && !nav.collapsed

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
      const forward = rtl ? "ArrowLeft" : "ArrowRight"
      const back = rtl ? "ArrowRight" : "ArrowLeft"
      if (event.key === forward && !open) setOpen(true)
      else if (event.key === back && open) setOpen(false)
      else return
      event.preventDefault()
    }

    return (
      <li
        ref={ref}
        className={cx("kg-sidebar-nav__entry kg-sidebar-nav__group min-w-0", className)}
        data-state={expanded ? "open" : "closed"}
        {...props}
      >
        <Tooltip content={textOf(label)} side="right" disabled={!nav.collapsed}>
          <button
            type="button"
            className={itemClass({ current: false, hot: active, collapsed: nav.collapsed, nested })}
            aria-expanded={expanded}
            aria-controls={panelId}
            data-active={active || undefined}
            data-kg-item={visible ? "" : undefined}
            tabIndex={visible ? undefined : -1}
            onKeyDown={onKeyDown}
            onClick={() => {
              // A rail has no room for nested links, so opening a group widens the sidebar.
              if (nav.collapsed) {
                nav.expand()
                setOpen(true)
              } else setOpen(!open)
            }}
          >
            <ItemInner
              icon={icon}
              badge={badge}
              trailing={
                <span
                  className={cx(
                    "kg-sidebar-nav__chevron",
                    nav.collapsed
                      ? "sr-only"
                      : cx(
                          "inline-flex shrink-0 text-kg-fg-faint [&_svg]:size-[0.875rem]",
                          "transition-[rotate] duration-(--kg-duration-slow) ease-kg-out",
                          expanded && "rotate-90",
                        ),
                  )}
                  aria-hidden="true"
                >
                  <ChevronIcon />
                </span>
              }
            >
              {label}
            </ItemInner>
          </button>
        </Tooltip>
        <div
          id={panelId}
          className={cx(
            "kg-sidebar-nav__panel grid transition-[grid-template-rows] duration-(--kg-duration-slow) ease-kg-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
          {...(expanded ? null : inertProps)}
        >
          <VisibleContext.Provider value={visible && expanded}>
            <NestedContext.Provider value>
              <ul
                className={cx(
                  list,
                  "kg-sidebar-nav__sublist relative min-h-0 overflow-hidden ms-4.75 py-[2px] ps-2",
                  "transition-[opacity,translate] duration-(--kg-duration-base) ease-kg-out",
                  "before:absolute before:inset-y-1 before:start-0 before:w-px before:bg-kg-border",
                  expanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1",
                )}
              >
                {children}
              </ul>
            </NestedContext.Provider>
          </VisibleContext.Provider>
        </div>
      </li>
    )
  },
)

SidebarNavGroup.displayName = "SidebarNavGroup"
