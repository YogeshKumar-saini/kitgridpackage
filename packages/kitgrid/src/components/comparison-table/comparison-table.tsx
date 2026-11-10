import { Fragment, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export interface ComparisonTableColumn {
  key: string
  label: ReactNode
  /** Short line under the label, such as a price. */
  meta?: ReactNode
  /** Emphasises the column, e.g. a recommended plan. */
  highlight?: boolean
}

export type ComparisonTableValue = boolean | ReactNode

export interface ComparisonTableRow {
  feature: ReactNode
  /** Rows sharing a group render under one subheading. */
  group?: string
  values: Record<string, ComparisonTableValue>
}

export interface ComparisonTableLabels {
  included?: string
  excluded?: string
  feature?: string
}

export interface ComparisonTableProps extends HTMLAttributes<HTMLDivElement> {
  columns: ComparisonTableColumn[]
  rows: ComparisonTableRow[]
  /** Table caption, read first by screen readers. Visually hidden unless `showCaption`. */
  caption: string
  showCaption?: boolean
  labels?: ComparisonTableLabels
}

/* Paper Layers: an ink-edged sheet, ink hairlines between rows, the recommended column on sage. */
const cellBase = "border-b border-kg-ink/25 px-4 align-middle data-highlight:bg-kg-paper-sage"
const bodyCell = `${cellBase} [tbody>tr:last-child>&]:border-b-0`
const sr = "kg-comparison-table__sr sr-only"

const Check = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3.5 8.5l3 3 6-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const Dash = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M5 8h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

/** Features down, options across, with yes/no marks that read as words. Server-safe. */
export const ComparisonTable = forwardRef<HTMLDivElement, ComparisonTableProps>(
  ({ columns, rows, caption, showCaption = false, labels, className, ...props }, ref) => {
    const words = { included: "Included", excluded: "Not included", feature: "Feature", ...labels }
    const groups: { name: string | undefined; rows: ComparisonTableRow[] }[] = []
    for (const row of rows) {
      const last = groups[groups.length - 1]
      if (last && last.name === row.group) last.rows.push(row)
      else groups.push({ name: row.group, rows: [row] })
    }

    const cell = (value: ComparisonTableValue) => {
      if (value === true)
        return (
          <span
            className="kg-comparison-table__mark inline-grid size-[1.375rem] place-items-center rounded-full bg-kg-ink text-kg-surface [&_svg]:size-3.5"
            data-value="yes"
          >
            <Check />
            <span className={sr}>{words.included}</span>
          </span>
        )
      if (value === false || value == null)
        return (
          <span
            className="kg-comparison-table__mark inline-grid size-[1.375rem] place-items-center rounded-full text-kg-fg-muted [&_svg]:size-3.5"
            data-value="no"
          >
            <Dash />
            <span className={sr}>{words.excluded}</span>
          </span>
        )
      return value
    }

    return (
      <div ref={ref} className={cx(
          "kg-comparison-table max-w-full overflow-x-auto rounded-kg-xl border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-sm",
          className,
        )} {...props}>
        <table className="kg-comparison-table__table w-full min-w-max border-separate border-spacing-0 text-kg-base">
          <caption
            className={
              showCaption
                ? "kg-comparison-table__caption px-4 pt-3 text-start font-semibold caption-top"
                : sr
            }
          >
            {caption}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={`kg-comparison-table__corner sticky start-0 z-1 bg-kg-surface py-3 ${cellBase}`}>
                <span className={sr}>{words.feature}</span>
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  data-highlight={column.highlight || undefined}
                  className={`kg-comparison-table__column relative min-w-30 py-3 text-center ${cellBase} data-highlight:before:absolute data-highlight:before:inset-x-0 data-highlight:before:top-0 data-highlight:before:h-1 data-highlight:before:bg-kg-ink`}
                >
                  <span className="kg-comparison-table__column-label block font-bold text-kg-fg">{column.label}</span>
                  {column.meta != null && (
                    <span className={`kg-comparison-table__column-meta mt-0.5 block text-kg-xs font-normal ${column.highlight ? "text-kg-fg" : "text-kg-fg-muted"}`}>{column.meta}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group, groupIndex) => (
              <Fragment key={group.name ?? `group-${groupIndex}`}>
                {group.name && (
                  <tr className="kg-comparison-table__group">
                    <th
                      scope="colgroup"
                      colSpan={columns.length + 1}
                      className={`${bodyCell} bg-kg-surface-sunken py-2 text-start text-kg-xs font-semibold tracking-[0.04em] text-kg-fg-faint uppercase`}
                    >
                      {group.name}
                    </th>
                  </tr>
                )}
                {group.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <th scope="row" className={`kg-comparison-table__feature sticky start-0 z-1 bg-kg-surface py-3 text-start font-medium whitespace-nowrap text-kg-fg ${bodyCell}`}>
                      {row.feature}
                    </th>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        data-highlight={column.highlight || undefined}
                        className={`py-3 text-center ${bodyCell}`}
                      >
                        {cell(row.values[column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
)
ComparisonTable.displayName = "ComparisonTable"
