"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import {
  axisParams,
  type ChartLegend,
  type ChartReference,
  type ChartRow,
  type ChartSeriesInput,
  categoryAxis,
  legendOption,
  legendRoom,
  numberAt,
  referenceLine,
  resolveSeries,
  seriesEntries,
  tableOf,
  tooltipBase,
  tooltipHtml,
  valueAxis,
} from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, type ChartTone, colorOf, withAlpha } from "./tokens.js"

export interface BandChartBand {
  /** The fields holding the range's floor and ceiling. */
  low: string
  high: string
  /** A field holding the central path, drawn dashed, such as a forecast. */
  mid?: string
  label?: string
  midLabel?: string
  /** The first series' color by default. */
  color?: ChartTone | string
}

export interface BandChartMarker {
  /** The `xKey` value the rule stands on. */
  x: string
  label?: string
}

export interface BandChartSpec {
  data: ChartRow[]
  xKey: string
  /** Solid lines, such as actuals. Every numeric field outside the band otherwise. */
  series?: ChartSeriesInput[]
  band: BandChartBand
  format?: ChartFormat
  /** Vertical rules, such as today or a launch. */
  markers?: BandChartMarker[]
  reference?: ChartReference
  legend?: ChartLegend
}

const lineSeries = (spec: BandChartSpec): ChartSeriesInput[] => {
  const { band } = spec
  const reserved = new Set([band.low, band.high, band.mid])
  return (
    spec.series ??
    seriesEntries(spec.data, spec.xKey, undefined)
      .filter((entry) => !reserved.has(entry.key))
      .map((entry) => entry.key)
  )
}

export const bandChartOption = (
  spec: BandChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const { data, xKey, band, markers = [] } = spec
  const format = toFormatter(spec.format)
  const lines = resolveSeries(tokens, data, xKey, lineSeries(spec))
  const labels = data.map((row) => String(row[xKey] ?? ""))
  const tone = band.color
    ? colorOf(tokens, band.color)
    : (lines[0]?.color ?? tokens.accent)
  const rangeName = band.label ?? "Range"
  const midName = band.midLabel ?? "Projected"
  const names = [
    ...lines.map((entry) => entry.label),
    ...(band.mid ? [midName] : []),
    rangeName,
  ]
  const legend = legendOption(tokens, spec.legend, names.length)
  const room = legendRoom(legend)
  const low = data.map((row) => numberAt(row, band.low))
  const high = data.map((row) => numberAt(row, band.high))
  const quiet = {
    type: "line" as const,
    showSymbol: false,
    // Stacks a positive span on a negative floor too, which "samesign" would refuse.
    stackStrategy: "all" as const,
  }

  return {
    grid: {
      left: 4,
      right: 16,
      top: room.top + (markers.length ? 16 : 0),
      bottom: room.bottom,
      containLabel: true,
    },
    legend: { ...legend, data: names },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: tokens.border, width: 1 } },
      formatter: (params: unknown) => {
        const at = axisParams(params)[0]?.dataIndex ?? -1
        const row = data[at]
        if (!row) return ""
        const floor = low[at]
        const ceiling = high[at]
        const mid = band.mid ? numberAt(row, band.mid) : null
        return tooltipHtml(labels[at] ?? "", [
          ...lines.flatMap((entry) => {
            const value = numberAt(row, entry.key)
            return value === null
              ? []
              : [{ name: entry.label, color: entry.color, value: format(value) }]
          }),
          ...(mid === null ? [] : [{ name: midName, color: tone, value: format(mid) }]),
          ...(floor == null || ceiling == null
            ? []
            : [
                {
                  name: rangeName,
                  color: withAlpha(tone, 0.4),
                  value: `${format(floor)} to ${format(ceiling)}`,
                },
              ]),
        ])
      },
    },
    xAxis: { ...categoryAxis(tokens, labels), boundaryGap: false },
    yAxis: valueAxis(tokens, format, width),
    series: [
      {
        ...quiet,
        name: "",
        stack: "band",
        silent: true,
        lineStyle: { opacity: 0 },
        tooltip: { show: false },
        data: low,
      },
      {
        ...quiet,
        name: rangeName,
        color: withAlpha(tone, 0.4),
        stack: "band",
        silent: true,
        lineStyle: { opacity: 0 },
        areaStyle: { color: withAlpha(tone, 0.16), opacity: 1 },
        data: high.map((value, index) => {
          const floor = low[index]
          return value === null || floor == null ? null : value - floor
        }),
      },
      ...(band.mid
        ? [
            {
              ...quiet,
              name: midName,
              color: tone,
              lineStyle: { color: tone, width: 2, type: "dashed" as const },
              data: data.map((row) => numberAt(row, band.mid ?? "")),
            },
          ]
        : []),
      ...lines.map((entry, index) => ({
        type: "line" as const,
        name: entry.label,
        color: entry.color,
        showSymbol: false,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          color: entry.color,
          width: 2,
          type: entry.dashed ? ("dashed" as const) : ("solid" as const),
        },
        emphasis: { focus: "series" as const },
        data: data.map((row) => numberAt(row, entry.key)),
        ...(index === 0 ? referenceLine(tokens, spec.reference, "yAxis") : {}),
        ...(index === 0 && markers.length
          ? {
              markLine: {
                silent: true,
                symbol: "none",
                lineStyle: { color: tokens.fgFaint, type: "solid" as const, width: 1 },
                label: {
                  position: "end",
                  color: tokens.fgMuted,
                  fontFamily: tokens.font,
                  fontSize: 11,
                  formatter: (params: { name: string }) => params.name,
                },
                data: [
                  ...markers.map((marker) => ({
                    xAxis: marker.x,
                    name: marker.label ?? "",
                  })),
                  ...(spec.reference
                    ? [
                        {
                          yAxis: spec.reference.value,
                          name: spec.reference.label ?? "",
                        },
                      ]
                    : []),
                ],
              },
            }
          : {}),
      })),
    ],
  } as EChartsOption
}

export interface BandChartProps extends ChartCommonProps, BandChartSpec {}

/** Lines inside a shaded range: a confidence band, or a forecast cone ahead of actuals. */
export const BandChart = specChart<BandChartSpec>({
  name: "BandChart",
  keys: ["data", "xKey", "series", "band", "format", "markers", "reference", "legend"],
  option: bandChartOption,
  table: (spec) =>
    tableOf(
      spec.data,
      spec.xKey,
      [
        ...seriesEntries(spec.data, spec.xKey, lineSeries(spec)),
        ...(spec.band.mid
          ? [{ key: spec.band.mid, label: spec.band.midLabel ?? "Projected" }]
          : []),
        { key: spec.band.low, label: `${spec.band.label ?? "Range"} low` },
        { key: spec.band.high, label: `${spec.band.label ?? "Range"} high` },
      ],
      toFormatter(spec.format),
    ),
  isEmpty: (spec) => spec.data.length === 0,
  label: "Band chart",
  height: 320,
})
