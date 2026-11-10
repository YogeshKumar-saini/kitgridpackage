"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import {
  axisParams,
  type ChartLegend,
  type ChartRow,
  type ChartSeriesInput,
  categoryAxis,
  legendOption,
  legendRoom,
  numberAt,
  resolveSeries,
  seriesEntries,
  tooltipBase,
  tooltipHtml,
  valueAxis,
} from "./option-parts.js"
import { inkOn, specChart } from "./spec-chart.js"
import { type ChartTokens, withAlpha } from "./tokens.js"

export interface StackedPercentBarSpec {
  data: ChartRow[]
  xKey: string
  series?: ChartSeriesInput[]
  /** How raw values print in the tooltip next to their share. */
  format?: ChartFormat
  orientation?: "horizontal" | "vertical"
  /** Prints each segment's share inside it when it is wide enough. On by default. */
  labels?: boolean
  legend?: ChartLegend
}

/** Each row's series as shares of that row's total, 0 to 1. */
export const percentRows = (
  data: readonly ChartRow[],
  keys: readonly string[],
): number[][] =>
  data.map((row) => {
    const values = keys.map((key) => Math.max(numberAt(row, key) ?? 0, 0))
    const total = values.reduce((sum, value) => sum + value, 0)
    return values.map((value) => (total > 0 ? value / total : 0))
  })

export const stackedPercentBarOption = (
  {
    data,
    xKey,
    orientation = "horizontal",
    labels = true,
    ...spec
  }: StackedPercentBarSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const series = resolveSeries(tokens, data, xKey, spec.series)
  const shares = percentRows(
    data,
    series.map((entry) => entry.key),
  )
  const legend = legendOption(tokens, spec.legend ?? "top", series.length)
  const sideways = orientation === "horizontal"
  const names = data.map((row) => String(row[xKey] ?? ""))
  const category = {
    ...categoryAxis(tokens, names),
    ...(sideways ? { inverse: true, axisLine: { show: false } } : {}),
  }
  const value = {
    ...valueAxis(tokens, (share) => formatPercent(share, 0), width),
    min: 0,
    max: 1,
    interval: 0.25,
  }

  return {
    legend: { ...legend, data: series.map((entry) => entry.label) },
    grid: { left: 4, right: 16, ...legendRoom(legend), containLabel: true },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "axis",
      axisPointer: {
        type: "shadow",
        shadowStyle: { color: withAlpha(tokens.fgFaint, 0.08) },
      },
      formatter: (params: unknown) => {
        const index = axisParams(params)[0]?.dataIndex ?? -1
        const row = data[index]
        if (!row) return ""
        return tooltipHtml(
          names[index] ?? "",
          series.map((entry, at) => {
            const raw = numberAt(row, entry.key)
            return {
              name: entry.label,
              color: entry.color,
              value: `${formatPercent(shares[index]?.[at] ?? 0)}${raw === null ? "" : `  ${format(raw)}`}`,
            }
          }),
        )
      },
    },
    xAxis: sideways ? value : category,
    yAxis: sideways ? category : value,
    series: series.map((entry, at) => ({
      type: "bar",
      name: entry.label,
      stack: "share",
      barMaxWidth: 28,
      color: entry.color,
      emphasis: { focus: "series" },
      blur: { itemStyle: { opacity: 0.3 } },
      itemStyle: { borderColor: tokens.surface, borderWidth: 1 },
      label: {
        show: labels,
        color: inkOn(tokens, entry.color),
        fontFamily: tokens.fontMono,
        fontSize: 10,
        formatter: (params: { value: number }) =>
          params.value >= 0.08 ? formatPercent(params.value, 0) : "",
      },
      data: shares.map((row) => row[at] ?? 0),
    })),
  } as EChartsOption
}

export interface StackedPercentBarProps extends ChartCommonProps, StackedPercentBarSpec {}

/** Composition across rows: every bar runs to 100%, so mix compares where totals differ. */
export const StackedPercentBar = specChart<StackedPercentBarSpec>({
  name: "StackedPercentBar",
  keys: ["data", "xKey", "series", "format", "orientation", "labels", "legend"],
  option: stackedPercentBarOption,
  table: (spec) => {
    const entries = seriesEntries(spec.data, spec.xKey, spec.series)
    const shares = percentRows(
      spec.data,
      entries.map((entry) => entry.key),
    )
    return {
      columns: [spec.xKey, ...entries.map((entry) => entry.label ?? entry.key)],
      rows: spec.data.map((row, index) => [
        String(row[spec.xKey] ?? ""),
        ...entries.map((_, at) => formatPercent(shares[index]?.[at] ?? 0)),
      ]),
    }
  },
  isEmpty: (spec) => spec.data.length === 0,
  label: "100% stacked bar chart",
  height: (spec) =>
    spec.orientation === "vertical" ? 300 : Math.max(spec.data.length * 40 + 60, 160),
})
