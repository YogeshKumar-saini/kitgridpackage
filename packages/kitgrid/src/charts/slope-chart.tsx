"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import { tooltipBase, tooltipHtml } from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, withAlpha } from "./tokens.js"

export interface SlopeChartRow {
  label: string
  from: number
  to: number
}

export interface SlopeChartSpec {
  data: SlopeChartRow[]
  fromLabel?: string
  toLabel?: string
  format?: ChartFormat
  /** For measures where a fall is good, such as cost or churn. */
  invert?: boolean
  /** Rows to draw in full color; the rest recede. Every row is colored when omitted. */
  highlight?: string[]
}

const change = (row: SlopeChartRow) =>
  row.from === 0 ? 0 : (row.to - row.from) / Math.abs(row.from)

export const slopeChartOption = (
  {
    data,
    fromLabel = "Before",
    toLabel = "After",
    invert = false,
    highlight,
    ...spec
  }: SlopeChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const narrow = width > 0 && width < 480
  const values = data.flatMap((row) => [row.from, row.to])
  const low = Math.min(...values)
  const high = Math.max(...values)
  const pad = (high - low || 1) * 0.06
  const side = narrow ? 92 : 140

  return {
    grid: { left: side, right: side, top: 36, bottom: 8 },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const row = data[(params as { seriesIndex: number }).seriesIndex]
        if (!row) return ""
        const delta = change(row)
        return tooltipHtml(row.label, [
          { name: fromLabel, value: format(row.from) },
          { name: toLabel, value: format(row.to) },
          { name: "Change", value: `${delta > 0 ? "+" : ""}${formatPercent(delta)}` },
        ])
      },
    },
    xAxis: {
      type: "category",
      data: [fromLabel, toLabel],
      position: "top",
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: tokens.fgMuted,
        fontFamily: tokens.font,
        fontSize: 11,
        fontWeight: 600,
        margin: 14,
      },
      splitLine: { show: true, lineStyle: { color: tokens.border } },
    },
    yAxis: { type: "value", show: false, min: low - pad, max: high + pad },
    series: data.map((row) => {
      const rising = row.to >= row.from !== invert
      const lit = !highlight || highlight.includes(row.label)
      const tone = rising ? tokens.success : tokens.danger
      const color = lit ? tone : withAlpha(tokens.fgFaint, 0.5)
      const text = {
        fontFamily: tokens.font,
        fontSize: 11,
        color: lit ? tokens.fg : tokens.fgFaint,
      }
      return {
        type: "line",
        name: row.label,
        symbol: "circle",
        symbolSize: 7,
        z: lit ? 3 : 2,
        lineStyle: { color, width: lit ? 2 : 1.5 },
        itemStyle: { color, borderColor: tokens.surface, borderWidth: 1.5 },
        emphasis: { focus: "series", lineStyle: { width: 3 } },
        blur: { lineStyle: { opacity: 0.15 }, itemStyle: { opacity: 0.15 } },
        labelLayout: { hideOverlap: true },
        data: [
          {
            value: row.from,
            label: {
              show: true,
              ...text,
              position: "left",
              distance: 8,
              formatter: `${row.label}  ${format(row.from)}`,
            },
          },
          {
            value: row.to,
            label: {
              show: true,
              ...text,
              position: "right",
              distance: 8,
              formatter: narrow ? format(row.to) : `${format(row.to)}  ${row.label}`,
            },
          },
        ],
      }
    }),
  } as EChartsOption
}

export interface SlopeChartProps extends ChartCommonProps, SlopeChartSpec {}

/** Who rose and who fell between two moments, and by how much, one line per row. */
export const SlopeChart = specChart<SlopeChartSpec>({
  name: "SlopeChart",
  keys: ["data", "fromLabel", "toLabel", "format", "invert", "highlight"],
  option: slopeChartOption,
  table: (spec) => {
    const print = toFormatter(spec.format)
    return {
      columns: ["Label", spec.fromLabel ?? "Before", spec.toLabel ?? "After", "Change"],
      rows: spec.data.map((row) => {
        const delta = change(row)
        return [
          row.label,
          print(row.from),
          print(row.to),
          `${delta > 0 ? "+" : ""}${formatPercent(delta)}`,
        ]
      }),
    }
  },
  isEmpty: (spec) => spec.data.length === 0,
  label: "Slope chart",
  height: 360,
})
