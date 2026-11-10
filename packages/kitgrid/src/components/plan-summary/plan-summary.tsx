import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { cx } from "../../utils/cx.js"
import { PlanBadge, type PlanBadgeTier } from "../plan-badge/plan-badge.js"

export interface PlanSummaryProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Heading, e.g. "Northwind workspace" or "Current plan". */
  title: ReactNode
  tier: PlanBadgeTier
  /** Overrides the badge text. */
  tierLabel?: ReactNode
  /** Formatted price, e.g. "$96". */
  price: ReactNode
  /** e.g. "per month". */
  cadence?: ReactNode
  /** A quiet line such as "Renews Nov 1". */
  renewal?: ReactNode
  /** Two to four short lines. */
  features?: readonly ReactNode[]
  /** Usually "Change plan" and "Cancel". */
  actions?: ReactNode
}

const Check = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    className="shrink-0 size-4 mt-[0.125rem] text-kg-accent-strong"
  >
    <path
      d="m3.5 8.3 2.8 2.8 6.2-6.4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** The plan a workspace is on today, for the billing settings page. Server-safe. */
export const PlanSummary = forwardRef<HTMLElement, PlanSummaryProps>(
  (
    { title, tier, tierLabel, price, cadence, renewal, features, actions, className, ...props },
    ref,
  ) => {
    const titleId = useId()
    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        className={cx(
          "kg-plan-summary @container relative grid gap-x-8 gap-y-5 min-w-0 p-5 text-kg-fg",
          "grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @max-[30rem]:grid-cols-[minmax(0,1fr)]",
          "bg-kg-surface border-2 border-kg-ink rounded-kg-xl shadow-kg-md",
          className,
        )}
        data-tier={tier}
        {...props}
      >
        <div className="kg-plan-summary__main relative grid content-start gap-2">
          <header className="kg-plan-summary__head flex flex-wrap items-center gap-2">
            <h3 id={titleId} className="kg-plan-summary__title m-0 text-kg-md font-[640] text-kg-fg">
              {title}
            </h3>
            <PlanBadge tier={tier}>{tierLabel}</PlanBadge>
          </header>
          <p className="kg-plan-summary__price flex items-baseline gap-1.5 m-0">
            <span className="kg-plan-summary__amount text-(length:--kg-text-3xl) font-bold tabular-nums tracking-[-0.03em] leading-[1.05] text-kg-fg">
              {price}
            </span>
            {cadence != null && (
              <span className="kg-plan-summary__cadence text-kg-xs text-kg-fg-muted">{cadence}</span>
            )}
          </p>
          {renewal != null && (
            <p className="kg-plan-summary__renewal m-0 text-kg-xs text-kg-fg-muted">{renewal}</p>
          )}
        </div>
        {features && features.length > 0 && (
          <ul className="kg-plan-summary__features relative grid content-start gap-2 m-0 p-0 list-none text-kg-sm text-kg-fg-muted">
            {features.map((feature, index) => (
              <li key={index} className="flex gap-2">
                <Check />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
        {actions != null && (
          <div className="kg-plan-summary__actions col-span-full flex flex-wrap justify-end gap-2 pt-4 border-t-2 border-kg-border">
            {actions}
          </div>
        )}
      </section>
    )
  },
)

PlanSummary.displayName = "PlanSummary"
