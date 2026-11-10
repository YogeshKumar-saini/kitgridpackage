import { cloneElement, forwardRef, type HTMLAttributes, isValidElement, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { Breadcrumb, type BreadcrumbProps } from "../breadcrumb/breadcrumb.js"

export interface TopbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Before the breadcrumb: a sidebar toggle, a logo. */
  leading?: ReactNode
  /** Where you are, usually a `Breadcrumb` (kept on one line unless it sets `wrap`) or a page title. */
  breadcrumb?: ReactNode
  /** Centred on wide screens, such as a `SearchField` or a command palette trigger. */
  search?: ReactNode
  /** Trailing buttons and menus. */
  actions?: ReactNode
  /** Sets the bar on a solid sheet with an ink edge, for use over scrolling content. */
  elevated?: boolean
}

const slot = "flex items-center gap-1.5 shrink-0"

/** The bar along the top of an app. Server-safe: it only lays out the slots it's given. */
export const Topbar = forwardRef<HTMLDivElement, TopbarProps>(
  (
    {
      leading,
      breadcrumb,
      search,
      actions,
      elevated = false,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cx(
        "kg-topbar @container flex items-center gap-3 min-h-[calc(var(--kg-control-md)+var(--kg-space)*5)] px-4",
        "data-elevated:bg-kg-surface data-elevated:border-b-2 data-elevated:border-kg-ink",
        className,
      )}
      data-elevated={elevated || undefined}
      {...props}
    >
      {leading != null && <div className={cx("kg-topbar__leading", slot)}>{leading}</div>}
      <div
        className={cx(
          "kg-topbar__breadcrumb flex-auto min-w-24 overflow-hidden",
          "@max-[36rem]:[&:has(+.kg-topbar__search)]:hidden",
        )}
      >
        {isValidElement<BreadcrumbProps>(breadcrumb) &&
        breadcrumb.type === Breadcrumb &&
        breadcrumb.props.wrap === undefined
          ? cloneElement(breadcrumb, { wrap: false })
          : breadcrumb}
      </div>
      {search != null && (
        <div className="kg-topbar__search flex-[0_1_18rem] min-w-40 @max-[36rem]:flex-auto @max-[36rem]:min-w-0">
          {search}
        </div>
      )}
      {children}
      {actions != null && (
        <div className={cx(slot, "kg-topbar__actions ms-auto @max-[36rem]:[.kg-topbar__search~&]:ms-0")}>
          {actions}
        </div>
      )}
    </div>
  ),
)

Topbar.displayName = "Topbar"
