import { forwardRef, Fragment, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { BreadcrumbCollapse } from "./breadcrumb-collapse.js"
import { breadcrumbParts } from "./breadcrumb-parts.js"

const entry = "inline-flex max-w-[16rem] items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap"

const LINK = [
  "kg-breadcrumb__link",
  entry,
  "rounded-kg-xs text-inherit no-underline transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "hover:text-kg-fg hover:underline hover:decoration-kg-ink hover:decoration-[1.5px] hover:underline-offset-[0.3em]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  "aria-[current=page]:font-semibold aria-[current=page]:text-kg-fg",
].join(" ")

export interface BreadcrumbItem {
  label: ReactNode
  /** Omit for an entry that isn't a page of its own. */
  href?: string
  icon?: ReactNode
}

export interface BreadcrumbLinkProps {
  href: string
  className: string
  "aria-current"?: "page"
  children: ReactNode
}

export interface BreadcrumbProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  items: readonly BreadcrumbItem[]
  separator?: ReactNode
  /** Collapse the middle into an expandable ellipsis when there are more items than this. */
  maxItems?: number
  /** Items kept before the ellipsis when collapsed. */
  itemsBeforeCollapse?: number
  /** Accessible name of the navigation landmark. */
  label?: string
  /** Accessible name of the ellipsis button. */
  expandLabel?: string
  /** Render links with a router component, e.g. Next.js `Link`. */
  renderLink?: (props: BreadcrumbLinkProps) => ReactNode
  /** Lets the trail wrap onto more lines. Off, it stays on one line, as it does inside a `Topbar`. */
  wrap?: boolean
}

const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Server-safe: only a collapsed breadcrumb hydrates its small expand button. */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
      items,
      separator = <ChevronIcon />,
      maxItems,
      itemsBeforeCollapse = 1,
      label = "Breadcrumb",
      expandLabel = "Show all breadcrumbs",
      renderLink,
      wrap = true,
      className,
      ...props
    },
    ref,
  ) => {
    const last = items.length - 1

    const renderEntry = (item: BreadcrumbItem, index: number) => {
      const current = index === last
      const content = (
        <>
          {item.icon != null && (
            <span className="kg-breadcrumb__icon inline-grid shrink-0 [&_svg]:size-[1em]" aria-hidden="true">
              {item.icon}
            </span>
          )}
          {item.label}
        </>
      )
      let node: ReactNode
      if (item.href !== undefined) {
        const linkProps: BreadcrumbLinkProps = {
          href: item.href,
          className: LINK,
          ...(current ? { "aria-current": "page" as const } : null),
          children: content,
        }
        node = renderLink ? renderLink(linkProps) : <a {...linkProps} />
      } else {
        node = (
          <span
            className={
              current
                ? `kg-breadcrumb__page ${entry} font-semibold text-kg-fg`
                : `kg-breadcrumb__text ${entry}`
            }
            aria-current={current ? "page" : undefined}
          >
            {content}
          </span>
        )
      }
      return (
        <Fragment key={index}>
          {index > 0 && (
            <li
              className={breadcrumbParts.separator}
              role="presentation"
              aria-hidden="true"
            >
              {separator}
            </li>
          )}
          <li className={breadcrumbParts.item}>{node}</li>
        </Fragment>
      )
    }

    const before = Math.max(1, itemsBeforeCollapse)
    const collapse =
      maxItems !== undefined && items.length > maxItems && maxItems > before
    const tail = collapse ? maxItems - before : 0

    return (
      <nav
        ref={ref}
        aria-label={label}
        className={cx("kg-breadcrumb min-w-0 text-kg-sm leading-[1.4] text-kg-fg-muted", className)}
        {...props}
      >
        <ol
          className={cx(
            "kg-breadcrumb__list m-0 flex list-none items-center gap-1.5 p-0",
            wrap ? "flex-wrap" : "flex-nowrap whitespace-nowrap",
          )}
        >
          {collapse ? (
            <>
              {items.slice(0, before).map((item, index) => renderEntry(item, index))}
              <BreadcrumbCollapse label={expandLabel} separator={separator}>
                {items
                  .slice(before, items.length - tail)
                  .map((item, offset) => renderEntry(item, before + offset))}
              </BreadcrumbCollapse>
              {items
                .slice(items.length - tail)
                .map((item, offset) => renderEntry(item, items.length - tail + offset))}
            </>
          ) : (
            items.map(renderEntry)
          )}
        </ol>
      </nav>
    )
  },
)

Breadcrumb.displayName = "Breadcrumb"
