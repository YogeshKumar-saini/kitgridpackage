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
import { type ChartTokens, withAlpha } from "./tokens.js"

export interface RadarChartSpec {
  /** One row per spoke: `xKey` names it, every series key holds a value. */
  data: ChartRow[]
  xKey: string
  series?: ChartSeriesInput[]
  format?: ChartFormat
  /** One ceiling for every spoke. Each spoke scales to its own largest value otherwise. */
  max?: number
  /** Washes each shape in its color. */
  filled?: boolean
  legend?: ChartLegend
}

export const radarChartOption = (
  { data, xKey, max, filled = true, ...spec }: RadarChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const series = resolveSeries(tokens, data, xKey, spec.series)
  const labels = data.map((row) => String(row[xKey] ?? ""))
  const legend = legendOption(tokens, spec.legend, series.length)
  const below = legend.show && legend.bottom !== undefined
  // EPSILON rather than 1, so a spoke of ratios still reaches its own rim.
  const ceilings = data.map(
    (row) =>
      max ??
      Math.max(...series.map((entry) => numberAt(row, entry.key) ?? 0), Number.EPSILON),
  )

  return {
    legend: { ...legend, data: series.map((entry) => entry.label) },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const hit = params as { name: string; value: number[]; color: string }
        return tooltipHtml(
          hit.name,
          labels.map((name, index) => ({
            name,
            value: format(hit.value[index] ?? 0),
          })),
        )
      },
    },
    radar: {
      indicator: labels.map((name, index) => ({ name, max: ceilings[index] })),
      shape: "polygon",
      radius: width > 0 && width < 420 ? "56%" : "68%",
      center: ["50%", legend.show ? (below ? "46%" : "55%") : "50%"],
      splitNumber: 4,
      axisName: { color: tokens.fgMuted, fontFamily: tokens.font, fontSize: 11 },
      axisLine: { lineStyle: { color: tokens.grid } },
      splitLine: { lineStyle: { color: tokens.grid } },
      splitArea: { show: false },
    },
    series: [
      {
        type: "radar",
        symbol: "circle",
        symbolSize: 5,
        emphasis: { focus: "self", lineStyle: { width: 2.5 } },
        blur: { lineStyle: { opacity: 0.2 }, areaStyle: { opacity: 0.08 } },
        data: series.map((entry) => ({
          name: entry.label,
          value: data.map((row) => numberAt(row, entry.key) ?? 0),
          lineStyle: {
            color: entry.color,
            width: 2,
            type: entry.dashed ? "dashed" : "solid",
          },
          itemStyle: {
            color: entry.color,
            borderColor: tokens.surface,
            borderWidth: 1,
          },
          areaStyle: filled ? { color: withAlpha(entry.color, 0.16) } : undefined,
        })),
      },
    ],
  } as EChartsOption
}

export interface RadarChartProps extends ChartCommonProps, RadarChartSpec {}

/** Profiles across several measures at once, one filled shape per series. */
export const RadarChart = specChart<RadarChartSpec>({
  name: "RadarChart",
  keys: ["data", "xKey", "series", "format", "max", "filled", "legend"],
  option: radarChartOption,
  table: (spec) =>
    tableOf(
      spec.data,
      spec.xKey,
      seriesEntries(spec.data, spec.xKey, spec.series),
      toFormatter(spec.format),
    ),
  isEmpty: (spec) => spec.data.length === 0,
  label: "Radar chart",
  height: 320,
})
