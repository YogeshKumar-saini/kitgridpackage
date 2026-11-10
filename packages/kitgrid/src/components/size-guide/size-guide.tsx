"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../dialog/dialog.js"
import { SegmentedControl } from "../segmented-control/segmented-control.js"

export type SizeGuideUnit = "cm" | "in"

export interface SizeGuideColumn {
  key: string
  label: string
}

/** A single value or a `[min, max]` range, always in centimetres. */
export type SizeGuideMeasure = number | readonly [number, number]

export interface SizeGuideRow {
  size: string
  values: Record<string, SizeGuideMeasure>
}

export interface SizeGuideTableProps extends HTMLAttributes<HTMLDivElement> {
  columns: readonly SizeGuideColumn[]
  rows: readonly SizeGuideRow[]
  unit?: SizeGuideUnit
  defaultUnit?: SizeGuideUnit
  onUnitChange?: (unit: SizeGuideUnit) => void
  /** Size to highlight, such as the shopper's usual or recommended size. */
  highlight?: string
  locale?: string
  labels?: { size?: string; unit?: string; caption?: string }
}

const CM_PER_IN = 2.54

const formatMeasure = (measure: SizeGuideMeasure, unit: SizeGuideUnit, locale: string) => {
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: unit === "in" ? 1 : 0 })
  const convert = (cm: number) => format.format(unit === "in" ? cm / CM_PER_IN : cm)
  return typeof measure === "number"
    ? convert(measure)
    : `${convert(measure[0])}-${convert(measure[1])}`
}

/** The measurement table on its own, with a cm / in switch. Use it inline or inside SizeGuide. */
export const SizeGuideTable = forwardRef<HTMLDivElement, SizeGuideTableProps>(
  (
    {
      columns,
      rows,
      unit: unitProp,
      defaultUnit = "cm",
      onUnitChange,
      highlight,
      locale: localeProp,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const locale = useLocale(localeProp)
    const [unit, setUnit] = useControllableState<SizeGuideUnit>({
      value: unitProp,
      defaultValue: defaultUnit,
      onChange: onUnitChange,
    })
    return (
      <div ref={ref} className={cx("kg-size-guide grid gap-3 text-kg-fg", className)} {...props}>
        <SegmentedControl<SizeGuideUnit>
          className="kg-size-guide__units justify-self-end"
          aria-label={labels?.unit ?? "Units"}
          size="sm"
          value={unit}
          onValueChange={setUnit}
          options={[
            { value: "cm", label: "cm" },
            { value: "in", label: "in" },
          ]}
        />
        <div className="kg-size-guide__scroll overflow-x-auto rounded-kg-lg border-2 border-kg-ink bg-kg-surface">
          <table className="kg-size-guide__table w-full border-collapse text-center text-kg-sm tabular-nums">
            <caption className="kg-visually-hidden">
              {labels?.caption ?? `Measurements in ${unit}`}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="kg-size-guide__heading px-3 py-2.5 whitespace-nowrap bg-kg-surface-sunken text-kg-xs font-semibold text-kg-fg-muted">
                  {labels?.size ?? "Size"}
                </th>
                {columns.map((column) => (
                  <th key={column.key} scope="col" className="kg-size-guide__heading px-3 py-2.5 whitespace-nowrap bg-kg-surface-sunken text-kg-xs font-semibold text-kg-fg-muted">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.size}
                  className="kg-size-guide__row group/row border-t border-kg-border transition-colors duration-(--kg-duration-fast) ease-kg-out not-data-highlighted:hover:bg-kg-muted data-highlighted:bg-kg-paper-sage"
                  data-highlighted={row.size === highlight || undefined}
                  aria-current={row.size === highlight ? "true" : undefined}
                >
                  <th
                    scope="row"
                    className="kg-size-guide__size px-3 py-2.5 whitespace-nowrap font-semibold group-data-highlighted/row:shadow-[inset_3px_0_0_var(--kg-ink)]"
                  >
                    {row.size}
                  </th>
                  {columns.map((column) => {
                    const measure = row.values[column.key]
                    return (
                      <td key={column.key} className="kg-size-guide__cell px-3 py-2.5 whitespace-nowrap">
                        {measure === undefined ? "" : formatMeasure(measure, unit, locale)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  },
)

SizeGuideTable.displayName = "SizeGuideTable"

export interface SizeGuideProps extends Omit<SizeGuideTableProps, "title"> {
  /** Dialog title. */
  title?: ReactNode
  /** Trigger content. Defaults to "Size guide" with a ruler icon. */
  trigger?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Rendered under the table, e.g. a how-to-measure illustration. */
  children?: ReactNode
}

const Ruler = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <path d="m3 15.5 12.5-12.5 5.5 5.5L8.5 21zM7 11.5l2 2M10 8.5l2 2M13 5.5l2 2" />
  </svg>
)

/** A "Size guide" link that opens the measurement table in a dialog. */
export const SizeGuide = forwardRef<HTMLDivElement, SizeGuideProps>(
  (
    { title = "Size guide", trigger, open, defaultOpen, onOpenChange, children, ...props },
    ref,
  ) => (
    <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DialogTrigger className="kg-size-guide__trigger inline-flex cursor-pointer items-center gap-[0.4em] rounded-kg-xs border-0 bg-transparent p-0 font-[inherit] text-kg-sm font-medium text-kg-fg underline decoration-kg-border-strong underline-offset-3 transition-[text-decoration-color] duration-(--kg-duration-fast) ease-kg-out hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring [&_svg]:size-4">
        {trigger ?? (
          <>
            <Ruler />
            {title}
          </>
        )}
      </DialogTrigger>
      <DialogContent size="md" closeButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <SizeGuideTable ref={ref} {...props} />
          {children}
        </DialogBody>
      </DialogContent>
    </Dialog>
  ),
)

SizeGuide.displayName = "SizeGuide"
