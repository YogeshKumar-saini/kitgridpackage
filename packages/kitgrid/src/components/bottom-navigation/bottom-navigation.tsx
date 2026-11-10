"use client"

import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"

const navClass = [
  "kg-bottom-nav w-full max-w-[30rem] p-1.5 text-kg-fg-muted bg-kg-surface border-2 border-kg-ink rounded-kg-2xl shadow-kg-md",
  "data-fixed:fixed data-fixed:z-40 data-fixed:left-1/2 data-fixed:-translate-x-1/2",
  "data-fixed:bottom-[max(calc(var(--kg-space)*3),env(safe-area-inset-bottom))] data-fixed:w-[calc(100%-var(--kg-space)*6)]",
]

/* Equal columns let the pill slide on index alone: no measuring, transform only. */
const pillClass = [
  "kg-bottom-nav__pill pointer-events-none absolute inset-y-0 left-0 px-1",
  "[transform:translateX(calc(var(--_index)*100%))] transition-transform duration-(--kg-duration-slow) ease-kg-out",
  "before:block before:h-full before:rounded-kg-xl before:bg-kg-paper-sage before:content-['']",
]

const itemClass = [
  "kg-bottom-nav__item group/item relative grid w-full justify-items-center gap-[2px] px-1 py-2",
  "[font-family:inherit] text-kg-xs font-medium text-inherit no-underline bg-transparent border-0 rounded-kg-xl cursor-pointer",
  "[-webkit-tap-highlight-color:transparent] transition-colors duration-(--kg-duration-fast) ease-kg-out hover:text-kg-fg data-active:text-kg-fg",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

export interface BottomNavigationItem {
  value: string
  label: string
  icon: ReactNode
  /** Render the item as a link. Without it the item is a button. */
  href?: string
  /** A count or short marker; announced with the label. */
  badge?: ReactNode
}

export interface BottomNavigationLinkProps {
  href: string
  className: string
  "aria-current"?: "page"
  "data-active"?: true
  onClick: () => void
  children: ReactNode
}

export interface BottomNavigationProps
  extends Omit<HTMLAttributes<HTMLElement>, "defaultValue" | "onChange"> {
  items: BottomNavigationItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Pin to the bottom of the viewport (respecting the safe area) instead of flowing inline. */
  fixed?: boolean
  /** Hide labels except on the active item. */
  compact?: boolean
  /** Render `href` items with a router component, e.g. Next.js `Link`. */
  renderLink?: (props: BottomNavigationLinkProps) => ReactNode
}

/** A mobile tab bar: three to five destinations with a sliding active pill. */
export const BottomNavigation = forwardRef<HTMLElement, BottomNavigationProps>(
  (
    {
      items,
      value: valueProp,
      defaultValue,
      onValueChange,
      fixed = false,
      compact = false,
      renderLink,
      className,
      style,
      "aria-label": ariaLabel = "Primary",
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? items[0]?.value ?? "",
      onChange: onValueChange,
    })
    const index = Math.max(
      0,
      items.findIndex((item) => item.value === value),
    )

    return (
      <nav
        ref={ref}
        aria-label={ariaLabel}
        className={cx(navClass, className)}
        data-fixed={fixed || undefined}
        data-compact={compact || undefined}
        style={{ "--_n": items.length, "--_index": index, ...style } as CSSProperties}
        {...props}
      >
        <ul className="kg-bottom-nav__list relative m-0 grid list-none grid-cols-[repeat(var(--_n),1fr)] p-0">
          <li
            className={cx(pillClass)}
            style={{ width: `${100 / Math.max(1, items.length)}%` }}
            aria-hidden="true"
          />
          {items.map((item) => {
            const active = item.value === value
            const content = (
              <>
                <span className="kg-bottom-nav__icon relative grid size-[1.375rem] transition-[translate,scale] duration-(--kg-duration-base) ease-kg-out group-data-active/item:-translate-y-px group-data-active/item:scale-106 [&_svg]:size-full" aria-hidden="true">
                  {item.icon}
                  {item.badge != null && (
                    <span className="kg-bottom-nav__badge absolute -top-[4px] left-[calc(100%-6px)] h-[1rem] min-w-[1rem] rounded-full bg-kg-danger px-[4px] text-center text-[0.625rem] leading-[1rem] font-bold text-kg-danger-fg shadow-[0_0_0_2px_var(--kg-surface)]">{item.badge}</span>
                  )}
                </span>
                <span className={cx("kg-bottom-nav__label leading-[1.2] whitespace-nowrap", compact && !active && "sr-only")}>{item.label}</span>
                {(typeof item.badge === "string" || typeof item.badge === "number") && (
                  <span className="kg-bottom-nav__sr sr-only">{`, ${item.badge}`}</span>
                )}
              </>
            )
            const shared = {
              className: itemClass,
              "aria-current": active ? ("page" as const) : undefined,
              "data-active": active || undefined,
              onClick: () => setValue(item.value),
            }
            return (
              <li key={item.value}>
                {item.href !== undefined ? (
                  renderLink ? (
                    renderLink({ href: item.href, ...shared, children: content })
                  ) : (
                    <a href={item.href} {...shared}>
                      {content}
                    </a>
                  )
                ) : (
                  <button type="button" {...shared}>
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    )
  },
)

BottomNavigation.displayName = "BottomNavigation"
