"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import {
  axisParams,
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

export interface RadialStackedChartSpec {
  /** One wedge per row, laid around the circle in order. */
  data: ChartRow[]
  xKey: string
  series?: ChartSeriesInput[]
  format?: ChartFormat
  legend?: ChartLegend
}

export const radialStackedChartOption = (
  { data, xKey, ...spec }: RadialStackedChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const series = resolveSeries(tokens, data, xKey, spec.series)
  const labels = data.map((row) => String(row[xKey] ?? ""))
  const legend = legendOption(tokens, spec.legend ?? "bottom", series.length)
  const below = legend.show && legend.bottom !== undefined
  const narrow = width > 0 && width < 480

  return {
    legend: { ...legend, ...(below ? { left: "center" } : {}), data: series.map((entry) => entry.label) },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const index = axisParams(params)[0]?.dataIndex ?? -1
        const row = data[index]
        if (!row) return ""
        const total = series.reduce((sum, entry) => sum + (numberAt(row, entry.key) ?? 0), 0)
        return tooltipHtml(labels[index] ?? "", [
          ...series.map((entry) => ({
            name: entry.label,
            color: entry.color,
            value: format(numberAt(row, entry.key) ?? 0),
          })),
          { name: "Total", value: format(total) },
        ])
      },
    },
    polar: {
      radius: ["20%", narrow ? "70%" : "78%"],
      center: ["50%", below ? "46%" : legend.show ? "54%" : "50%"],
    },
    angleAxis: {
      type: "category",
      data: labels,
      startAngle: 90,
      axisLine: { lineStyle: { color: tokens.border } },
      axisTick: { show: false },
      axisLabel: {
        color: tokens.fgMuted,
        fontFamily: tokens.font,
        fontSize: 11,
        interval: narrow && labels.length > 8 ? 1 : 0,
      },
      splitLine: { show: true, lineStyle: { color: tokens.grid, type: "dashed" } },
    },
    radiusAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitNumber: 3,
      splitLine: { lineStyle: { color: tokens.grid, type: "dashed" } },
    },
    series: series.map((entry) => ({
      type: "bar",
      name: entry.label,
      coordinateSystem: "polar",
      stack: "total",
      color: entry.color,
      barCategoryGap: "12%",
      itemStyle: { borderColor: tokens.surface, borderWidth: 1 },
      emphasis: { focus: "series" },
      blur: { itemStyle: { opacity: 0.3 } },
      data: data.map((row) => numberAt(row, entry.key) ?? 0),
    })),
  } as EChartsOption
}

export interface RadialStackedChartProps extends ChartCommonProps, RadialStackedChartSpec {}

/** Stacked columns wrapped around a circle: suited to cycles such as months or hours. */
export const RadialStackedChart = specChart<RadialStackedChartSpec>({
  name: "RadialStackedChart",
  keys: ["data", "xKey", "series", "format", "legend"],
  option: radialStackedChartOption,
  table: (spec) =>
    tableOf(
      spec.data,
      spec.xKey,
      seriesEntries(spec.data, spec.xKey, spec.series),
      toFormatter(spec.format),
    ),
  isEmpty: (spec) => spec.data.length === 0,
  label: "Radial stacked chart",
  height: 380,
})
