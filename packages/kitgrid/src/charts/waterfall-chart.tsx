"use client"

import type { ChartCommonProps, ChartSummary } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import { categoryAxis, tooltipBase, tooltipHtml, valueAxis } from "./option-parts.js"
import {
  type CustomApi,
  type CustomParams,
  signedFormat,
  specChart,
} from "./spec-chart.js"
import { type ChartTokens, withAlpha } from "./tokens.js"

/** `total` is a level, not a change: the start, a subtotal or the end. */
export type WaterfallChartKind = "delta" | "total"

export interface WaterfallChartStep {
  label: string
  /** A change for a delta. For a total, the level; omitted, the running sum so far. */
  value?: number
  kind?: WaterfallChartKind
}

export interface WaterfallChartSpec {
  data: WaterfallChartStep[]
  format?: ChartFormat
  /** For measures where a fall is good, such as cost. */
  invert?: boolean
  /** Prints each change above its bar. */
  values?: boolean
}

export interface WaterfallChartBar {
  label: string
  kind: WaterfallChartKind
  /** The signed change, or the level for a total. */
  value: number
  low: number
  high: number
  /** The running level after this step. */
  level: number
}

/** Where each bar floats: deltas hang off the running sum, totals stand on zero. */
export const waterfallBars = (
  steps: readonly WaterfallChartStep[],
): WaterfallChartBar[] => {
  let running = 0
  return steps.map((step) => {
    const kind = step.kind ?? "delta"
    if (kind === "total") {
      running = step.value ?? running
      return {
        label: step.label,
        kind,
        value: running,
        low: Math.min(0, running),
        high: Math.max(0, running),
        level: running,
      }
    }
    const change = step.value ?? 0
    const before = running
    running += change
    return {
      label: step.label,
      kind,
      value: change,
      low: Math.min(before, running),
      high: Math.max(before, running),
      level: running,
    }
  })
}

export const waterfallChartOption = (
  { data, invert = false, values = true, ...spec }: WaterfallChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const signed = signedFormat(format)
  const bars = waterfallBars(data)
  const last = bars.length - 1
  const slot = width > 0 ? width / Math.max(bars.length, 1) : 96
  const cramped = slot < 56
  const colorOf = (bar: WaterfallChartBar, index: number) =>
    bar.kind === "total"
      ? index === last
        ? tokens.accent
        : (tokens.palette[1] ?? tokens.fgMuted)
      : bar.value >= 0 !== invert
        ? tokens.success
        : tokens.danger
  const caption = (bar: WaterfallChartBar) =>
    bar.kind === "total" ? format(bar.value) : signed(bar.value)

  return {
    grid: { left: 4, right: 8, top: values ? 28 : 12, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const bar = bars[(params as { dataIndex: number }).dataIndex]
        if (!bar) return ""
        return tooltipHtml(
          bar.label,
          bar.kind === "total"
            ? [{ name: "Level", value: format(bar.level) }]
            : [
                { name: "Change", color: colorOf(bar, -1), value: signed(bar.value) },
                { name: "Level after", value: format(bar.level) },
              ],
        )
      },
    },
    xAxis: {
      ...categoryAxis(
        tokens,
        bars.map((bar) => bar.label),
      ),
      axisLabel: {
        ...categoryAxis(tokens, []).axisLabel,
        interval: 0,
        hideOverlap: false,
        rotate: cramped ? 40 : 0,
        width: cramped ? 72 : Math.max(slot - 8, 44),
        overflow: "truncate",
      },
    },
    yAxis: valueAxis(tokens, format, width),
    series: [
      {
        type: "custom",
        name: "Steps",
        encode: { x: 0, y: [1, 2] },
        data: bars.map((bar, index) => [index, bar.low, bar.high]),
        animationDelay: (index: number) => index * 40,
        renderItem: (params: CustomParams, api: CustomApi) => {
          const index = params.dataIndex
          const bar = bars[index]
          if (!bar) return null
          const band = api.size([1, 0])[0] ?? 0
          const thick = Math.min(44, band * 0.62)
          const [x = 0, bottom = 0] = api.coord([index, bar.low])
          const top = api.coord([index, bar.high])[1] ?? 0
          const left = x - thick / 2
          const fill = colorOf(bar, index)
          const before = bars[index - 1]
          const children: unknown[] = [
            {
              type: "rect",
              shape: {
                x: left,
                y: top,
                width: thick,
                height: Math.max(bottom - top, 1),
                r: 3,
              },
              style: { fill },
              emphasis: { style: { fill: withAlpha(fill, 0.82) } },
            },
          ]
          if (before) {
            const y = api.coord([index, before.level])[1] ?? 0
            children.push({
              type: "line",
              silent: true,
              shape: { x1: left - (band - thick), y1: y, x2: left, y2: y },
              style: { stroke: tokens.fgFaint, lineWidth: 1, lineDash: [3, 3] },
            })
          }
          if (values && !(cramped && bar.kind === "delta"))
            children.push({
              type: "text",
              silent: true,
              x,
              y: top - 6,
              style: {
                text: caption(bar),
                fill: tokens.fgMuted,
                font: `600 11px ${tokens.fontMono}`,
                align: "center",
                verticalAlign: "bottom",
              },
            })
          return { type: "group", children }
        },
      },
    ],
  } as EChartsOption
}

export const waterfallChartTable = ({
  data,
  format,
}: WaterfallChartSpec): ChartSummary => {
  const print = toFormatter(format)
  return {
    columns: ["Step", "Change", "Level"],
    rows: waterfallBars(data).map((bar) => [
      bar.label,
      bar.kind === "total" ? null : signedFormat(print)(bar.value),
      print(bar.level),
    ]),
  }
}

export interface WaterfallChartProps extends ChartCommonProps, WaterfallChartSpec {}

/** A bridge from a start to an end: each change floats on the running sum. */
export const WaterfallChart = specChart<WaterfallChartSpec>({
  name: "WaterfallChart",
  keys: ["data", "format", "invert", "values"],
  option: waterfallChartOption,
  table: waterfallChartTable,
  isEmpty: (spec) => spec.data.length === 0,
  label: "Waterfall chart",
  height: 320,
})
