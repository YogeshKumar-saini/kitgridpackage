import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export interface FeatureComparisonPlan {
  id: string
  name: ReactNode
  highlighted?: boolean
}

/** `true` and `false` render as marks; strings and nodes render as text, e.g. "10 GB". */
export type FeatureComparisonValue = boolean | ReactNode

export interface FeatureComparisonRow {
  label: ReactNode
  values: Record<string, FeatureComparisonValue>
}

export interface FeatureComparisonGroup {
  label?: ReactNode
  rows: readonly FeatureComparisonRow[]
}

export interface FeatureComparisonLabels {
  feature?: string
  included?: string
  excluded?: string
}

export interface FeatureComparisonProps extends HTMLAttributes<HTMLDivElement> {
  plans: readonly FeatureComparisonPlan[]
  groups: readonly FeatureComparisonGroup[]
  /** Visible table caption; also its accessible name. */
  caption?: ReactNode
  labels?: FeatureComparisonLabels
}

const defaultLabels: Required<FeatureComparisonLabels> = {
  feature: "Feature",
  included: "Included",
  excluded: "Not included",
}

const Check = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Plan-by-feature matrix with grouped rows, a sticky header and a highlighted column. */
export const FeatureComparison = forwardRef<HTMLDivElement, FeatureComparisonProps>(
  ({ plans, groups, caption, labels, className, ...props }, ref) => {
    const text = { ...defaultLabels, ...labels }
    return (
      <div ref={ref} className={cx(
          "kg-feature-comparison w-full overflow-x-auto rounded-kg-xl border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-sm",
          className,
        )} {...props}>
        <table className="kg-feature-comparison__table w-full min-w-[32rem] border-separate border-spacing-0 text-kg-sm">
          {caption != null && (
            <caption className="kg-feature-comparison__caption px-5 pt-4 text-start text-kg-md font-semibold">{caption}</caption>
          )}
          <thead>
            <tr>
              <th scope="col" className="kg-feature-comparison__corner sticky top-0 z-1 border-b-2 border-kg-ink bg-kg-surface px-3 py-4 font-semibold">
                <span className="kg-visually-hidden">{text.feature}</span>
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  scope="col"
                  className="kg-feature-comparison__plan sticky top-0 z-1 border-b-2 border-kg-ink bg-kg-surface px-3 py-4 font-semibold text-center data-highlighted:bg-kg-paper-sage"
                  data-highlighted={plan.highlighted || undefined}
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group, groupIndex) => (
            <tbody key={groupIndex}>
              {group.label != null && (
                <tr className="kg-feature-comparison__group">
                  <th
                    scope="colgroup"
                    colSpan={plans.length + 1}
                    className="kg-feature-comparison__group-label px-5 pt-5 pb-2 text-start text-kg-xs font-semibold tracking-[0.06em] uppercase text-kg-fg-muted"
                  >
                    {group.label}
                  </th>
                </tr>
              )}
              {group.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="kg-feature-comparison__row group/row">
                  <th scope="row" className="kg-feature-comparison__feature border-t border-kg-border px-5 py-3 text-start font-medium text-kg-fg-muted group-hover/row:bg-kg-muted">
                    {row.label}
                  </th>
                  {plans.map((plan) => {
                    const value = row.values[plan.id]
                    return (
                      <td
                        key={plan.id}
                        className="kg-feature-comparison__cell border-t border-kg-border p-3 text-center tabular-nums data-highlighted:bg-kg-paper-sage not-data-highlighted:group-hover/row:bg-kg-muted"
                        data-highlighted={plan.highlighted || undefined}
                      >
                        {value === true ? (
                          <span className="kg-feature-comparison__yes inline-grid size-[1.3rem] place-items-center rounded-full bg-kg-accent text-kg-accent-fg [&_svg]:size-[0.8rem]">
                            <Check />
                            <span className="kg-visually-hidden">{text.included}</span>
                          </span>
                        ) : value === false || value == null ? (
                          <span className="kg-feature-comparison__no text-kg-fg-faint">
                            <span aria-hidden="true">-</span>
                            <span className="kg-visually-hidden">{text.excluded}</span>
                          </span>
                        ) : (
                          value
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    )
  },
)

FeatureComparison.displayName = "FeatureComparison"
