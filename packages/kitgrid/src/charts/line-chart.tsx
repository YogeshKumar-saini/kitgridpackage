"use client"

import { forwardRef, useCallback, useMemo } from "react"
import { Chart, type ChartCommonProps, useStableSpec } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import {
  areaFade,
  axisParams,
  type ChartLegend,
  type ChartReference,
  type ChartRow,
  type ChartSeriesInput,
  categoryAxis,
  lastPointMark,
  legendOption,
  legendRoom,
  numberAt,
  referenceLine,
  resolveSeries,
  seriesEntries,
  tableOf,
  tooltipBase,
  tooltipHtml,
  valueAxis,
} from "./option-parts.js"
import { type ChartTokens, withAlpha } from "./tokens.js"

export type LineChartCurve = "linear" | "smooth" | "step"
export type AreaChartMode = "stacked" | "overlap" | "percent" | "stream"

export interface LineChartSpec {
  data: ChartRow[]
  /** The field that labels the category axis. */
  xKey: string
  /** Fields to plot. Every numeric field but `xKey` when omitted. */
  series?: ChartSeriesInput[]
  format?: ChartFormat
  curve?: LineChartCurve
  /** Fills under each line. */
  area?: boolean
  stacked?: boolean
  /** Draws a dot on every point, not only the latest. */
  points?: boolean
  legend?: ChartLegend
  reference?: ChartReference
}

export interface AreaChartSpec extends Omit<LineChartSpec, "area" | "stacked"> {
  /** `percent` stacks to 100%; `stream` stacks around a centre line. */
  mode?: AreaChartMode
}

interface TrendSpec extends Omit<LineChartSpec, "stacked"> {
  mode: AreaChartMode | "none"
}

const trendOption = (
  spec: TrendSpec,
  tokens: ChartTokens,
  width: number,
): EChartsOption => {
  const { data, xKey, mode, curve = "linear", area = false } = spec
  const format = toFormatter(spec.format)
  const series = resolveSeries(tokens, data, xKey, spec.series)
  const labels = data.map((row) => String(row[xKey] ?? ""))
  const stacked = mode === "stacked" || mode === "percent" || mode === "stream"
  const totals = data.map((row) =>
    series.reduce((sum, entry) => sum + (numberAt(row, entry.key) ?? 0), 0),
  )
  const share = (value: number, index: number) => {
    const total = totals[index] ?? 0
    return total === 0 ? 0 : value / total
  }
  const legend = legendOption(tokens, spec.legend, series.length)
  const room = legendRoom(legend)
  const smooth = curve === "smooth" ? 0.35 : false
  const step = curve === "step" ? ("middle" as const) : false
  // A stream is a stack resting on an invisible base at minus half the total.
  const base = mode === "stream" ? 1 : 0

  const lines = series.map((entry, index) => {
    const values = data.map((row, at) => {
      const value = numberAt(row, entry.key)
      if (value === null) return null
      return mode === "percent" ? share(value, at) : value
    })
    return {
      type: "line" as const,
      name: entry.label,
      color: entry.color,
      data: values,
      smooth,
      smoothMonotone: "x" as const,
      step,
      stack: stacked ? "total" : undefined,
      showSymbol: spec.points ?? false,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: {
        width: stacked ? 1.5 : 2,
        color: entry.color,
        type: entry.dashed ? ("dashed" as const) : ("solid" as const),
        cap: "round" as const,
        join: "round" as const,
      },
      itemStyle: { color: entry.color, borderColor: tokens.surface, borderWidth: 1.5 },
      ...(area
        ? {
            areaStyle: stacked
              ? { color: withAlpha(entry.color, 0.82), opacity: 1 }
              : { color: areaFade(entry.color), opacity: 1 },
          }
        : {}),
      emphasis: { focus: "series" as const },
      blur: { lineStyle: { opacity: 0.25 }, areaStyle: { opacity: 0.2 } },
      ...(index === 0 ? referenceLine(tokens, spec.reference, "yAxis") : {}),
      ...(!stacked && !entry.dashed ? lastPointMark(tokens, entry.color, values) : {}),
    }
  })

  const offset =
    mode === "stream"
      ? [
          {
            type: "line" as const,
            name: "",
            data: totals.map((total) => -total / 2),
            stack: "total",
            smooth,
            smoothMonotone: "x" as const,
            step,
            silent: true,
            showSymbol: false,
            lineStyle: { opacity: 0 },
            tooltip: { show: false },
          },
        ]
      : []

  const axis = valueAxis(
    tokens,
    mode === "percent" ? (v) => formatPercent(v, 0) : format,
    width,
  )

  return {
    grid: {
      left: 4,
      right: 16,
      top: room.top,
      bottom: room.bottom,
      containLabel: true,
    },
    legend: { ...legend, data: series.map((entry) => entry.label) },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: tokens.border, width: 1 } },
      formatter: (params: unknown) => {
        const hits = axisParams(params).filter((hit) => hit.seriesIndex >= base)
        const at = hits[0]?.dataIndex ?? -1
        const row = data[at]
        if (!row) return ""
        return tooltipHtml(
          labels[at] ?? "",
          hits.flatMap((hit) => {
            const entry = series[hit.seriesIndex - base]
            if (!entry) return []
            const value = numberAt(row, entry.key)
            const printed =
              value === null
                ? "n/a"
                : mode === "percent"
                  ? `${format(value)} (${formatPercent(share(value, at))})`
                  : format(value)
            return [{ name: entry.label, color: entry.color, value: printed }]
          }),
        )
      },
    },
    xAxis: { ...categoryAxis(tokens, labels), boundaryGap: false },
    yAxis:
      mode === "stream"
        ? { type: "value", show: false }
        : mode === "percent"
          ? { ...axis, max: 1 }
          : axis,
    series: [...offset, ...lines],
  } as EChartsOption
}

export const lineChartOption = (
  { stacked = false, ...spec }: LineChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption =>
  trendOption({ ...spec, mode: stacked ? "stacked" : "none" }, tokens, width)

export const areaChartOption = (
  { mode = "stacked", curve = "smooth", ...spec }: AreaChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption =>
  trendOption(
    { ...spec, curve, area: true, mode: mode === "overlap" ? "none" : mode },
    tokens,
    width,
  )

export interface LineChartProps extends ChartCommonProps, LineChartSpec {}
export interface AreaChartProps extends ChartCommonProps, AreaChartSpec {}

const useTable = (
  summary: boolean,
  data: ChartRow[],
  xKey: string,
  series: ChartSeriesInput[] | undefined,
  format: ChartFormat | undefined,
) =>
  useMemo(
    () =>
      summary
        ? tableOf(data, xKey, seriesEntries(data, xKey, series), toFormatter(format))
        : undefined,
    [summary, data, xKey, series, format],
  )

/** Lines over shared ticks: trends, comparisons, smooth or stepped, filled or not. */
export const LineChart = forwardRef<HTMLDivElement, LineChartProps>(
  (
    {
      data,
      xKey,
      series,
      format,
      curve,
      area,
      stacked,
      points,
      legend,
      reference,
      label = "Line chart",
      summary = true,
      empty = "No data to plot",
      ...props
    },
    ref,
  ) => {
    const spec = useStableSpec(
      { data, xKey, series, format, curve, area, stacked, points, legend, reference },
      format,
    )
    const option = useCallback(
      (tokens: ChartTokens, width: number) => lineChartOption(spec, tokens, width),
      [spec],
    )
    const table = useTable(summary, spec.data, spec.xKey, spec.series, spec.format)
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

LineChart.displayName = "LineChart"

/** Filled bands: stacked composition, overlap, share of 100%, or a stream. */
export const AreaChart = forwardRef<HTMLDivElement, AreaChartProps>(
  (
    {
      data,
      xKey,
      series,
      format,
      curve,
      mode,
      points,
      legend,
      reference,
      label = "Area chart",
      summary = true,
      empty = "No data to plot",
      ...props
    },
    ref,
  ) => {
    const spec = useStableSpec(
      { data, xKey, series, format, curve, mode, points, legend, reference },
      format,
    )
    const option = useCallback(
      (tokens: ChartTokens, width: number) => areaChartOption(spec, tokens, width),
      [spec],
    )
    const table = useTable(summary, spec.data, spec.xKey, spec.series, spec.format)
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

AreaChart.displayName = "AreaChart"
