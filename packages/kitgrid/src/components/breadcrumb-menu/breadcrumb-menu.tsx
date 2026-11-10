"use client"

import { Fragment, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu/dropdown-menu.js"

export interface BreadcrumbMenuItem {
  label: string
  href?: string
  icon?: ReactNode
}

export interface BreadcrumbMenuLinkProps {
  href: string
  className: string
  children: ReactNode
}

export interface BreadcrumbMenuProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbMenuItem[]
  /** Visible crumbs before the middle ones fold into a menu. At least 3. */
  maxItems?: number
  /** Crumbs kept before the fold. */
  leading?: number
  /** Called for crumbs chosen from the overflow menu. Defaults to following `href`. */
  onNavigate?: (item: BreadcrumbMenuItem) => void
  /** Accessible name of the overflow button. */
  overflowLabel?: string
  separator?: ReactNode
  /** Render crumb links with a router component, e.g. Next.js `Link`. */
  renderLink?: (props: BreadcrumbMenuLinkProps) => ReactNode
}

const crumbClass =
  "inline-flex max-w-[14rem] items-center gap-1.5 overflow-hidden rounded-kg-sm px-1.5 py-1 text-ellipsis whitespace-nowrap [&_svg]:size-[0.875rem] [&_svg]:shrink-0"

const linkClass = [
  `kg-breadcrumb-menu__link ${crumbClass} text-kg-fg-muted no-underline`,
  "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted hover:text-kg-fg",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
].join(" ")

const overflowClass = [
  "kg-breadcrumb-menu__overflow inline-grid h-[1.5rem] w-[1.75rem] place-items-center p-0 cursor-pointer",
  "text-kg-fg-muted bg-transparent border-2 border-dashed border-kg-border-strong rounded-full [&_svg]:size-4",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "hover:border-solid hover:bg-kg-muted hover:text-kg-fg data-[state=open]:border-solid data-[state=open]:bg-kg-paper-sage data-[state=open]:text-kg-fg",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Dots = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="19" cy="12" r="1.75" />
  </svg>
)

/**
 * A breadcrumb trail whose middle crumbs fold into a dropdown menu once the trail is long.
 * The last crumb is the current page.
 */
export const BreadcrumbMenu = forwardRef<HTMLElement, BreadcrumbMenuProps>(
  (
    {
      items,
      maxItems = 4,
      leading = 1,
      onNavigate,
      overflowLabel = "Show hidden pages",
      separator,
      renderLink,
      className,
      "aria-label": ariaLabel = "Breadcrumb",
      ...props
    },
    ref,
  ) => {
    const max = Math.max(3, maxItems)
    const fold = items.length > max
    const trailing = max - leading - 1
    const head = fold ? items.slice(0, leading) : items
    const hidden = fold ? items.slice(leading, items.length - trailing) : []
    const tail = fold ? items.slice(items.length - trailing) : []
    const last = items.length - 1

    const sep = (
      <li className="kg-breadcrumb-menu__separator inline-grid size-[0.875rem] text-kg-fg-faint [&_svg]:size-full" role="presentation" aria-hidden="true">
        {separator ?? <Chevron />}
      </li>
    )

    const crumb = (item: BreadcrumbMenuItem, index: number) => (
      <li className="kg-breadcrumb-menu__item inline-flex min-w-0 items-center">
        {index === last ? (
          <span className={`kg-breadcrumb-menu__current ${crumbClass} font-medium text-kg-fg`} aria-current="page">
            {item.icon}
            {item.label}
          </span>
        ) : item.href === undefined ? (
          <span className={`kg-breadcrumb-menu__text ${crumbClass}`}>
            {item.icon}
            {item.label}
          </span>
        ) : renderLink ? (
          renderLink({
            href: item.href,
            className: linkClass,
            children: (
              <>
                {item.icon}
                {item.label}
              </>
            ),
          })
        ) : (
          <a className={linkClass} href={item.href}>
            {item.icon}
            {item.label}
          </a>
        )}
      </li>
    )

    return (
      <nav
        ref={ref}
        aria-label={ariaLabel}
        className={cx("kg-breadcrumb-menu", className)}
        {...props}
      >
        <ol className="kg-breadcrumb-menu__list m-0 flex list-none flex-wrap items-center gap-1 p-0 text-kg-sm">
          {head.map((item, index) => (
            <Fragment key={`h-${index}`}>
              {index > 0 && sep}
              {crumb(item, index)}
            </Fragment>
          ))}
          {fold && (
            <>
              {sep}
              <li className="kg-breadcrumb-menu__item inline-flex min-w-0 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={overflowClass}
                    aria-label={overflowLabel}
                  >
                    <Dots />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {hidden.map((item, index) => (
                      <DropdownMenuItem
                        key={`${item.label}-${index}`}
                        icon={item.icon}
                        onSelect={() => {
                          if (onNavigate) onNavigate(item)
                          else if (item.href) window.location.assign(item.href)
                        }}
                      >
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
              {tail.map((item, index) => (
                <Fragment key={`t-${index}`}>
                  {sep}
                  {crumb(item, items.length - trailing + index)}
                </Fragment>
              ))}
            </>
          )}
        </ol>
      </nav>
    )
  },
)

BreadcrumbMenu.displayName = "BreadcrumbMenu"

