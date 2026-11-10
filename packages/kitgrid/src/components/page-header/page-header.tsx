import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export type PageHeaderTitleElement = "h1" | "h2" | "h3"
export type PageHeaderSize = "md" | "lg"

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode
  titleAs?: PageHeaderTitleElement
  description?: ReactNode
  /** Above the title, usually a `<Breadcrumb>`. */
  breadcrumb?: ReactNode
  /** Buttons and menus that act on the whole page. */
  actions?: ReactNode
  /** A quiet line under the description: owner, freshness, period. */
  meta?: ReactNode
  /** Draws the short accent rule under the title. */
  rule?: boolean
  size?: PageHeaderSize
}

const titleClass =
  "m-0 text-(length:--_title) font-[650] leading-[1.15] tracking-[-0.024em] text-balance"

/* A short ink rule under the title that draws in from the left. */
const ruleClass = [
  "after:mt-2.5 after:block after:h-[3px] after:w-10 after:rounded-full after:bg-kg-ink after:content-['']",
  "after:origin-left after:animate-[kg-page-header-rule_var(--kg-duration-slower)_var(--kg-ease-out)_120ms_backwards]",
  "motion-reduce:after:animate-none in-data-[kg-motion=reduce]:after:animate-none",
].join(" ")

/** The title block of a page: breadcrumb, title, description, meta and page actions. Server-safe. */
export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(
  (
    {
      title,
      titleAs: Title = "h1",
      description,
      breadcrumb,
      actions,
      meta,
      rule = true,
      size = "md",
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <header
      ref={ref}
      className={cx(
        "kg-page-header grid min-w-0 gap-3 pb-5 text-kg-fg",
        size === "lg" ? "[--_title:var(--kg-text-3xl)]" : "[--_title:var(--kg-text-2xl)]",
        className,
      )}
      data-size={size}
      data-rule={rule || undefined}
      {...props}
    >
      {breadcrumb != null && <div className="kg-page-header__breadcrumb">{breadcrumb}</div>}
      <div className="kg-page-header__row flex flex-wrap items-end justify-between gap-4">
        <div className="kg-page-header__text grid min-w-0 flex-[1_1_20rem] gap-1.5">
          <Title className={cx("kg-page-header__title", titleClass, rule && ruleClass)}>{title}</Title>
          {description != null && (
            <p className="kg-page-header__description m-0 max-w-[72ch] text-kg-md leading-[1.55] text-pretty text-kg-fg-muted">
              {description}
            </p>
          )}
          {meta != null && (
            <div className="kg-page-header__meta flex flex-wrap items-center gap-x-4 gap-y-2 text-kg-sm text-kg-fg-faint">
              {meta}
            </div>
          )}
        </div>
        {actions != null && (
          <div className="kg-page-header__actions flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </header>
  ),
)

PageHeader.displayName = "PageHeader"
