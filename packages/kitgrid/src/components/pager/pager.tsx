import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export interface PagerLink {
  label: ReactNode
  href: string
}

export interface PagerProps extends HTMLAttributes<HTMLElement> {
  previous?: PagerLink
  next?: PagerLink
  previousLabel?: string
  nextLabel?: string
}

const linkClass = [
  "kg-pager__link group/link grid gap-1 px-5 py-4 text-kg-fg no-underline",
  "bg-kg-surface border-2 border-kg-ink rounded-kg-xl shadow-kg-sm",
  "transition-[translate,box-shadow] duration-(--kg-duration-base) ease-kg-out",
  "hover:-translate-y-px hover:shadow-kg-md",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  "data-[dir=next]:justify-items-end data-[dir=next]:text-end min-[30rem]:data-[dir=next]:col-start-2",
]

const hintClass =
  "kg-pager__hint inline-flex items-center gap-1.5 text-kg-xs text-kg-fg-muted"

const Arrow = ({ flip = false }: { flip?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    className="kg-pager__arrow size-[0.875rem] transition-transform duration-(--kg-duration-base) ease-kg-out data-flip:rotate-180 rtl:-scale-x-100 group-hover/link:[transform:translateX(3px)]"
    data-flip={flip || undefined}
  >
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Previous and next links at the end of an article or docs page. */
export const Pager = forwardRef<HTMLElement, PagerProps>(
  (
    {
      previous,
      next,
      previousLabel = "Previous",
      nextLabel = "Next",
      className,
      "aria-label": ariaLabel = "Pagination",
      ...props
    },
    ref,
  ) => (
    <nav ref={ref} aria-label={ariaLabel} className={cx("kg-pager grid grid-cols-1 gap-3 min-[30rem]:grid-cols-2", className)} {...props}>
      {previous ? (
        <a href={previous.href} rel="prev" className={cx(linkClass)} data-dir="previous">
          <span className={hintClass}>
            <Arrow flip />
            {previousLabel}
          </span>
          <span className="kg-pager__title text-kg-md font-semibold tracking-[-0.01em]">{previous.label}</span>
        </a>
      ) : (
        <span aria-hidden="true" />
      )}
      {next ? (
        <a href={next.href} rel="next" className={cx(linkClass)} data-dir="next">
          <span className={hintClass}>
            {nextLabel}
            <Arrow />
          </span>
          <span className="kg-pager__title text-kg-md font-semibold tracking-[-0.01em]">{next.label}</span>
        </a>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  ),
)

Pager.displayName = "Pager"
