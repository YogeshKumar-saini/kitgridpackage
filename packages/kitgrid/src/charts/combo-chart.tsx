"use client"

import { forwardRef, useCallback, useMemo } from "react"
import { Chart, type ChartCommonProps, useStableSpec } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import type { LineChartCurve } from "./line-chart.js"
import {
  axisParams,
  barFill,
  type ChartLegend,
  type ChartRow,
  type ChartSeriesInput,
  categoryAxis,
  lastPointMark,
  legendOption,
  legendRoom,
  numberAt,
  resolveSeries,
  seriesEntries,
  tableOf,
  tooltipBase,
  tooltipHtml,
  valueAxis,
} from "./option-parts.js"
import { type ChartTokens, withAlpha } from "./tokens.js"

export interface ComboChartSpec {
  data: ChartRow[]
  xKey: string
  /** Fields drawn as columns, on the left axis. */
  bars: ChartSeriesInput[]
  /** Fields drawn as lines, on the right axis when `dualAxis` is on. */
  lines: ChartSeriesInput[]
  /** Formats the bars and the left axis. */
  format?: ChartFormat
  /** Formats the lines and the right axis. Defaults to `format`. */
  lineFormat?: ChartFormat
  dualAxis?: boolean
  stacked?: boolean
  curve?: LineChartCurve
  legend?: ChartLegend
}

export const comboChartOption = (
  {
    data,
    xKey,
    dualAxis = true,
    stacked = false,
    curve = "smooth",
    ...spec
  }: ComboChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const lineFormat =
    spec.lineFormat === undefined ? format : toFormatter(spec.lineFormat)
  const bars = resolveSeries(tokens, data, xKey, spec.bars)
  const lines = resolveSeries(tokens, data, xKey, spec.lines, bars.length)
  const all = [...bars, ...lines]
  const labels = data.map((row) => String(row[xKey] ?? ""))
  const legend = legendOption(tokens, spec.legend, all.length)
  const room = legendRoom(legend)
  const right = dualAxis && lines.length > 0

  return {
    grid: {
      left: 4,
      right: right ? 4 : 16,
      top: room.top,
      bottom: room.bottom,
      containLabel: true,
    },
    legend: { ...legend, data: all.map((entry) => entry.label) },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "axis",
      axisPointer: {
        type: "shadow",
        shadowStyle: { color: withAlpha(tokens.fgFaint, 0.08) },
      },
      formatter: (params: unknown) => {
        const hits = axisParams(params)
        const at = hits[0]?.dataIndex ?? -1
        const row = data[at]
        if (!row) return ""
        return tooltipHtml(
          labels[at] ?? "",
          hits.flatMap((hit) => {
            const entry = all[hit.seriesIndex]
            if (!entry) return []
            const value = numberAt(row, entry.key)
            const print = hit.seriesIndex < bars.length ? format : lineFormat
            return [
              {
                name: entry.label,
                color: entry.color,
                value: value === null ? "n/a" : print(value),
              },
            ]
          }),
        )
      },
    },
    xAxis: categoryAxis(tokens, labels),
    yAxis: [
      valueAxis(tokens, format, width),
      ...(right
        ? [{ ...valueAxis(tokens, lineFormat, width), splitLine: { show: false } }]
        : []),
    ],
    series: [
      ...bars.map((entry) => ({
        type: "bar",
        name: entry.label,
        color: entry.color,
        stack: stacked ? "bars" : undefined,
        data: data.map((row) => numberAt(row, entry.key)),
        barMaxWidth: 24,
        barGap: "18%",
        itemStyle: {
          color: barFill(entry.color),
          borderRadius: stacked ? 2 : [6, 6, 2, 2],
        },
        emphasis: { focus: "series" },
        blur: { itemStyle: { opacity: 0.35 } },
      })),
      ...lines.map((entry) => {
        const values = data.map((row) => numberAt(row, entry.key))
        return {
          type: "line",
          name: entry.label,
          color: entry.color,
          yAxisIndex: right ? 1 : 0,
          data: values,
          smooth: curve === "smooth" ? 0.35 : false,
          smoothMonotone: "x",
          step: curve === "step" ? "middle" : false,
          showSymbol: false,
          symbol: "circle",
          symbolSize: 6,
          z: 3,
          lineStyle: {
            width: 2,
            color: entry.color,
            type: entry.dashed ? "dashed" : "solid",
            cap: "round",
            join: "round",
          },
          itemStyle: {
            color: entry.color,
            borderColor: tokens.surface,
            borderWidth: 1.5,
          },
          emphasis: { focus: "series" },
          ...lastPointMark(tokens, entry.color, values),
        }
      }),
    ],
  } as EChartsOption
}

export interface ComboChartProps extends ChartCommonProps, ComboChartSpec {}

/** Columns for one measure, lines for another, each on its own axis. */
export const ComboChart = forwardRef<HTMLDivElement, ComboChartProps>(
  (
    {
      data,
      xKey,
      bars,
      lines,
      format,
      lineFormat,
      dualAxis,
      stacked,
      curve,
      legend,
      label = "Combo chart",
      summary = true,
      empty = "No data to plot",
      ...props
    },
    ref,
  ) => {
    const spec = useStableSpec(
      { data, xKey, bars, lines, format, lineFormat, dualAxis, stacked, curve, legend },
      format,
      lineFormat,
    )
    const option = useCallback(
      (tokens: ChartTokens, width: number) => comboChartOption(spec, tokens, width),
      [spec],
    )
    const table = useMemo(() => {
      if (!summary) return undefined
      const barEntries = seriesEntries(spec.data, spec.xKey, spec.bars)
      const lineEntries = seriesEntries(spec.data, spec.xKey, spec.lines)
      const barTable = tableOf(
        spec.data,
        spec.xKey,
        barEntries,
        toFormatter(spec.format),
      )
      const lineTable = tableOf(
        spec.data,
        spec.xKey,
        lineEntries,
        toFormatter(spec.lineFormat ?? spec.format),
      )
      return {
        columns: [...barTable.columns, ...lineTable.columns.slice(1)],
        rows: barTable.rows.map((row, index) => [
          ...row,
          ...(lineTable.rows[index] ?? []).slice(1),
        ]),
      }
    }, [summary, spec])
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

ComboChart.displayName = "ComboChart"
