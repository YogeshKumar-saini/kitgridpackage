"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useRef } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type SegmentedNavSize = "sm" | "md"

const itemVariants = variants({
  base: [
    "kg-segmented-nav__item inline-flex w-full items-center justify-center gap-1.5 px-4 whitespace-nowrap",
    "[font-family:inherit] text-kg-sm font-medium text-kg-fg-muted no-underline bg-transparent border-0 rounded-full cursor-pointer",
    "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:text-kg-fg aria-[current=page]:text-kg-fg",
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
  ],
  variants: {
    size: {
      sm: "h-[calc(var(--kg-control-sm)-8px)]",
      md: "h-[calc(var(--kg-control-md)-8px)]",
    },
  },
  defaults: { size: "md" },
})

const listClass =
  "kg-segmented-nav__list relative m-0 flex flex-1 list-none gap-[2px] overflow-x-auto p-[3px] bg-kg-surface-sunken border-2 border-kg-ink rounded-full [scrollbar-width:none]"

/* The current item sits on a sage slip that slides on transform. */
const thumbClass =
  "kg-segmented-nav__thumb absolute inset-y-0 left-0 w-[var(--_w,0)] rounded-full bg-kg-paper-sage [transform:translateX(var(--_x,0))] transition-transform duration-(--kg-duration-slow) ease-kg-out"

export interface SegmentedNavItem {
  value: string
  label: ReactNode
  href?: string
  icon?: ReactNode
}

export interface SegmentedNavLinkProps {
  href: string
  className: string
  "aria-current"?: "page"
  onClick: () => void
  children: ReactNode
}

export interface SegmentedNavProps
  extends Omit<HTMLAttributes<HTMLElement>, "defaultValue" | "onChange"> {
  items: SegmentedNavItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  size?: SegmentedNavSize
  /** Stretch items to fill the container. */
  fullWidth?: boolean
  /** Render `href` items with a router component, e.g. Next.js `Link`. */
  renderLink?: (props: SegmentedNavLinkProps) => ReactNode
}

/**
 * Page-level navigation styled as a segmented track. Unlike SegmentedControl (a radio group
 * that changes a value), items here are links to places, marked with `aria-current="page"`.
 */
export const SegmentedNav = forwardRef<HTMLElement, SegmentedNavProps>(
  (
    {
      items,
      value: valueProp,
      defaultValue,
      onValueChange,
      size = "md",
      fullWidth = false,
      renderLink,
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? items[0]?.value ?? "",
      onChange: onValueChange,
    })
    const list = useRef<HTMLUListElement>(null)
    const thumb = useRef<HTMLSpanElement>(null)

    useIsomorphicLayoutEffect(() => {
      const track = list.current
      const node = thumb.current
      if (!track || !node) return
      const place = () => {
        const link = track.querySelector<HTMLElement>('[aria-current="page"]')
        if (!link) {
          node.style.opacity = "0"
          return
        }
        node.style.opacity = "1"
        node.style.setProperty("--_x", `${link.offsetLeft}px`)
        node.style.setProperty("--_w", `${link.offsetWidth}px`)
      }
      place()
      const observer = new ResizeObserver(place)
      observer.observe(track)
      return () => observer.disconnect()
    }, [value])

    return (
      <nav
        ref={ref}
        className={cx("kg-segmented-nav inline-flex max-w-full data-full-width:flex", className)}
        data-size={size}
        data-full-width={fullWidth || undefined}
        {...props}
      >
        <ul ref={list} className={listClass}>
          <li className="kg-segmented-nav__thumb-slot pointer-events-none absolute inset-y-[3px] left-0 z-0" aria-hidden="true">
            <span ref={thumb} className={thumbClass} />
          </li>
          {items.map((item) => {
            const active = item.value === value
            const content = (
              <>
                {item.icon != null && (
                  <span className="kg-segmented-nav__icon grid size-4 [&_svg]:size-full" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </>
            )
            const shared = {
              className: itemVariants({ size }),
              "aria-current": active ? ("page" as const) : undefined,
              onClick: () => setValue(item.value),
            }
            return (
              <li key={item.value} className={cx("relative z-1", fullWidth && "flex-1")}>
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

SegmentedNav.displayName = "SegmentedNav"
