"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  useMemo,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { Checkbox } from "../checkbox/checkbox.js"

export type DataTableColumnType = "text" | "number" | "currency" | "percent" | "date"
export type DataTableAlign = "start" | "center" | "end"
export type DataTableDensity = "compact" | "default" | "comfortable"
export type DataTableSortDirection = "ascending" | "descending"

export interface DataTableSort {
  key: string
  direction: DataTableSortDirection
}

/**
 * A column. Everything but `value` and `cell` is plain data, so a column list can come from a
 * server, a saved view or JSON.
 */
export interface DataTableColumn<Row = Record<string, unknown>> {
  /** Identifies the column and, unless `value` is given, the field it reads. */
  key: string
  header: ReactNode
  /** Drives formatting, sorting and alignment. Numeric types align to the end. */
  type?: DataTableColumnType
  align?: DataTableAlign
  sortable?: boolean
  /** Any CSS width, e.g. `12rem` or `20%`. */
  width?: string
  /** Intl options for number, currency, percent and date columns. */
  format?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions
  /** ISO code for currency columns. Falls back to the table's `currency`. */
  currency?: string
  /** Marks the cell that names its row, rendered as a row header. */
  rowHeader?: boolean
  /** Reads the cell value when it is not `row[key]`. Used for sorting and formatting. */
  value?: (row: Row) => unknown
  /** Renders the cell. Receives the formatted text as a second argument. */
  cell?: (row: Row, formatted: string) => ReactNode
}

export interface DataTableLabels {
  selectAll?: string
  /** Names a row's checkbox. Receives the row key. */
  selectRow?: (key: string) => string
  /** Spoken after a sortable header to say what activating it does. */
  sortHint?: string
}

export interface DataTableProps<Row = Record<string, unknown>> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  columns: readonly DataTableColumn<Row>[]
  rows: readonly Row[]
  /** A field name or a function that returns a stable key per row. Defaults to `id`. */
  rowKey?: string | ((row: Row, index: number) => string)
  caption?: ReactNode
  /** Keep the caption for assistive tech only. */
  hideCaption?: boolean
  /** Make every column sortable unless a column says otherwise. */
  sortable?: boolean
  sort?: DataTableSort | null
  defaultSort?: DataTableSort | null
  onSortChange?: (sort: DataTableSort | null) => void
  /** Leave `rows` in the order given, for sorting on the server. */
  manualSort?: boolean
  density?: DataTableDensity
  zebra?: boolean
  stickyHeader?: boolean
  /** Caps the height and scrolls the body under a sticky header. Any CSS length. */
  maxHeight?: string
  selectable?: boolean
  selected?: string[]
  defaultSelected?: string[]
  onSelectedChange?: (keys: string[]) => void
  /** Shown in place of the body when there are no rows. */
  empty?: ReactNode
  locale?: string
  currency?: string
  labels?: DataTableLabels
}

const NUMERIC: ReadonlySet<DataTableColumnType> = new Set(["number", "currency", "percent"])

const readValue = <Row,>(row: Row, column: DataTableColumn<Row>): unknown =>
  column.value ? column.value(row) : (row as Record<string, unknown>)[column.key]

const toTime = (value: unknown) =>
  value instanceof Date
    ? value.getTime()
    : typeof value === "string" || typeof value === "number"
      ? new Date(value).getTime()
      : Number.NaN

const formatValue = (
  value: unknown,
  type: DataTableColumnType,
  format: DataTableColumn["format"],
  locale: string | undefined,
  currency: string,
): string => {
  if (value === null || value === undefined || value === "") return ""
  if (type === "date") {
    const time = toTime(value)
    return Number.isNaN(time)
      ? String(value)
      : new Intl.DateTimeFormat(locale, format ?? { dateStyle: "medium" }).format(time)
  }
  if (NUMERIC.has(type) && typeof value === "number") {
    const base: Intl.NumberFormatOptions =
      type === "currency"
        ? { style: "currency", currency }
        : type === "percent"
          ? { style: "percent", maximumFractionDigits: 1 }
          : {}
    return new Intl.NumberFormat(locale, { ...base, ...format }).format(value)
  }
  return String(value)
}

const compare = (a: unknown, b: unknown, type: DataTableColumnType, collator: Intl.Collator) => {
  if (type === "date") return toTime(a) - toTime(b)
  if (typeof a === "number" && typeof b === "number") return a - b
  return collator.compare(String(a), String(b))
}

const sortPath = "opacity-35 transition-opacity duration-(--kg-duration-fast) ease-kg-out"

const SortIcon = ({ direction }: { direction: DataTableSortDirection | undefined }) => (
  <svg
    className="kg-data-table__sort-icon size-[0.875rem] shrink-0"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    data-direction={direction}
  >
    <path
      className={cx(
        "kg-data-table__sort-up",
        direction === "ascending" ? "text-kg-accent-strong" : direction ? "opacity-0" : sortPath,
      )}
      d="m5 6.5 3-3 3 3"
    />
    <path
      className={cx(
        "kg-data-table__sort-down",
        direction === "descending" ? "text-kg-accent-strong" : direction ? "opacity-0" : sortPath,
      )}
      d="m5 9.5 3 3 3-3"
    />
  </svg>
)

const tableVariants = variants({
  base: [
    "kg-data-table relative min-w-0 rounded-kg-lg text-kg-fg overscroll-x-contain",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  ],
  variants: {
    density: {
      compact: "text-kg-sm [--_cell-x:calc(var(--kg-space)*2.5)] [--_cell-y:calc(var(--kg-space)*1.5)]",
      default: "text-kg-sm [--_cell-x:calc(var(--kg-space)*3)] [--_cell-y:calc(var(--kg-space)*2.5)]",
      comfortable: "text-kg-base [--_cell-x:calc(var(--kg-space)*4)] [--_cell-y:calc(var(--kg-space)*3.75)]",
    },
  },
})

const alignClass: Record<DataTableAlign, string> = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
}

/* Paper Layers: an ink rule under the head, hairlines between rows, sage for picked rows. */
const headCell =
  "px-(--_cell-x) py-[calc(var(--_cell-y)*0.8)] align-middle text-kg-xs font-[560] tracking-[0.01em] whitespace-nowrap text-kg-fg-muted bg-kg-surface border-b-2 border-kg-ink"
const stickyCell = "sticky top-0 z-1"
const bodyCell = "px-(--_cell-x) py-(--_cell-y) align-middle border-b border-kg-border"

const sortButton = [
  "kg-data-table__sort -mx-1.5 -my-1 inline-flex cursor-pointer items-center gap-1 rounded-kg-sm border-0 bg-transparent px-1.5 py-1 align-middle",
  "font-[inherit] tracking-[inherit] text-inherit transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "hover:bg-kg-muted hover:text-kg-fg data-active:text-kg-fg",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

const DataTableImpl = <Row,>(
  {
    columns,
    rows,
    rowKey = "id",
    caption,
    hideCaption = false,
    sortable = false,
    sort: sortProp,
    defaultSort = null,
    onSortChange,
    manualSort = false,
    density = "default",
    zebra = false,
    stickyHeader = false,
    maxHeight,
    selectable = false,
    selected: selectedProp,
    defaultSelected = [],
    onSelectedChange,
    empty,
    locale: localeProp,
    currency = "USD",
    labels,
    className,
    style,
    ...props
  }: DataTableProps<Row>,
  ref: Ref<HTMLDivElement>,
) => {
  const locale = useLocale(localeProp)
  const [sort, setSort] = useControllableState<DataTableSort | null>({
    value: sortProp,
    defaultValue: defaultSort,
    onChange: onSortChange,
  })
  const [selected, setSelected] = useControllableState<string[]>({
    value: selectedProp,
    defaultValue: defaultSelected,
    onChange: onSelectedChange,
  })

  const keyOf = (row: Row, index: number) =>
    typeof rowKey === "function"
      ? rowKey(row, index)
      : String((row as Record<string, unknown>)[rowKey] ?? index)

  const sorted = useMemo(() => {
    const keyed = rows.map((row, index) => ({ row, key: keyOf(row, index) }))
    const column = sort ? columns.find((c) => c.key === sort.key) : undefined
    if (!sort || !column || manualSort) return keyed
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" })
    const type = column.type ?? "text"
    const sign = sort.direction === "ascending" ? 1 : -1
    return keyed.sort((a, b) => {
      const x = readValue(a.row, column)
      const y = readValue(b.row, column)
      // Blanks always sink to the bottom, whichever way the column runs.
      const xBlank = x === null || x === undefined || x === ""
      const yBlank = y === null || y === undefined || y === ""
      if (xBlank || yBlank) return xBlank === yBlank ? 0 : xBlank ? 1 : -1
      return compare(x, y, type, collator) * sign
    })
    // rowKey stays out of the deps: it is usually an inline function, and keys follow rows.
  }, [rows, columns, sort, manualSort, locale])

  const keys = sorted.map((entry) => entry.key)
  const selectedSet = new Set(selected)
  const pickedCount = keys.filter((key) => selectedSet.has(key)).length
  const allPicked = keys.length > 0 && pickedCount === keys.length

  const cycleSort = (key: string) => {
    if (sort?.key !== key) setSort({ key, direction: "ascending" })
    else if (sort.direction === "ascending") setSort({ key, direction: "descending" })
    else setSort(null)
  }

  const toggleRow = (key: string, on: boolean) =>
    setSelected((current) =>
      on ? [...current.filter((k) => k !== key), key] : current.filter((k) => k !== key),
    )

  const toggleAll = (on: boolean) =>
    setSelected((current) =>
      on
        ? [...new Set([...current, ...keys])]
        : current.filter((key) => !keys.includes(key)),
    )

  const alignOf = (column: DataTableColumn<Row>) =>
    column.align ?? (NUMERIC.has(column.type ?? "text") ? "end" : "start")

  const span = columns.length + (selectable ? 1 : 0)
  const sticky = stickyHeader || Boolean(maxHeight)
  const head = cx(headCell, sticky && stickyCell)

  return (
    <div
      ref={ref}
      className={tableVariants({
        density,
        className: cx(
          // Sticky without its own height sticks to the page, so it must not be a scroller.
          sticky && !maxHeight ? "overflow-visible" : "overflow-auto",
          className,
        ),
      })}
      data-density={density}
      data-zebra={zebra || undefined}
      data-sticky={stickyHeader || maxHeight ? true : undefined}
      data-scroll={maxHeight ? true : undefined}
      style={maxHeight ? { ...style, maxHeight } : style}
      // A scroll box must be reachable by keyboard so its overflow can be read.
      tabIndex={maxHeight ? 0 : undefined}
      role={maxHeight ? "region" : undefined}
      aria-label={maxHeight && typeof caption === "string" ? caption : undefined}
      {...props}
    >
      <table className="kg-data-table__table w-full border-separate border-spacing-0 tabular-nums">
        {caption != null && (
          <caption
            className={cx(
              "kg-data-table__caption px-(--_cell-x) pt-0 pb-2.5 text-start text-kg-sm font-semibold text-kg-fg",
              hideCaption && "kg-visually-hidden",
            )}
          >
            {caption}
          </caption>
        )}
        <colgroup>
          {selectable && <col className="kg-data-table__select-col w-[2.75rem]" />}
          {columns.map((column) => (
            <col key={column.key} style={column.width ? { width: column.width } : undefined} />
          ))}
        </colgroup>
        <thead className="kg-data-table__head">
          <tr>
            {selectable && (
              <th scope="col" className={cx("kg-data-table__select text-start", head)}>
                <Checkbox
                  size="sm"
                  aria-label={labels?.selectAll ?? "Select all rows"}
                  checked={allPicked}
                  indeterminate={pickedCount > 0 && !allPicked}
                  disabled={keys.length === 0}
                  onCheckedChange={toggleAll}
                />
              </th>
            )}
            {columns.map((column) => {
              const canSort = column.sortable ?? sortable
              const active = sort?.key === column.key ? sort.direction : undefined
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cx("kg-data-table__th", head, alignClass[alignOf(column)])}
                  data-align={alignOf(column)}
                  aria-sort={canSort ? (active ?? "none") : undefined}
                >
                  {canSort ? (
                    <button
                      type="button"
                      className={cx(sortButton, alignOf(column) === "end" && "flex-row-reverse")}
                      data-active={active ? true : undefined}
                      onClick={() => cycleSort(column.key)}
                    >
                      <span>{column.header}</span>
                      <SortIcon direction={active} />
                      {labels?.sortHint && (
                        <span className="kg-visually-hidden">, {labels.sortHint}</span>
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="kg-data-table__body">
          {sorted.length === 0 ? (
            <tr className="kg-data-table__empty">
              <td colSpan={span} className="px-(--_cell-x) py-10 text-center text-kg-fg-muted">{empty ?? "No rows to show"}</td>
            </tr>
          ) : (
            sorted.map(({ row, key }) => {
              const picked = selectedSet.has(key)
              return (
                <tr
                  key={key}
                  className={cx(
                    "kg-data-table__row transition-colors duration-(--kg-duration-fast) ease-kg-out last:*:border-b-0",
                    picked
                      ? "bg-kg-paper-sage"
                      : cx(zebra && "even:bg-kg-muted/55", "hover:bg-kg-muted"),
                  )}
                  data-selected={picked || undefined}
                >
                  {selectable && (
                    <td className={cx("kg-data-table__select", bodyCell)}>
                      <Checkbox
                        size="sm"
                        aria-label={labels?.selectRow?.(key) ?? `Select row ${key}`}
                        checked={picked}
                        onCheckedChange={(on) => toggleRow(key, on)}
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const type = column.type ?? "text"
                    const text = formatValue(
                      readValue(row, column),
                      type,
                      column.format,
                      locale,
                      column.currency ?? currency,
                    )
                    const Cell = column.rowHeader ? "th" : "td"
                    return (
                      <Cell
                        key={column.key}
                        scope={column.rowHeader ? "row" : undefined}
                        className={cx(
                          "kg-data-table__td leading-[1.4]",
                          bodyCell,
                          alignClass[alignOf(column)],
                          column.rowHeader ? "font-[560] whitespace-nowrap" : "font-normal",
                          NUMERIC.has(type) && "whitespace-nowrap",
                        )}
                        data-align={alignOf(column)}
                        data-numeric={NUMERIC.has(type) || undefined}
                      >
                        {column.cell ? column.cell(row, text) : text}
                      </Cell>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

/**
 * A native table with sortable headers (`aria-sort`), optional row selection, sticky header,
 * three densities and zebra rows. Columns are plain data with optional render functions, and
 * sorting runs on the client unless `manualSort` is set.
 */
export const DataTable = forwardRef(DataTableImpl) as (<Row = Record<string, unknown>>(
  props: DataTableProps<Row> & { ref?: Ref<HTMLDivElement> },
) => ReactElement | null) & { displayName?: string }

DataTable.displayName = "DataTable"
