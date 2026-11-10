"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import { tooltipBase, tooltipHtml, valueAxis } from "./option-parts.js"
import { type CustomApi, type CustomParams, median, specChart } from "./spec-chart.js"
import { type ChartTokens, type ChartTone, colorOf, withAlpha } from "./tokens.js"

export interface HistogramChartBin {
  /** Inclusive lower edge. */
  x0: number
  /** Exclusive upper edge, inclusive for the last bin. */
  x1: number
  count: number
}

export interface HistogramChartSpec {
  /** Raw observations. */
  values: number[]
  /** Target bin count. Picked by the Freedman-Diaconis rule otherwise, then rounded to a nice step. */
  bins?: number
  format?: ChartFormat
  color?: ChartTone | string
  /** A dashed rule at the median. */
  showMedian?: boolean
}

const niceStep = (rough: number): number => {
  if (!(rough > 0)) return 1
  const power = 10 ** Math.floor(Math.log10(rough))
  const fraction = rough / power
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * power
}

const roughCount = (sorted: readonly number[]): number => {
  const n = sorted.length
  const at = (p: number) => sorted[Math.floor((n - 1) * p)] ?? 0
  const iqr = at(0.75) - at(0.25)
  const span = (sorted[n - 1] ?? 0) - (sorted[0] ?? 0)
  if (iqr > 0 && span > 0) {
    const width = (2 * iqr) / Math.cbrt(n)
    return Math.min(Math.max(Math.ceil(span / width), 1), 60)
  }
  return Math.max(Math.ceil(Math.log2(n) + 1), 1)
}

/** Equal-width bins on nice edges, so tick labels land on round numbers. */
export const histogramBins = (
  values: readonly number[],
  bins?: number,
): HistogramChartBin[] => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return []
  const low = sorted[0] ?? 0
  const high = sorted[sorted.length - 1] ?? 0
  if (low === high) return [{ x0: low, x1: low + 1, count: sorted.length }]
  const step = niceStep((high - low) / (bins ?? roughCount(sorted)))
  const start = Math.floor(low / step) * step
  const count = Math.max(Math.ceil((high - start) / step), 1)
  // Rounded edges, so float drift never prints 0.30000000000000004.
  const edge = (index: number) => Number((start + index * step).toPrecision(12))
  const out = Array.from({ length: count }, (_, index) => ({
    x0: edge(index),
    x1: edge(index + 1),
    count: 0,
  }))
  for (const value of sorted) {
    const index = Math.min(Math.floor((value - start) / step), count - 1)
    const bin = out[index]
    if (bin) bin.count += 1
  }
  return out
}

// Labelled above the plot, so it never collides with the tick labels along the bottom.
const medianLine = (tokens: ChartTokens, value: number | undefined) =>
  value === undefined
    ? {}
    : {
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: tokens.fgFaint, type: "dashed", width: 1 },
          label: {
            formatter: "Median",
            position: "end",
            color: tokens.fgMuted,
            fontFamily: tokens.font,
            fontSize: 11,
          },
          data: [{ xAxis: value }],
        },
      }

export const histogramChartOption = (
  { values, bins, color, showMedian = false, ...spec }: HistogramChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const buckets = histogramBins(values, bins)
  const fill = colorOf(tokens, color, 0)
  const total = values.length || 1
  const first = buckets[0]
  const last = buckets[buckets.length - 1]

  return {
    grid: { left: 4, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const bin = buckets[(params as { dataIndex: number }).dataIndex]
        return bin
          ? tooltipHtml(`${format(bin.x0)} to ${format(bin.x1)}`, [
              { name: "Count", color: fill, value: String(bin.count) },
              { name: "Share", value: formatPercent(bin.count / total) },
            ])
          : ""
      },
    },
    xAxis: {
      ...valueAxis(tokens, format, width),
      min: first?.x0,
      max: last?.x1,
      splitLine: { show: false },
      axisLine: { show: true, lineStyle: { color: tokens.border } },
    },
    yAxis: {
      ...valueAxis(tokens, (value) => String(Math.round(value)), width),
      minInterval: 1,
    },
    series: [
      {
        type: "custom",
        name: "Count",
        encode: { x: [0, 1], y: 2 },
        data: buckets.map((bin) => [bin.x0, bin.x1, bin.count]),
        renderItem: (params: CustomParams, api: CustomApi) => {
          const bin = buckets[params.dataIndex]
          if (!bin) return null
          const [left = 0, top = 0] = api.coord([bin.x0, bin.count])
          const [right = 0, bottom = 0] = api.coord([bin.x1, 0])
          // A one pixel gutter keeps neighbouring bins legible without reading as bars.
          return {
            type: "rect",
            shape: {
              x: left + 0.5,
              y: top,
              width: Math.max(right - left - 1, 1),
              height: bottom - top,
              r: [2, 2, 0, 0],
            },
            style: { fill: withAlpha(fill, 0.85) },
            emphasis: { style: { fill } },
          }
        },
        ...medianLine(tokens, showMedian ? median(values) : undefined),
      },
    ],
  } as EChartsOption
}

export interface HistogramChartProps extends ChartCommonProps, HistogramChartSpec {}

/** How raw values distribute: equal-width bins on round edges, binned in the browser. */
export const HistogramChart = specChart<HistogramChartSpec>({
  name: "HistogramChart",
  keys: ["values", "bins", "format", "color", "showMedian"],
  option: histogramChartOption,
  table: (spec) => {
    const print = toFormatter(spec.format)
    return {
      columns: ["From", "To", "Count"],
      rows: histogramBins(spec.values, spec.bins).map((bin) => [
        print(bin.x0),
        print(bin.x1),
        bin.count,
      ]),
    }
  },
  isEmpty: (spec) => spec.values.length === 0,
  label: "Histogram",
  height: 280,
})
