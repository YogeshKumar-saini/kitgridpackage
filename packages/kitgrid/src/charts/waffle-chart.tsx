"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import {
  type ChartDatum,
  legendOption,
  tooltipBase,
  tooltipHtml,
} from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, colorOf, withAlpha } from "./tokens.js"

export interface WaffleChartSpec {
  data: ChartDatum[]
  format?: ChartFormat
  /** Cells per row. */
  columns?: number
  /** Rows of cells; `columns × rows` cells stand for the whole. */
  rows?: number
  /** Rounded cells, from square (0) to dots (1). */
  roundness?: number
  /** Counts toward the whole beyond the data; the leftover cells stay empty. */
  total?: number
}

interface WaffleApi {
  value: (dimension: number) => number
  getWidth: () => number
  getHeight: () => number
}

/** Cells per datum by largest remainder, so the counts always add up to the grid. */
export const waffleCells = (
  data: readonly ChartDatum[],
  cells: number,
  total?: number,
): number[] => {
  const sum = data.reduce((acc, datum) => acc + Math.max(datum.value, 0), 0)
  const whole = Math.max(total ?? sum, sum)
  if (whole <= 0) return data.map(() => 0)
  const exact = data.map((datum) => (Math.max(datum.value, 0) / whole) * cells)
  const counts = exact.map(Math.floor)
  const target = Math.round((sum / whole) * cells)
  let left = target - counts.reduce((acc, count) => acc + count, 0)
  const order = exact
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest)
  for (const { index } of order) {
    if (left <= 0) break
    counts[index] = (counts[index] ?? 0) + 1
    left -= 1
  }
  return counts
}

export const waffleChartOption = (
  { data, columns = 10, rows = 10, roundness = 0.3, total, ...spec }: WaffleChartSpec,
  tokens: ChartTokens,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const cells = columns * rows
  const counts = waffleCells(data, cells, total)
  const sum = Math.max(
    total ?? 0,
    data.reduce((acc, datum) => acc + Math.max(datum.value, 0), 0),
  )
  const colors = data.map((datum, index) => colorOf(tokens, datum.color, index))
  const legend = legendOption(tokens, "bottom", data.length)
  const starts = counts.map((_, index) =>
    counts.slice(0, index).reduce((acc, count) => acc + count, 0),
  )
  const filled = counts.reduce((acc, count) => acc + count, 0)

  const cell = (index: number, api: WaffleApi, fill: string) => {
    const room = 72
    const width = api.getWidth()
    const height = api.getHeight() - room
    const gap = 3
    const side = Math.max(
      Math.min((width - gap * (columns - 1)) / columns, (height - gap * (rows - 1)) / rows),
      2,
    )
    const gridWidth = side * columns + gap * (columns - 1)
    const left = (width - gridWidth) / 2
    const column = index % columns
    const row = Math.floor(index / columns)
    return {
      type: "rect",
      shape: {
        x: left + column * (side + gap),
        y: 4 + row * (side + gap),
        width: side,
        height: side,
        r: (side / 2) * Math.min(Math.max(roundness, 0), 1),
      },
      style: { fill },
    }
  }

  const share = (index: number) => (sum > 0 ? (data[index]?.value ?? 0) / sum : 0)

  return {
    legend: {
      ...legend,
      // Plain wraps onto a second line; a scrolling legend would hide the last share.
      type: "plain",
      left: "center",
      icon: "roundRect",
      data: data.map((datum) => datum.label),
      formatter: (name: string) => {
        const index = data.findIndex((datum) => datum.label === name)
        return `${name}  ${formatPercent(share(index), 0)}`
      },
    },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const index = (params as { seriesIndex: number }).seriesIndex
        const datum = data[index]
        return datum
          ? tooltipHtml(datum.label, [
              { name: "Value", color: colors[index], value: format(datum.value) },
              { name: "Share", value: formatPercent(share(index)) },
            ])
          : ""
      },
    },
    series: [
      ...data.map((datum, index) => ({
        type: "custom",
        name: datum.label,
        coordinateSystem: "none",
        color: colors[index],
        emphasis: { focus: "series" },
        blur: { itemStyle: { opacity: 0.25 } },
        data: Array.from({ length: counts[index] ?? 0 }, (_, at) => (starts[index] ?? 0) + at),
        renderItem: (_params: unknown, api: WaffleApi) =>
          cell(api.value(0), api, colors[index] ?? tokens.accent),
      })),
      {
        type: "custom",
        name: "Remaining",
        coordinateSystem: "none",
        silent: true,
        tooltip: { show: false },
        data: Array.from({ length: cells - filled }, (_, at) => filled + at),
        renderItem: (_params: unknown, api: WaffleApi) =>
          cell(api.value(0), api, withAlpha(tokens.fgFaint, 0.14)),
      },
    ],
  } as EChartsOption
}

export interface WaffleChartProps extends ChartCommonProps, WaffleChartSpec {}

/** Parts of a whole as a grid of cells, each one a fixed share: easier to count than a pie. */
export const WaffleChart = specChart<WaffleChartSpec>({
  name: "WaffleChart",
  keys: ["data", "format", "columns", "rows", "roundness", "total"],
  option: (spec, tokens) => waffleChartOption(spec, tokens),
  table: (spec) => {
    const print = toFormatter(spec.format)
    const sum = Math.max(
      spec.total ?? 0,
      spec.data.reduce((acc, datum) => acc + Math.max(datum.value, 0), 0),
    )
    return {
      columns: ["Label", "Value", "Share"],
      rows: spec.data.map((datum) => [
        datum.label,
        print(datum.value),
        formatPercent(sum > 0 ? datum.value / sum : 0),
      ]),
    }
  },
  isEmpty: (spec) => spec.data.length === 0,
  label: "Waffle chart",
  height: 320,
})
