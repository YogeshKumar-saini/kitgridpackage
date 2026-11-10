"use client"

import { forwardRef, useCallback, useMemo } from "react"
import { Chart, type ChartCommonProps, useStableSpec } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import {
  axisParams,
  barFill,
  type ChartDatum,
  type ChartLegend,
  type ChartReference,
  type ChartRow,
  type ChartSeriesInput,
  categoryAxis,
  datumTable,
  legendOption,
  legendRoom,
  numberAt,
  referenceLine,
  resolveSeries,
  seriesEntries,
  sortData,
  tableOf,
  tooltipBase,
  tooltipHtml,
  valueAxis,
} from "./option-parts.js"
import { type ChartTokens, type ChartTone, colorOf, withAlpha } from "./tokens.js"

export type BarChartOrientation = "vertical" | "horizontal"
export type BarChartSort = "desc" | "asc" | "none"

const CAP = [6, 6, 2, 2]
const CAP_SIDEWAYS = [2, 6, 6, 2]
const ROW = 30

const valueLabel = (tokens: ChartTokens) => ({
  color: tokens.fgMuted,
  fontFamily: tokens.fontMono,
  fontSize: 11,
  distance: 6,
})

const shadowPointer = (tokens: ChartTokens) => ({
  type: "shadow" as const,
  shadowStyle: { color: withAlpha(tokens.fgFaint, 0.08) },
})

export interface BarChartSpec {
  data: ChartRow[]
  xKey: string
  series?: ChartSeriesInput[]
  format?: ChartFormat
  orientation?: BarChartOrientation
  /** Stacks the series in one bar; grouped side by side otherwise. */
  stacked?: boolean
  /** Prints each value at the end of its bar. */
  values?: boolean
  legend?: ChartLegend
  reference?: ChartReference
}

export const barChartOption = (
  {
    data,
    xKey,
    orientation = "vertical",
    stacked = false,
    values = false,
    ...spec
  }: BarChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const series = resolveSeries(tokens, data, xKey, spec.series)
  const labels = data.map((row) => String(row[xKey] ?? ""))
  const sideways = orientation === "horizontal"
  const legend = legendOption(tokens, spec.legend, series.length)
  const room = legendRoom(legend)
  const category = {
    ...categoryAxis(tokens, labels),
    ...(sideways ? { inverse: true } : {}),
  }
  const value = valueAxis(tokens, format, width)
  const totals = data.map((row) =>
    series.reduce((sum, entry) => sum + (numberAt(row, entry.key) ?? 0), 0),
  )

  return {
    grid: {
      left: 4,
      right: values && sideways ? 48 : 16,
      top: room.top + (values && !sideways ? 8 : 0),
      bottom: room.bottom,
      containLabel: true,
    },
    legend: { ...legend, data: series.map((entry) => entry.label) },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "axis",
      axisPointer: shadowPointer(tokens),
      formatter: (params: unknown) => {
        const hits = axisParams(params)
        const at = hits[0]?.dataIndex ?? -1
        const row = data[at]
        if (!row) return ""
        return tooltipHtml(
          labels[at] ?? "",
          hits.flatMap((hit) => {
            const entry = series[hit.seriesIndex]
            if (!entry) return []
            const amount = numberAt(row, entry.key)
            return [
              {
                name: entry.label,
                color: entry.color,
                value: amount === null ? "n/a" : format(amount),
              },
            ]
          }),
        )
      },
    },
    xAxis: sideways ? value : category,
    yAxis: sideways ? category : value,
    series: series.map((entry, index) => ({
      type: "bar",
      name: entry.label,
      color: entry.color,
      stack: stacked ? "total" : undefined,
      data: data.map((row) => numberAt(row, entry.key)),
      barMaxWidth: series.length > 2 && !stacked ? 18 : 28,
      barGap: "18%",
      barCategoryGap: "34%",
      itemStyle: {
        color: barFill(entry.color, sideways),
        borderRadius: stacked ? 2 : sideways ? CAP_SIDEWAYS : CAP,
      },
      label: {
        show: values && (!stacked || index === series.length - 1),
        position: sideways ? "right" : "top",
        ...valueLabel(tokens),
        formatter: (params: { value: number; dataIndex: number }) =>
          format(stacked ? (totals[params.dataIndex] ?? 0) : params.value),
      },
      emphasis: { focus: "series" },
      blur: { itemStyle: { opacity: 0.35 } },
      ...(index === 0
        ? referenceLine(tokens, spec.reference, sideways ? "xAxis" : "yAxis")
        : {}),
    })),
  } as EChartsOption
}

export interface RankedBarsSpec {
  data: ChartDatum[]
  format?: ChartFormat
  /** Rows shown, largest first. */
  limit?: number
  sort?: BarChartSort
  /** Prints each value at the end of its bar. */
  values?: boolean
  color?: ChartTone | string
  reference?: ChartReference
}

export const rankedBarsOption = (
  {
    data,
    limit = 10,
    sort = "desc",
    values = true,
    color,
    reference,
    ...spec
  }: RankedBarsSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const rows = sortData(data, sort).slice(0, limit)
  const fallback = colorOf(tokens, color)

  return {
    grid: {
      left: 4,
      right: values ? 56 : 16,
      top: reference?.label ? 24 : 8,
      bottom: 4,
      containLabel: true,
    },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const at = axisParams(params)[0]?.dataIndex ?? -1
        const row = rows[at]
        return row
          ? tooltipHtml(row.label, [{ name: "Value", value: format(row.value) }])
          : ""
      },
    },
    xAxis: valueAxis(tokens, format, width),
    yAxis: {
      ...categoryAxis(
        tokens,
        rows.map((row) => row.label),
      ),
      inverse: true,
      axisLine: { show: false },
      axisLabel: {
        ...categoryAxis(tokens, []).axisLabel,
        interval: 0,
        width: 140,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        name: "Value",
        color: fallback,
        data: rows.map((row) => ({
          value: row.value,
          itemStyle: {
            color: barFill(row.color ? colorOf(tokens, row.color) : fallback, true),
            borderRadius: CAP_SIDEWAYS,
          },
        })),
        barMaxWidth: 16,
        animationDelay: (index: number) => index * 28,
        label: {
          show: values,
          position: "right",
          ...valueLabel(tokens),
          formatter: (params: { value: number }) => format(params.value),
        },
        emphasis: { focus: "self" },
        blur: { itemStyle: { opacity: 0.35 } },
        ...referenceLine(tokens, reference, "xAxis"),
      },
    ],
  } as EChartsOption
}

export interface DivergingBarsSpec {
  /** Signed values: above zero runs right, below runs left. */
  data: ChartDatum[]
  format?: ChartFormat
  sort?: BarChartSort
  /** For measures where a fall is good, such as cost or churn. */
  invert?: boolean
  values?: boolean
  /** What the left end of the axis means, such as “Losing share”. */
  negativeLabel?: string
  positiveLabel?: string
}

export const divergingBarsOption = (
  {
    data,
    sort = "desc",
    invert = false,
    values = true,
    negativeLabel,
    positiveLabel,
    ...spec
  }: DivergingBarsSpec,
  tokens: ChartTokens,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const signed = (value: number) => `${value > 0 ? "+" : ""}${format(value)}`
  const rows = sortData(data, sort)
  // Symmetric around zero, with room past the widest bar for its label.
  const widest = Math.max(...rows.map((row) => Math.abs(row.value)))
  const reach = (widest > 0 ? widest : 1) * (values ? 1.3 : 1.05)
  const poles = Boolean(negativeLabel || positiveLabel)
  const tone = (value: number) =>
    value >= 0 !== invert ? tokens.success : tokens.danger
  const pole = (text: string | undefined, side: "left" | "right") =>
    text
      ? [
          {
            type: "text",
            top: 0,
            [side]: 4,
            silent: true,
            style: {
              text: side === "left" ? `← ${text}` : `${text} →`,
              fill: tokens.fgFaint,
              font: `11px ${tokens.font}`,
            },
          },
        ]
      : []

  return {
    grid: { left: 4, right: 4, top: poles ? 28 : 8, bottom: 4, containLabel: true },
    graphic: [...pole(negativeLabel, "left"), ...pole(positiveLabel, "right")],
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const at = axisParams(params)[0]?.dataIndex ?? -1
        const row = rows[at]
        return row
          ? tooltipHtml(row.label, [
              { name: "Change", color: tone(row.value), value: signed(row.value) },
            ])
          : ""
      },
    },
    xAxis: {
      type: "value",
      min: -reach,
      max: reach,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      ...categoryAxis(
        tokens,
        rows.map((row) => row.label),
      ),
      inverse: true,
      axisLine: { show: false },
      axisLabel: {
        ...categoryAxis(tokens, []).axisLabel,
        interval: 0,
        width: 140,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        name: "Change",
        data: rows.map((row) => {
          const color = row.color ? colorOf(tokens, row.color) : tone(row.value)
          return {
            value: row.value,
            itemStyle: {
              color: barFill(color, row.value >= 0),
              borderRadius: row.value >= 0 ? CAP_SIDEWAYS : [6, 2, 2, 6],
            },
            label: {
              show: values,
              position: row.value >= 0 ? "right" : "left",
              ...valueLabel(tokens),
              formatter: () => signed(row.value),
            },
          }
        }),
        barMaxWidth: 14,
        emphasis: { focus: "self" },
        blur: { itemStyle: { opacity: 0.35 } },
        markLine: {
          silent: true,
          symbol: "none",
          animation: false,
          label: { show: false },
          lineStyle: { color: tokens.border, type: "solid", width: 1 },
          data: [{ xAxis: 0 }],
        },
      },
    ],
  } as EChartsOption
}

export interface BarChartProps extends ChartCommonProps, BarChartSpec {}
export interface RankedBarsProps extends ChartCommonProps, RankedBarsSpec {}
export interface DivergingBarsProps extends ChartCommonProps, DivergingBarsSpec {}

/** Columns or rows per category, grouped or stacked. */
export const BarChart = forwardRef<HTMLDivElement, BarChartProps>(
  (
    {
      data,
      xKey,
      series,
      format,
      orientation,
      stacked,
      values,
      legend,
      reference,
      label = "Bar chart",
      summary = true,
      empty = "No data to plot",
      ...props
    },
    ref,
  ) => {
    const spec = useStableSpec(
      { data, xKey, series, format, orientation, stacked, values, legend, reference },
      format,
    )
    const option = useCallback(
      (tokens: ChartTokens, width: number) => barChartOption(spec, tokens, width),
      [spec],
    )
    const table = useMemo(
      () =>
        summary
          ? tableOf(
              spec.data,
              spec.xKey,
              seriesEntries(spec.data, spec.xKey, spec.series),
              toFormatter(spec.format),
            )
          : undefined,
      [summary, spec],
    )
    return (
      <Chart
        ref={ref}
        option={option}
        label={label}
        summary={table}
        empty={data.length === 0 ? empty : undefined}
        {...props}
      />
    )
  },
)

BarChart.displayName = "BarChart"

/** Which is biggest: sorted rows with values printed, against an optional reference. */
export const RankedBars = forwardRef<HTMLDivElement, RankedBarsProps>(
  (
    {
      data,
      format,
      limit = 10,
      sort,
      values,
      color,
      reference,
      height,
      label = "Ranked bars",
      summary = true,
      empty = "No data to plot",
      ...props
    },
    ref,
  ) => {
    const spec = useStableSpec(
      { data, format, limit, sort, values, color, reference },
      format,
    )
    const option = useCallback(
      (tokens: ChartTokens, width: number) => rankedBarsOption(spec, tokens, width),
      [spec],
    )
    const table = useMemo(
      () =>
        summary
          ? datumTable(
              sortData(spec.data, spec.sort ?? "desc").slice(0, limit),
              toFormatter(spec.format),
            )
          : undefined,
      [summary, spec, limit],
    )
    const rows = Math.min(data.length, limit)
    return (
      <Chart
        ref={ref}
        option={option}
        label={label}
        height={height ?? Math.max(rows * ROW + 48, 160)}
        summary={table}
        empty={data.length === 0 ? empty : undefined}
        {...props}
      />
    )
  },
)

RankedBars.displayName = "RankedBars"

/** How far each row sits above or below zero, toned by whether that is good. */
export const DivergingBars = forwardRef<HTMLDivElement, DivergingBarsProps>(
  (
    {
      data,
      format,
      sort,
      invert,
      values,
      negativeLabel,
      positiveLabel,
      height,
      label = "Diverging bars",
      summary = true,
      empty = "No data to plot",
      ...props
    },
    ref,
  ) => {
    const spec = useStableSpec(
      { data, format, sort, invert, values, negativeLabel, positiveLabel },
      format,
    )
    const option = useCallback(
      (tokens: ChartTokens) => divergingBarsOption(spec, tokens),
      [spec],
    )
    const table = useMemo(
      () =>
        summary
          ? datumTable(
              sortData(spec.data, spec.sort ?? "desc"),
              toFormatter(spec.format),
            )
          : undefined,
      [summary, spec],
    )
    const poles = negativeLabel || positiveLabel ? 24 : 0
    return (
      <Chart
        ref={ref}
        option={option}
        label={label}
        height={height ?? Math.max(data.length * ROW + 24 + poles, 140)}
        summary={table}
        empty={data.length === 0 ? empty : undefined}
        {...props}
      />
    )
  },
)

DivergingBars.displayName = "DivergingBars"
