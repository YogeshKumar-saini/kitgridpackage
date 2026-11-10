"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import { type ChartRow, numberAt, tooltipBase, tooltipHtml } from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, colorOf, withAlpha } from "./tokens.js"

export interface ParallelChartDimension {
  key: string
  label?: string
  format?: ChartFormat
  /** Flips the axis so "better" reads upward for measures like cost. */
  inverse?: boolean
}

export interface ParallelChartSpec {
  /** One line per row. */
  data: ChartRow[]
  /** The field naming each row, shown in the tooltip and table. */
  labelKey: string
  dimensions: ParallelChartDimension[]
  /** Rows drawn in the accent; the rest stay quiet. Every row takes a palette color otherwise. */
  highlight?: string[]
}

export const parallelChartOption = (
  { data, labelKey, dimensions, highlight }: ParallelChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const narrow = width > 0 && width < 520
  const printers = dimensions.map((dimension) => toFormatter(dimension.format))
  const names = data.map((row) => String(row[labelKey] ?? ""))
  const axisText = { color: tokens.fgFaint, fontFamily: tokens.fontMono, fontSize: 10 }

  return {
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const index = (params as { dataIndex: number }).dataIndex
        const row = data[index]
        if (!row) return ""
        return tooltipHtml(
          names[index] ?? "",
          dimensions.map((dimension, at) => {
            const value = numberAt(row, dimension.key)
            return {
              name: dimension.label ?? dimension.key,
              value: value === null ? "n/a" : (printers[at]?.(value) ?? String(value)),
            }
          }),
        )
      },
    },
    parallel: {
      left: narrow ? 28 : 48,
      right: narrow ? 36 : 64,
      top: 40,
      bottom: 24,
      parallelAxisDefault: {
        nameLocation: "start",
        nameGap: 20,
        nameTextStyle: {
          color: tokens.fgMuted,
          fontFamily: tokens.font,
          fontSize: 11,
          fontWeight: 600,
        },
        axisLine: { lineStyle: { color: tokens.border } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: axisText,
      },
    },
    parallelAxis: dimensions.map((dimension, at) => ({
      dim: at,
      name: dimension.label ?? dimension.key,
      inverse: dimension.inverse ?? false,
      scale: true,
      nameLocation: dimension.inverse ? "start" : "end",
      axisLabel: {
        ...axisText,
        formatter: (value: number) => printers[at]?.(value) ?? String(value),
      },
    })),
    series: [
      {
        type: "parallel",
        smooth: 0.2,
        emphasis: { focus: "self", lineStyle: { width: 3, opacity: 1 } },
        blur: { lineStyle: { opacity: 0.08 } },
        inactiveOpacity: 0.06,
        activeOpacity: 1,
        data: data.map((row, index) => {
          const lit = !highlight || highlight.includes(names[index] ?? "")
          const color = highlight
            ? lit
              ? tokens.accent
              : withAlpha(tokens.fgFaint, 0.45)
            : colorOf(tokens, undefined, index)
          return {
            name: names[index],
            value: dimensions.map((dimension) => numberAt(row, dimension.key) ?? 0),
            lineStyle: { color, width: lit ? 2 : 1.25, opacity: lit ? 0.9 : 0.6 },
          }
        }),
      },
    ],
  } as EChartsOption
}

export interface ParallelChartProps extends ChartCommonProps, ParallelChartSpec {}

/** Many measures side by side, one vertical axis each, one line per item threading them. */
export const ParallelChart = specChart<ParallelChartSpec>({
  name: "ParallelChart",
  keys: ["data", "labelKey", "dimensions", "highlight"],
  option: parallelChartOption,
  table: (spec) => {
    const printers = spec.dimensions.map((dimension) => toFormatter(dimension.format))
    return {
      columns: [
        spec.labelKey,
        ...spec.dimensions.map((dimension) => dimension.label ?? dimension.key),
      ],
      rows: spec.data.map((row) => [
        String(row[spec.labelKey] ?? ""),
        ...spec.dimensions.map((dimension, at) => {
          const value = numberAt(row, dimension.key)
          return value === null ? null : (printers[at]?.(value) ?? value)
        }),
      ]),
    }
  },
  isEmpty: (spec) => spec.data.length === 0 || spec.dimensions.length === 0,
  label: "Parallel coordinates chart",
  height: 340,
})
