"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import {
  type ChartLegend,
  type ChartRow,
  type ChartSeriesInput,
  legendOption,
  numberAt,
  resolveSeries,
  seriesEntries,
  tableOf,
  tooltipBase,
  tooltipHtml,
} from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import type { ChartTokens } from "./tokens.js"

export interface ThemeRiverChartSpec {
  /** One row per moment. `xKey` holds an ISO date, a timestamp, or a plain number. */
  data: ChartRow[]
  xKey: string
  series?: ChartSeriesInput[]
  format?: ChartFormat
  legend?: ChartLegend
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const isTime = (data: readonly ChartRow[], xKey: string) =>
  typeof data[0]?.[xKey] === "string"

const dateLabel = (value: number) => {
  const date = new Date(value)
  return `${MONTHS[date.getUTCMonth()] ?? ""} ${date.getUTCDate()}`
}

export const themeRiverChartOption = (
  { data, xKey, ...spec }: ThemeRiverChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const series = resolveSeries(tokens, data, xKey, spec.series)
  const legend = legendOption(tokens, spec.legend, series.length)
  const time = isTime(data, xKey)
  const below = legend.show && legend.bottom !== undefined
  const stamp = (row: ChartRow) => {
    const raw = row[xKey]
    return time ? Date.parse(String(raw)) : Number(raw)
  }
  const tickText = (value: number) => (time ? dateLabel(value) : format(value))
  const most = width > 0 && width < 420 ? 3 : 6
  // A time axis adds its own month-boundary ticks that crowd the weekly ones, so labels sit on
  // evenly spaced data points instead.
  const stamps = time ? data.map(stamp).filter(Number.isFinite) : []
  const every = Math.max(1, Math.ceil(stamps.length / most))
  const ticks = stamps.filter((_, index) => index % every === 0)

  return {
    color: series.map((entry) => entry.color),
    legend: { ...legend, data: series.map((entry) => entry.label) },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: tokens.border } },
      formatter: (params: unknown) => {
        const hits = Array.isArray(params) ? (params as { value: unknown[] }[]) : []
        const at = Number(hits[0]?.value?.[0])
        const row = data.find((entry) => stamp(entry) === at) ?? data[0]
        if (!row) return ""
        return tooltipHtml(
          time ? String(row[xKey] ?? "") : tickText(at),
          series.map((entry) => ({
            name: entry.label,
            color: entry.color,
            value: format(numberAt(row, entry.key) ?? 0),
          })),
        )
      },
    },
    singleAxis: {
      type: time ? "time" : "value",
      top: legend.show && !below ? 40 : 12,
      bottom: below ? 52 : 28,
      left: 8,
      right: 8,
      min: "dataMin",
      max: "dataMax",
      splitNumber: most,
      axisTick: { show: false, ...(time ? { customValues: ticks } : {}) },
      axisLine: { lineStyle: { color: tokens.border } },
      axisLabel: {
        ...(time ? { customValues: ticks } : {}),
        alignMinLabel: "left",
        alignMaxLabel: "right",
        color: tokens.fgFaint,
        fontFamily: tokens.fontMono,
        fontSize: 11,
        hideOverlap: true,
        formatter: (value: number) => tickText(value),
      },
      splitLine: { show: true, lineStyle: { color: tokens.grid, type: "dashed" } },
    },
    series: [
      {
        type: "themeRiver",
        boundaryGap: ["8%", "8%"],
        emphasis: { focus: "self" },
        blur: { itemStyle: { opacity: 0.25 } },
        itemStyle: { borderColor: tokens.surface, borderWidth: 0.5 },
        label: { show: false },
        data: data.flatMap((row) =>
          series.map((entry) => [stamp(row), numberAt(row, entry.key) ?? 0, entry.label]),
        ),
      },
    ],
  } as EChartsOption
}

export interface ThemeRiverChartProps extends ChartCommonProps, ThemeRiverChartSpec {}

/** A streamgraph: stacked flows around a centre line, so each theme's swell and fade reads as shape. */
export const ThemeRiverChart = specChart<ThemeRiverChartSpec>({
  name: "ThemeRiverChart",
  keys: ["data", "xKey", "series", "format", "legend"],
  option: themeRiverChartOption,
  table: (spec) =>
    tableOf(
      spec.data,
      spec.xKey,
      seriesEntries(spec.data, spec.xKey, spec.series),
      toFormatter(spec.format),
    ),
  isEmpty: (spec) => spec.data.length === 0,
  label: "Streamgraph",
  height: 320,
})
