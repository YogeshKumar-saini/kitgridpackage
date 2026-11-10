import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { cx } from "../../utils/cx.js"
import { QuotaBar } from "../quota-bar/quota-bar.js"

export interface BillingUsageItem {
  id: string
  label: ReactNode
  used: number
  limit: number
  format?: (value: number) => string
}

export interface BillingUsageProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode
  /** The billing period, e.g. "Oct 1 - Oct 31". */
  period: ReactNode
  /** Days into the period and its length, drawn as a ring. */
  elapsedDays: number
  totalDays: number
  items: readonly BillingUsageItem[]
  /** Amount due so far, already formatted. */
  total?: ReactNode
  totalLabel?: ReactNode
  /** Footer slot: a "Manage plan" link, say. */
  action?: ReactNode
  daysLeftLabel?: (days: number) => string
}

/** Metered usage for the current billing period, with a ring for time left. Server-safe. */
export const BillingUsage = forwardRef<HTMLElement, BillingUsageProps>(
  (
    {
      title = "Usage",
      period,
      elapsedDays,
      totalDays,
      items,
      total,
      totalLabel = "Due so far",
      action,
      daysLeftLabel = (days) => `${days} ${days === 1 ? "day" : "days"} left`,
      className,
      ...props
    },
    ref,
  ) => {
    const titleId = useId()
    const fraction = totalDays > 0 ? Math.min(Math.max(elapsedDays / totalDays, 0), 1) : 0
    const left = Math.max(totalDays - elapsedDays, 0)
    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        className={cx(
          "kg-billing-usage @container grid gap-5 min-w-0 p-5 text-kg-fg",
          "bg-kg-surface border-2 border-kg-ink rounded-kg-xl shadow-kg-md",
          className,
        )}
        {...props}
      >
        <header className="kg-billing-usage__head flex items-center gap-3 min-w-0">
          <span
            className={cx(
              "kg-billing-usage__ring shrink-0 size-[2.5rem] rounded-full",
              "bg-[conic-gradient(var(--kg-accent)_calc(var(--_elapsed,0)*1turn),var(--kg-muted)_0)]",
              "[mask:radial-gradient(circle,transparent_54%,var(--kg-fg)_56%)]",
            )}
            style={{ "--_elapsed": fraction } as CSSProperties}
            aria-hidden="true"
          />
          <div className="kg-billing-usage__heading grid flex-1 gap-[0.125rem] min-w-0">
            <h3
              id={titleId}
              className="kg-billing-usage__title m-0 text-kg-md font-[640] tracking-[-0.01em] text-kg-fg"
            >
              {title}
            </h3>
            <span className="kg-billing-usage__period flex flex-wrap gap-2 text-kg-xs text-kg-fg-muted">
              {period}
              <span className="kg-billing-usage__left text-kg-fg-faint">{daysLeftLabel(left)}</span>
            </span>
          </div>
          {total != null && (
            <div className="kg-billing-usage__total grid justify-items-end gap-[0.125rem] text-end">
              <span className="kg-billing-usage__total-label text-kg-xs text-kg-fg-faint">
                {totalLabel}
              </span>
              <span className="kg-billing-usage__total-value text-(length:--kg-text-xl) font-[680] tabular-nums tracking-[-0.02em] text-kg-fg">
                {total}
              </span>
            </div>
          )}
        </header>
        <div className="kg-billing-usage__meters grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-x-6 gap-y-4">
          {items.map((item) => (
            <QuotaBar
              key={item.id}
              label={item.label}
              used={item.used}
              limit={item.limit}
              format={item.format}
              size="sm"
            />
          ))}
        </div>
        {action != null && (
          <footer className="kg-billing-usage__foot flex justify-end gap-2 pt-4 border-t-2 border-kg-border">
            {action}
          </footer>
        )}
      </section>
    )
  },
)

BillingUsage.displayName = "BillingUsage"
