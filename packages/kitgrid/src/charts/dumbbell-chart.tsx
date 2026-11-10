"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import {
  axisParams,
  categoryAxis,
  legendOption,
  tooltipBase,
  tooltipHtml,
  valueAxis,
} from "./option-parts.js"
import { type CustomApi, type CustomParams, specChart } from "./spec-chart.js"
import { type ChartTokens, withAlpha } from "./tokens.js"

export interface DumbbellChartRow {
  label: string
  /** The earlier value: a hollow dot. */
  from: number | null
  /** The later value: a solid accent dot. */
  to: number | null
}

export interface DumbbellChartSpec {
  data: DumbbellChartRow[]
  fromLabel?: string
  toLabel?: string
  format?: ChartFormat
  /** For measures where a fall is good, such as cost or churn. */
  invert?: boolean
  /** Orders rows by their later value. */
  sort?: "desc" | "asc" | "none"
}

const ROW = 34

const sorted = (rows: readonly DumbbellChartRow[], sort: DumbbellChartSpec["sort"]) =>
  sort === "desc" || sort === "asc"
    ? [...rows].sort((a, b) =>
        sort === "desc" ? (b.to ?? 0) - (a.to ?? 0) : (a.to ?? 0) - (b.to ?? 0),
      )
    : [...rows]

const change = (row: DumbbellChartRow) =>
  row.from !== null && row.to !== null && row.from !== 0
    ? (row.to - row.from) / Math.abs(row.from)
    : null

export const dumbbellChartOption = (
  {
    data,
    fromLabel = "Before",
    toLabel = "After",
    invert = false,
    sort = "none",
    ...spec
  }: DumbbellChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const rows = sorted(data, sort)
  const legend = legendOption(tokens, "top", 2)
  const tone = (row: DumbbellChartRow) =>
    (row.to ?? 0) >= (row.from ?? 0) !== invert ? tokens.success : tokens.danger
  const dot = (key: "from" | "to") =>
    rows.map((row, index) => (row[key] === null ? null : [row[key], index]))

  return {
    legend: { ...legend, icon: "circle", data: [fromLabel, toLabel] },
    grid: { left: 4, right: 16, top: 36, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "axis",
      axisPointer: {
        type: "shadow",
        shadowStyle: { color: withAlpha(tokens.fgFaint, 0.08) },
      },
      formatter: (params: unknown) => {
        const row = rows[axisParams(params)[0]?.dataIndex ?? -1]
        if (!row) return ""
        const delta = change(row)
        return tooltipHtml(row.label, [
          {
            name: fromLabel,
            color: tokens.fgFaint,
            value: row.from === null ? "n/a" : format(row.from),
          },
          {
            name: toLabel,
            color: tokens.accent,
            value: row.to === null ? "n/a" : format(row.to),
          },
          ...(delta === null
            ? []
            : [
                {
                  name: "Change",
                  color: tone(row),
                  value: `${delta > 0 ? "+" : ""}${formatPercent(delta)}`,
                },
              ]),
        ])
      },
    },
    xAxis: { ...valueAxis(tokens, format, width), scale: true },
    yAxis: {
      ...categoryAxis(
        tokens,
        rows.map((row) => row.label),
      ),
      inverse: true,
      axisLine: { show: false },
      axisLabel: {
        ...categoryAxis(tokens, []).axisLabel,
        interval: 0,
        width: 140,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "custom",
        name: "Change",
        silent: true,
        encode: { x: [1, 2], y: 0 },
        data: rows.map((row, index) => [index, row.from ?? row.to, row.to ?? row.from]),
        renderItem: (params: CustomParams, api: CustomApi) => {
          const row = rows[params.dataIndex]
          if (!row || row.from === null || row.to === null) return null
          const [x1 = 0, y = 0] = api.coord([row.from, params.dataIndex])
          const [x2 = 0] = api.coord([row.to, params.dataIndex])
          return {
            type: "line",
            shape: { x1, y1: y, x2, y2: y },
            style: {
              stroke: withAlpha(tone(row), 0.55),
              lineWidth: 4,
              lineCap: "round",
            },
          }
        },
        tooltip: { show: false },
      },
      {
        type: "scatter",
        name: fromLabel,
        color: tokens.fgFaint,
        symbolSize: 11,
        itemStyle: {
          color: tokens.surface,
          borderColor: tokens.fgFaint,
          borderWidth: 2,
        },
        data: dot("from"),
        z: 3,
      },
      {
        type: "scatter",
        name: toLabel,
        color: tokens.accent,
        symbolSize: 12,
        itemStyle: {
          color: tokens.accent,
          borderColor: tokens.surface,
          borderWidth: 1.5,
        },
        data: dot("to"),
        z: 4,
      },
    ],
  } as EChartsOption
}

export interface DumbbellChartProps extends ChartCommonProps, DumbbellChartSpec {}

/** Each row's move between two periods on one scale: size and direction at once. */
export const DumbbellChart = specChart<DumbbellChartSpec>({
  name: "DumbbellChart",
  keys: ["data", "fromLabel", "toLabel", "format", "invert", "sort"],
  option: dumbbellChartOption,
  table: (spec) => {
    const print = toFormatter(spec.format)
    return {
      columns: ["Label", spec.fromLabel ?? "Before", spec.toLabel ?? "After", "Change"],
      rows: sorted(spec.data, spec.sort).map((row) => {
        const delta = change(row)
        return [
          row.label,
          row.from === null ? null : print(row.from),
          row.to === null ? null : print(row.to),
          delta === null ? null : `${delta > 0 ? "+" : ""}${formatPercent(delta)}`,
        ]
      }),
    }
  },
  isEmpty: (spec) => spec.data.length === 0,
  label: "Dumbbell chart",
  height: (spec) => Math.max(spec.data.length * ROW + 56, 160),
})
