"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import {
  type ChartLegend,
  type ChartRow,
  type ChartSeriesInput,
  legendOption,
  legendRoom,
  numberAt,
  resolveSeries,
  seriesEntries,
  tableOf,
  tooltipBase,
  tooltipHtml,
} from "./option-parts.js"
import { type CustomApi, type CustomParams, inkOn, specChart } from "./spec-chart.js"
import type { ChartTokens } from "./tokens.js"

export interface MekkoChartSpec {
  /** One column per row: its width is the row's share of the grand total. */
  data: ChartRow[]
  xKey: string
  /** The stacked segments; each is sized by its share of its own column. */
  series?: ChartSeriesInput[]
  format?: ChartFormat
  /** Prints each segment's share where it fits. */
  values?: boolean
  legend?: ChartLegend
}

export interface MekkoChartBlock {
  column: number
  series: number
  value: number
  /** Edges in shares of the whole width and of the column height, 0 to 1. */
  x0: number
  x1: number
  y0: number
  y1: number
}

/** Columns as wide as their total, segments as tall as their share of the column. */
export const mekkoBlocks = (
  data: readonly ChartRow[],
  keys: readonly string[],
): { blocks: MekkoChartBlock[]; totals: number[]; grand: number } => {
  const totals = data.map((row) =>
    keys.reduce((sum, key) => sum + Math.max(numberAt(row, key) ?? 0, 0), 0),
  )
  const grand = totals.reduce((sum, total) => sum + total, 0)
  const blocks: MekkoChartBlock[] = []
  let left = 0
  data.forEach((row, column) => {
    const total = totals[column] ?? 0
    const right = grand > 0 ? left + total / grand : left
    let bottom = 0
    keys.forEach((key, series) => {
      const value = Math.max(numberAt(row, key) ?? 0, 0)
      const top = total > 0 ? bottom + value / total : bottom
      if (value > 0)
        blocks.push({ column, series, value, x0: left, x1: right, y0: bottom, y1: top })
      bottom = top
    })
    left = right
  })
  return { blocks, totals, grand }
}

export const mekkoChartOption = (
  { data, xKey, values = true, ...spec }: MekkoChartSpec,
  tokens: ChartTokens,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const series = resolveSeries(tokens, data, xKey, spec.series)
  const { blocks, totals, grand } = mekkoBlocks(
    data,
    series.map((entry) => entry.key),
  )
  const labels = data.map((row) => String(row[xKey] ?? ""))
  const legend = legendOption(tokens, spec.legend, series.length)
  const room = legendRoom(legend)
  const share = { axisLabel: { formatter: (value: number) => formatPercent(value, 0) } }
  const axis = {
    type: "value" as const,
    min: 0,
    max: 1,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
  }

  return {
    legend: { ...legend, data: series.map((entry) => entry.label) },
    grid: {
      left: 4,
      right: 8,
      top: room.top,
      bottom: room.bottom + 34,
      containLabel: true,
    },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const hit = params as { seriesIndex: number; dataIndex: number; color: string }
        const block = blocks.filter((entry) => entry.series === hit.seriesIndex)[
          hit.dataIndex
        ]
        if (!block) return ""
        const total = totals[block.column] ?? 0
        return tooltipHtml(labels[block.column] ?? "", [
          {
            name: series[block.series]?.label ?? "",
            color: hit.color,
            value: format(block.value),
          },
          {
            name: "Share of column",
            value: formatPercent(total ? block.value / total : 0),
          },
          { name: "Column of total", value: formatPercent(grand ? total / grand : 0) },
        ])
      },
    },
    xAxis: { ...axis, axisLabel: { show: false } },
    yAxis: {
      ...axis,
      axisLabel: {
        ...share.axisLabel,
        color: tokens.fgFaint,
        fontFamily: tokens.fontMono,
        fontSize: 11,
      },
    },
    series: series.map((entry, index) => {
      const own = blocks.filter((block) => block.series === index)
      return {
        type: "custom",
        name: entry.label,
        color: entry.color,
        encode: { x: [0, 1], y: [2, 3] },
        data: own.map((block) => [block.x0, block.x1, block.y0, block.y1]),
        emphasis: { focus: "series" },
        renderItem: (params: CustomParams, api: CustomApi) => {
          const ink = inkOn(tokens, entry.color)
          const block = own[params.dataIndex]
          if (!block) return null
          const [left = 0, bottom = 0] = api.coord([block.x0, block.y0])
          const [right = 0, top = 0] = api.coord([block.x1, block.y1])
          const width = right - left
          const height = bottom - top
          const total = totals[block.column] ?? 0
          const children: unknown[] = [
            {
              type: "rect",
              shape: { x: left, y: top, width, height },
              style: { fill: entry.color, stroke: tokens.surface, lineWidth: 2 },
            },
          ]
          if (values && width > 40 && height > 18)
            children.push({
              type: "text",
              silent: true,
              x: left + 6,
              y: top + 5,
              style: {
                text: formatPercent(total ? block.value / total : 0, 0),
                fill: ink,
                font: `600 11px ${tokens.fontMono}`,
              },
            })
          // The bottom block of each column carries the column's name and its share.
          if (block.y0 === 0)
            children.push({
              type: "text",
              silent: true,
              x: left + width / 2,
              y: bottom + 8,
              style: {
                text: `${labels[block.column] ?? ""}\n${formatPercent(grand ? total / grand : 0, 0)}`,
                fill: tokens.fgMuted,
                font: `11px ${tokens.font}`,
                align: "center",
                lineHeight: 15,
                width: Math.max(width - 4, 8),
                overflow: "truncate",
              },
            })
          return { type: "group", children }
        },
      }
    }),
  } as EChartsOption
}

export interface MekkoChartProps extends ChartCommonProps, MekkoChartSpec {}

/** Two shares at once: column width is each row's weight, segment height its mix. */
export const MekkoChart = specChart<MekkoChartSpec>({
  name: "MekkoChart",
  keys: ["data", "xKey", "series", "format", "values", "legend"],
  option: (spec, tokens) => mekkoChartOption(spec, tokens),
  table: (spec) =>
    tableOf(
      spec.data,
      spec.xKey,
      seriesEntries(spec.data, spec.xKey, spec.series),
      toFormatter(spec.format),
    ),
  isEmpty: (spec) => spec.data.length === 0,
  label: "Marimekko chart",
  height: 360,
})
