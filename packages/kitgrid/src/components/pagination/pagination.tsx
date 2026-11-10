import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

export type PaginationSize = "sm" | "md" | "lg"
export type PaginationItem = number | "ellipsis-start" | "ellipsis-end"

export interface PaginationLabels {
  /** Accessible name of the navigation landmark. */
  nav?: string
  previous?: string
  next?: string
  page?: (page: number) => string
}

export interface PaginationLinkProps {
  href: string
  className: string
  "aria-label": string
  "aria-current"?: "page"
  onClick?: () => void
  children: ReactNode
}

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The current page, starting at 1. */
  page: number
  pageCount: number
  /** Pages shown on each side of the current one. */
  siblings?: number
  /** Pages always shown at each end. */
  boundaries?: number
  /** Button mode: called with the requested page. Also called on link clicks in link mode. */
  onPageChange?: (page: number) => void
  /** Link mode: real <a href> for every page, crawlable and server-rendered. */
  getHref?: (page: number) => string
  /** Render links with a router component, e.g. Next.js `Link`. */
  renderLink?: (props: PaginationLinkProps) => ReactNode
  labels?: PaginationLabels
  size?: PaginationSize
  /** Hide the Previous/Next text, leaving arrows (their names stay for screen readers). */
  compact?: boolean
}

const range = (start: number, end: number): number[] =>
  Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)

/**
 * The page numbers and ellipses to show. The item count stays constant as the page changes, so
 * the control never shifts under the pointer.
 */
export const paginationRange = (
  page: number,
  pageCount: number,
  siblings = 1,
  boundaries = 1,
): PaginationItem[] => {
  if (pageCount <= 0) return []
  const current = clamp(page, 1, pageCount)
  const startPages = range(1, Math.min(boundaries, pageCount))
  const endPages = range(
    Math.max(pageCount - boundaries + 1, boundaries + 1),
    pageCount,
  )
  const siblingsStart = Math.max(
    Math.min(current - siblings, pageCount - boundaries - siblings * 2 - 1),
    boundaries + 2,
  )
  const siblingsEnd = Math.min(
    Math.max(current + siblings, boundaries + siblings * 2 + 2),
    endPages.length > 0 ? (endPages[0] as number) - 2 : pageCount - 1,
  )
  const items: PaginationItem[] = [...startPages]
  if (siblingsStart > boundaries + 2) items.push("ellipsis-start")
  else if (boundaries + 1 < pageCount - boundaries) items.push(boundaries + 1)
  items.push(...range(siblingsStart, siblingsEnd))
  if (siblingsEnd < pageCount - boundaries - 1) items.push("ellipsis-end")
  else if (pageCount - boundaries > boundaries) items.push(pageCount - boundaries)
  items.push(...endPages)
  return items
}

const SIZE: Record<PaginationSize, string> = {
  sm: "text-kg-sm [--_radius:var(--kg-radius-sm)] [--_size:var(--kg-control-sm)]",
  md: "text-kg-base [--_radius:var(--kg-radius-md)] [--_size:var(--kg-control-md)]",
  lg: "text-kg-md [--_radius:var(--kg-radius-md)] [--_size:var(--kg-control-lg)]",
}

/*
 * Paper Layers: the current page is an ink-edged accent sheet lifted by a sage offset, filled
 * and bordered so it never relies on colour alone.
 */
const controlClass = [
  "kg-pagination__control inline-flex h-(--_size) min-w-(--_size) cursor-pointer items-center justify-center gap-1.5 select-none",
  "rounded-(--_radius) border-2 border-transparent bg-transparent [font-family:inherit] font-medium leading-none tabular-nums no-underline",
  "transition-[background-color,border-color,color,box-shadow,scale] duration-(--kg-duration-fast) ease-kg-out [-webkit-tap-highlight-color:transparent]",
  "[&:not([aria-current=page])]:interactive:hover:bg-kg-muted [&:not([aria-current=page])]:interactive:active:scale-[0.92]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  "aria-[current=page]:cursor-default aria-[current=page]:border-kg-ink aria-[current=page]:bg-kg-accent aria-[current=page]:font-bold",
  "aria-[current=page]:text-kg-accent-fg aria-[current=page]:shadow-[2px_2px_0_var(--kg-paper-sage)]",
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
  "[&_svg]:size-[1em] [&_svg]:shrink-0",
].join(" ")

const defaultLabels: Required<PaginationLabels> = {
  nav: "Pagination",
  previous: "Previous",
  next: "Next",
  page: (page) => `Page ${page}`,
}

const Arrow = ({ direction }: { direction: "previous" | "next" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path
      d={direction === "previous" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** Server-safe in link mode: with `getHref` it renders plain anchors and ships no JavaScript. */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  (
    {
      page,
      pageCount,
      siblings = 1,
      boundaries = 1,
      onPageChange,
      getHref,
      renderLink,
      labels,
      size = "md",
      compact = false,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const stepLabel = cx("kg-pagination__step-label", compact ? "sr-only" : "max-[30rem]:sr-only")
    const count = Math.max(0, Math.floor(pageCount))
    const current = clamp(page, 1, Math.max(1, count))

    const control = (
      target: number,
      kind: "page" | "previous" | "next",
      children: ReactNode,
    ) => {
      const isCurrent = kind === "page" && target === current
      const disabled = kind !== "page" && (target < 1 || target > count)
      const name =
        kind === "page"
          ? text.page(target)
          : kind === "previous"
            ? text.previous
            : text.next
      const classes = cx(
        controlClass,
        kind === "page"
          ? "px-2 text-kg-fg"
          : [
              "kg-pagination__step text-kg-fg-muted",
              compact ? "px-0" : "px-2.5 max-[30rem]:px-0",
            ],
      )
      const data = { "data-kind": kind }

      if (getHref) {
        if (disabled) {
          // A link without href is not focusable; aria-disabled keeps its name and state exposed.
          return (
            <a
              role="link"
              aria-disabled="true"
              aria-label={name}
              className={classes}
              {...data}
            >
              {children}
            </a>
          )
        }
        const linkProps: PaginationLinkProps = {
          href: getHref(target),
          className: classes,
          "aria-label": name,
          ...(isCurrent ? { "aria-current": "page" as const } : null),
          ...(onPageChange ? { onClick: () => onPageChange(target) } : null),
          children,
        }
        return renderLink ? renderLink(linkProps) : <a {...linkProps} {...data} />
      }

      return (
        <button
          type="button"
          className={classes}
          aria-label={name}
          aria-current={isCurrent ? "page" : undefined}
          disabled={disabled}
          onClick={isCurrent || disabled ? undefined : () => onPageChange?.(target)}
          {...data}
        >
          {children}
        </button>
      )
    }

    return (
      <nav
        ref={ref}
        aria-label={text.nav}
        className={cx("kg-pagination", SIZE[size] ?? SIZE.md, className)}
        data-size={size}
        data-compact={compact || undefined}
        {...props}
      >
        <ul className="kg-pagination__list m-0 flex list-none flex-wrap items-center gap-1 p-0">
          <li>
            {control(
              current - 1,
              "previous",
              <>
                <Arrow direction="previous" />
                <span className={stepLabel}>{text.previous}</span>
              </>,
            )}
          </li>
          {paginationRange(current, count, siblings, boundaries).map((item) =>
            typeof item === "number" ? (
              <li key={item}>{control(item, "page", item)}</li>
            ) : (
              <li
                key={item}
                className="kg-pagination__ellipsis inline-grid h-(--_size) min-w-[calc(var(--_size)*0.75)] place-items-center tracking-[0.05em] text-kg-fg-muted"
                aria-hidden="true"
              >
                …
              </li>
            ),
          )}
          <li>
            {control(
              current + 1,
              "next",
              <>
                <span className={stepLabel}>{text.next}</span>
                <Arrow direction="next" />
              </>,
            )}
          </li>
        </ul>
      </nav>
    )
  },
)

Pagination.displayName = "Pagination"
