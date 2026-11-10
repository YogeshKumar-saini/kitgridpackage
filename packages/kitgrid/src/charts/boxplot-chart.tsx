"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import { categoryAxis, tooltipBase, tooltipHtml, valueAxis } from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, type ChartTone, colorOf, withAlpha } from "./tokens.js"

export interface BoxplotChartGroup {
  label: string
  /** Raw observations; the five-number summary is computed from them. */
  values: number[]
  color?: ChartTone | string
}

export interface BoxplotChartSpec {
  data: BoxplotChartGroup[]
  format?: ChartFormat
  orientation?: "vertical" | "horizontal"
  /** Draws points past the whiskers. On by default. */
  outliers?: boolean
}

export interface BoxplotChartStats {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  /** Observations beyond 1.5 × IQR from the box. */
  outliers: number[]
}

const quantile = (sorted: readonly number[], p: number): number => {
  if (sorted.length === 0) return 0
  const at = (sorted.length - 1) * p
  const low = Math.floor(at)
  const high = Math.ceil(at)
  const a = sorted[low] ?? 0
  const b = sorted[high] ?? a
  return a + (b - a) * (at - low)
}

/** Tukey's box: quartiles by linear interpolation, whiskers at the last point within 1.5 × IQR. */
export const boxplotStats = (values: readonly number[]): BoxplotChartStats => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const reach = (q3 - q1) * 1.5
  const inside = sorted.filter((value) => value >= q1 - reach && value <= q3 + reach)
  return {
    min: inside[0] ?? 0,
    q1,
    median: quantile(sorted, 0.5),
    q3,
    max: inside[inside.length - 1] ?? 0,
    outliers: sorted.filter((value) => value < q1 - reach || value > q3 + reach),
  }
}

export const boxplotChartOption = (
  { data, orientation = "vertical", outliers = true, ...spec }: BoxplotChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const stats = data.map((group) => boxplotStats(group.values))
  const sideways = orientation === "horizontal"
  const category = {
    ...categoryAxis(
      tokens,
      data.map((group) => group.label),
    ),
    ...(sideways ? { inverse: true, axisLine: { show: false } } : {}),
  }
  const value = valueAxis(tokens, format, width)

  return {
    grid: { left: 4, right: 16, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const hit = params as { dataIndex: number; seriesType: string; value: number[] }
        const group = data[hit.dataIndex]
        const box = stats[hit.dataIndex]
        if (hit.seriesType === "scatter") {
          const point = hit.value[sideways ? 0 : 1] ?? 0
          const owner = data[hit.value[sideways ? 1 : 0] ?? -1]
          return tooltipHtml(owner?.label ?? "", [
            { name: "Outlier", color: tokens.danger, value: format(point) },
          ])
        }
        if (!group || !box) return ""
        return tooltipHtml(group.label, [
          { name: "Max", value: format(box.max) },
          { name: "Q3", value: format(box.q3) },
          { name: "Median", value: format(box.median) },
          { name: "Q1", value: format(box.q1) },
          { name: "Min", value: format(box.min) },
          { name: "Count", value: String(group.values.length) },
        ])
      },
    },
    xAxis: sideways ? value : category,
    yAxis: sideways ? category : value,
    series: [
      {
        type: "boxplot",
        name: "Distribution",
        layout: sideways ? "horizontal" : "vertical",
        boxWidth: [8, 36],
        data: stats.map((box, index) => {
          const color = colorOf(tokens, data[index]?.color, 0)
          return {
            value: [box.min, box.q1, box.median, box.q3, box.max],
            itemStyle: {
              color: withAlpha(color, 0.2),
              borderColor: color,
              borderWidth: 1.5,
            },
          }
        }),
        emphasis: { itemStyle: { borderWidth: 2 } },
      },
      ...(outliers
        ? [
            {
              type: "scatter",
              name: "Outliers",
              symbolSize: 6,
              itemStyle: {
                color: tokens.surface,
                borderColor: tokens.fgMuted,
                borderWidth: 1.5,
              },
              data: stats.flatMap((box, index) =>
                box.outliers.map((point) => (sideways ? [point, index] : [index, point])),
              ),
            },
          ]
        : []),
    ],
  } as EChartsOption
}

export interface BoxplotChartProps extends ChartCommonProps, BoxplotChartSpec {}

/** Spread, centre and outliers of each group at a glance, from raw observations. */
export const BoxplotChart = specChart<BoxplotChartSpec>({
  name: "BoxplotChart",
  keys: ["data", "format", "orientation", "outliers"],
  option: boxplotChartOption,
  table: (spec) => {
    const print = toFormatter(spec.format)
    return {
      columns: ["Group", "Min", "Q1", "Median", "Q3", "Max", "Outliers"],
      rows: spec.data.map((group) => {
        const box = boxplotStats(group.values)
        return [
          group.label,
          print(box.min),
          print(box.q1),
          print(box.median),
          print(box.q3),
          print(box.max),
          box.outliers.length,
        ]
      }),
    }
  },
  isEmpty: (spec) => spec.data.every((group) => group.values.length === 0),
  label: "Box plot",
  height: 320,
})
