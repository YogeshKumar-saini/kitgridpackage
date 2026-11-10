import type { EChartsOption } from "./echarts.js"
import type { ChartFormatter } from "./format.js"
import { type ChartTokens, type ChartTone, colorOf, withAlpha } from "./tokens.js"

export type ChartRow = Record<string, string | number | null | undefined>

export interface ChartSeries {
  /** The field of each row that holds this series' values. */
  key: string
  label?: string
  /** A tone, any CSS color (`var()` works), or the next palette color when omitted. */
  color?: ChartTone | string
  dashed?: boolean
}

export type ChartSeriesInput = string | ChartSeries

export interface ChartReference {
  value: number
  label?: string
}

/** `true` places the legend on top. Omitted, it shows only when there are several series. */
export type ChartLegend = boolean | "top" | "bottom"

export interface ResolvedSeries {
  key: string
  label: string
  color: string
  dashed: boolean
}

type Loose = Record<string, unknown>

const isObject = (value: unknown): value is Loose =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Every numeric field but `xKey` when `series` is omitted. */
export const seriesEntries = (
  data: readonly ChartRow[],
  xKey: string,
  series: readonly ChartSeriesInput[] | undefined,
): ChartSeries[] =>
  (series
    ? [...series]
    : Object.keys(data[0] ?? {}).filter(
        (key) => key !== xKey && data.some((row) => typeof row[key] === "number"),
      )
  ).map((input) => (typeof input === "string" ? { key: input } : input))

export const resolveSeries = (
  tokens: ChartTokens,
  data: readonly ChartRow[],
  xKey: string,
  series: readonly ChartSeriesInput[] | undefined,
  offset = 0,
): ResolvedSeries[] =>
  seriesEntries(data, xKey, series).map((entry, index) => ({
    key: entry.key,
    label: entry.label ?? entry.key,
    color: colorOf(tokens, entry.color, index + offset),
    dashed: entry.dashed ?? false,
  }))

export const numberAt = (row: ChartRow | undefined, key: string): number | null => {
  const value = row?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

/** Tooltips are HTML, and labels come from data. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char)

export interface TooltipLine {
  name: string
  color?: string
  value: string
}

export const tooltipHtml = (title: string, lines: readonly TooltipLine[]): string =>
  (title ? `<div class="kg-chart-tooltip__title">${escapeHtml(title)}</div>` : "") +
  lines
    .map(
      (line) =>
        `<div class="kg-chart-tooltip__row">` +
        (line.color
          ? `<span class="kg-chart-tooltip__swatch" style="background:${escapeHtml(line.color)}"></span>`
          : "") +
        `<span class="kg-chart-tooltip__name">${escapeHtml(line.name)}</span>` +
        `<span class="kg-chart-tooltip__value">${escapeHtml(line.value)}</span></div>`,
    )
    .join("")

export const tooltipBase = (tokens: ChartTokens) => ({
  className: "kg-chart-tooltip",
  backgroundColor: "transparent",
  borderWidth: 0,
  padding: 0,
  confine: true,
  transitionDuration: 0,
  textStyle: { color: tokens.fg, fontFamily: tokens.font, fontSize: 12 },
})

export const legendOption = (
  tokens: ChartTokens,
  legend: ChartLegend | undefined,
  count: number,
): { show: boolean; top?: number; bottom?: number } & Record<string, unknown> => {
  const place = legend === undefined ? (count > 1 ? "top" : false) : legend
  if (place === false) return { show: false }
  return {
    show: true,
    type: "scroll" as const,
    ...(place === "bottom" ? { bottom: 0 } : { top: 0 }),
    left: 0,
    icon: "roundRect",
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 16,
    textStyle: { color: tokens.fgMuted, fontFamily: tokens.font, fontSize: 12 },
    inactiveColor: tokens.fgFaint,
    pageIconColor: tokens.fgMuted,
    pageIconInactiveColor: tokens.border,
    pageIconSize: 9,
    pageTextStyle: { color: tokens.fgFaint, fontSize: 10 },
  }
}

export const legendRoom = (legend: { show: boolean; bottom?: number }) => ({
  top: legend.show && legend.bottom === undefined ? 36 : 12,
  bottom: legend.show && legend.bottom !== undefined ? 32 : 4,
})

export const categoryAxis = (tokens: ChartTokens, labels: readonly string[]) => ({
  type: "category" as const,
  data: [...labels],
  axisLine: { lineStyle: { color: tokens.border } },
  axisTick: { show: false },
  axisLabel: {
    color: tokens.fgMuted,
    fontFamily: tokens.font,
    fontSize: 11,
    hideOverlap: true,
    margin: 10,
  },
})

export const valueAxis = (tokens: ChartTokens, format: ChartFormatter, width = 0) => ({
  type: "value" as const,
  axisLine: { show: false },
  axisTick: { show: false },
  // A phone fits about four tick labels; the default seven run together.
  splitNumber: width > 0 && width < 420 ? 3 : undefined,
  splitLine: { lineStyle: { color: tokens.grid, type: "dashed" as const, width: 1 } },
  // ECharts passes `(value, index)`; a formatter with optional digits would read the index.
  axisLabel: {
    color: tokens.fgFaint,
    fontFamily: tokens.fontMono,
    fontSize: 11,
    hideOverlap: true,
    margin: 10,
    formatter: (value: number) => format(value),
  },
})

export const referenceLine = (
  tokens: ChartTokens,
  reference: ChartReference | undefined,
  axis: "xAxis" | "yAxis",
) =>
  reference
    ? {
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: tokens.fgFaint, type: "dashed", width: 1 },
          label: {
            show: Boolean(reference.label),
            formatter: reference.label ?? "",
            color: tokens.fgMuted,
            fontFamily: tokens.font,
            fontSize: 11,
            // Horizontal bars run an inverse category axis, which puts a vertical line's start on top.
            position: axis === "yAxis" ? "insideEndTop" : "start",
          },
          data: [{ [axis]: reference.value }],
        },
      }
    : {}

/** Full color at the cap, easing toward the baseline. */
export const barFill = (color: string, sideways = false) => ({
  type: "linear" as const,
  x: sideways ? 1 : 0,
  y: 0,
  x2: 0,
  y2: sideways ? 0 : 1,
  colorStops: [
    { offset: 0, color },
    { offset: 1, color: withAlpha(color, 0.72) },
  ],
})

/** A wash that falls from the line to nothing, so the line stays the subject. */
export const areaFade = (color: string) => ({
  type: "linear" as const,
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: withAlpha(color, 0.3) },
    { offset: 1, color: withAlpha(color, 0) },
  ],
})

/** The latest value wears a dot ringed in the surface color. */
export const lastPointMark = (
  tokens: ChartTokens,
  color: string,
  values: readonly (number | null)[],
) => {
  for (let index = values.length - 1; index >= 0; index--) {
    const value = values[index]
    if (value == null) continue
    return {
      markPoint: {
        silent: true,
        animation: false,
        symbol: "circle",
        symbolSize: 8,
        label: { show: false },
        itemStyle: { color, borderColor: tokens.surface, borderWidth: 2 },
        data: [{ coord: [index, value] }],
      },
    }
  }
  return {}
}

export const tableOf = (
  data: readonly ChartRow[],
  xKey: string,
  series: readonly ChartSeries[],
  format: ChartFormatter,
) => ({
  columns: [xKey, ...series.map((entry) => entry.label ?? entry.key)],
  rows: data.map((row) => [
    String(row[xKey] ?? ""),
    ...series.map((entry) => {
      const value = numberAt(row, entry.key)
      return value === null ? null : format(value)
    }),
  ]),
})

export interface ChartDatum {
  label: string
  value: number
  color?: ChartTone | string
}

export const datumTable = (data: readonly ChartDatum[], format: ChartFormatter) => ({
  columns: ["Label", "Value"],
  rows: data.map((datum) => [datum.label, format(datum.value)]),
})

export const sortData = (
  data: readonly ChartDatum[],
  sort: "desc" | "asc" | "none",
): ChartDatum[] =>
  sort === "none"
    ? [...data]
    : [...data].sort((a, b) =>
        sort === "desc" ? b.value - a.value : a.value - b.value,
      )

/** Palette, font and tooltip shell for any option, a raw escape-hatch one included. */
export const themeOption = (
  option: EChartsOption,
  tokens: ChartTokens,
): EChartsOption => {
  const loose = option as Loose
  const tooltip = loose.tooltip
  return {
    color: [...tokens.palette],
    backgroundColor: "transparent",
    textStyle: { fontFamily: tokens.font, color: tokens.fgMuted, fontSize: 11 },
    animationDuration: 560,
    animationEasing: "cubicOut",
    animationDurationUpdate: 360,
    animationEasingUpdate: "cubicInOut",
    ...option,
    ...(isObject(tooltip) ? { tooltip: { ...tooltipBase(tokens), ...tooltip } } : {}),
  } as EChartsOption
}

export interface AxisParam {
  dataIndex: number
  seriesIndex: number
}

export const axisParams = (params: unknown): AxisParam[] =>
  (Array.isArray(params) ? params : [params]).filter(isObject).map((entry) => ({
    dataIndex: typeof entry.dataIndex === "number" ? entry.dataIndex : -1,
    seriesIndex: typeof entry.seriesIndex === "number" ? entry.seriesIndex : -1,
  }))
