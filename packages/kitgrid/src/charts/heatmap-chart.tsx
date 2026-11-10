"use client"

import type { ChartCommonProps, ChartSummary } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import { categoryAxis, tooltipBase, tooltipHtml } from "./option-parts.js"
import { inkOn, signedFormat, specChart } from "./spec-chart.js"
import { type ChartTokens, withAlpha } from "./tokens.js"

export interface HeatmapChartCell {
  x: string
  y: string
  value: number | null
}

export interface HeatmapChartDay {
  /** ISO date, `YYYY-MM-DD`. */
  date: string
  value: number | null
}

/** `sequential` runs from a faint wash to the accent; `diverging` from danger to success. */
export type HeatmapChartScheme = "sequential" | "diverging"

export interface HeatmapChartSpec {
  /** Category by category cells. */
  data?: HeatmapChartCell[]
  /** Calendar mode: one cell per day, laid out in weeks. Takes precedence over `data`. */
  days?: HeatmapChartDay[]
  /** Column and row order; first appearance in `data` otherwise. */
  xLabels?: string[]
  yLabels?: string[]
  format?: ChartFormat
  scheme?: HeatmapChartScheme
  /** Prints each cell's value. On by default for grids of 80 cells or fewer. */
  values?: boolean
  /** The color scale under the plot. */
  scale?: boolean
}

const unique = (values: readonly string[]) => [...new Set(values)]

const finite = (values: readonly (number | null)[]) =>
  values.filter((value): value is number => value !== null && Number.isFinite(value))

export const heatmapChartOption = (
  {
    data = [],
    days,
    scheme = "sequential",
    scale = true,
    values,
    ...spec
  }: HeatmapChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const print = scheme === "diverging" ? signedFormat(format) : format
  const calendar = days !== undefined
  const numbers = finite((days ?? data).map((entry) => entry.value))
  const low = numbers.length > 0 ? Math.min(...numbers) : 0
  const high = numbers.length > 0 ? Math.max(...numbers) : 1
  const reach = Math.max(Math.abs(low), Math.abs(high)) || 1
  const [min, max] =
    scheme === "diverging" ? [-reach, reach] : [low, high > low ? high : low + 1]
  const ramp =
    scheme === "diverging"
      ? [tokens.danger, withAlpha(tokens.fgFaint, 0.12), tokens.success]
      : [withAlpha(tokens.accent, 0.08), withAlpha(tokens.accent, 0.5), tokens.accent]

  const visualMap = {
    type: "continuous",
    show: scale,
    min,
    max,
    calculable: false,
    orient: "horizontal",
    left: "center",
    bottom: 0,
    itemWidth: 10,
    itemHeight: Math.min(160, Math.max(width * 0.3, 80)),
    inRange: { color: ramp },
    textGap: 6,
    textStyle: { color: tokens.fgFaint, fontFamily: tokens.fontMono, fontSize: 10 },
    text: [print(max), print(min)],
  }
  const cell = { borderColor: tokens.surface, borderWidth: 2, borderRadius: 4 }
  const bottom = scale ? 40 : 8

  if (calendar) {
    const dates = days.map((day) => day.date).sort()
    const first = dates[0] ?? ""
    const last = dates[dates.length - 1] ?? first
    return {
      visualMap,
      tooltip: {
        ...tooltipBase(tokens),
        trigger: "item",
        formatter: (params: unknown) => {
          const [date, value] = (params as { value: [string, number | null] }).value
          return tooltipHtml(date, [
            { name: "Value", value: value === null ? "n/a" : print(value) },
          ])
        },
      },
      calendar: {
        range: [first, last],
        top: 24,
        left: 36,
        right: 8,
        bottom,
        cellSize: ["auto", "auto"],
        splitLine: { show: false },
        itemStyle: { color: withAlpha(tokens.fgFaint, 0.06), ...cell, borderWidth: 3 },
        dayLabel: {
          firstDay: 1,
          nameMap: ["S", "M", "T", "W", "T", "F", "S"],
          color: tokens.fgFaint,
          fontFamily: tokens.font,
          fontSize: 10,
        },
        monthLabel: { color: tokens.fgMuted, fontFamily: tokens.font, fontSize: 11 },
        yearLabel: { show: false },
      },
      series: [
        {
          type: "heatmap",
          coordinateSystem: "calendar",
          itemStyle: { ...cell, borderWidth: 3 },
          data: days.map((day) => [day.date, day.value]),
        },
      ],
    } as EChartsOption
  }

  const xs = spec.xLabels ?? unique(data.map((entry) => entry.x))
  const ys = spec.yLabels ?? unique(data.map((entry) => entry.y))
  const showValues = values ?? data.length <= 80
  // Strong cells sit near the end of the ramp, so they take whichever ink reads on that end.
  const inkAt = (value: number) =>
    inkOn(
      tokens,
      scheme === "diverging"
        ? value < 0
          ? tokens.danger
          : tokens.success
        : tokens.accent,
    )
  const strong = (value: number) =>
    scheme === "diverging"
      ? Math.abs(value) / reach > 0.55
      : (value - min) / (max - min) > 0.55

  return {
    visualMap,
    grid: { left: 4, right: 8, top: 8, bottom, containLabel: true },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const [x, y, value] = (params as { value: [number, number, number | null] })
          .value
        return tooltipHtml(ys[y] ?? "", [
          { name: xs[x] ?? "", value: value === null ? "n/a" : print(value) },
        ])
      },
    },
    xAxis: {
      ...categoryAxis(tokens, xs),
      axisLine: { show: false },
      splitArea: { show: false },
    },
    yAxis: {
      ...categoryAxis(tokens, ys),
      inverse: true,
      axisLine: { show: false },
      splitArea: { show: false },
    },
    series: [
      {
        type: "heatmap",
        itemStyle: cell,
        emphasis: { itemStyle: { borderColor: tokens.fg, borderWidth: 1.5 } },
        label: {
          show: showValues,
          color: tokens.fg,
          fontFamily: tokens.fontMono,
          fontSize: 10,
          formatter: (params: { value: [number, number, number | null] }) =>
            params.value[2] === null ? "" : print(params.value[2]),
        },
        data: data.flatMap((entry) => {
          const x = xs.indexOf(entry.x)
          const y = ys.indexOf(entry.y)
          if (x < 0 || y < 0) return []
          return [
            {
              value: [x, y, entry.value],
              ...(entry.value !== null && strong(entry.value)
                ? { label: { color: inkAt(entry.value) } }
                : {}),
            },
          ]
        }),
      },
    ],
  } as EChartsOption
}

export const heatmapChartTable = ({
  data = [],
  days,
  xLabels,
  yLabels,
  format,
}: HeatmapChartSpec): ChartSummary => {
  const print = toFormatter(format)
  const cell = (value: number | null | undefined) =>
    value === null || value === undefined ? null : print(value)
  if (days)
    return {
      columns: ["Date", "Value"],
      rows: days.map((day) => [day.date, cell(day.value)]),
    }
  const xs = xLabels ?? unique(data.map((entry) => entry.x))
  const ys = yLabels ?? unique(data.map((entry) => entry.y))
  return {
    columns: ["", ...xs],
    rows: ys.map((y) => [
      y,
      ...xs.map((x) =>
        cell(data.find((entry) => entry.x === x && entry.y === y)?.value),
      ),
    ]),
  }
}

export interface HeatmapChartProps extends ChartCommonProps, HeatmapChartSpec {}

/** Intensity across two categories, or per day on a calendar. */
export const HeatmapChart = specChart<HeatmapChartSpec>({
  name: "HeatmapChart",
  keys: ["data", "days", "xLabels", "yLabels", "format", "scheme", "values", "scale"],
  option: heatmapChartOption,
  table: heatmapChartTable,
  isEmpty: (spec) => (spec.days ?? spec.data ?? []).length === 0,
  label: "Heatmap",
  height: (spec) =>
    spec.days
      ? 220
      : Math.max(
          (spec.yLabels ?? unique((spec.data ?? []).map((entry) => entry.y))).length *
            36 +
            80,
          180,
        ),
})
