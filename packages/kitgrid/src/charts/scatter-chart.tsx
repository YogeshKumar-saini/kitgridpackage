"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import {
  type ChartLegend,
  legendOption,
  legendRoom,
  tooltipBase,
  tooltipHtml,
  valueAxis,
} from "./option-parts.js"
import { median, specChart } from "./spec-chart.js"
import { type ChartTokens, type ChartTone, colorOf, withAlpha } from "./tokens.js"

export interface ScatterChartPoint {
  label?: string
  x: number
  y: number
  /** Sizes the bubble by area. */
  size?: number
  /** Points sharing a group share a color and a legend entry. */
  group?: string
  color?: ChartTone | string
}

export interface ScatterChartQuadrants {
  /** Where the vertical divider sits. The median of x by default. */
  x?: number
  /** Where the horizontal divider sits. The median of y by default. */
  y?: number
  /** Names for the top right, top left, bottom left and bottom right quadrants. */
  labels?: [string, string, string, string]
}

export interface ScatterChartSpec {
  data: ScatterChartPoint[]
  xLabel?: string
  yLabel?: string
  sizeLabel?: string
  xFormat?: ChartFormat
  yFormat?: ChartFormat
  sizeFormat?: ChartFormat
  /** Splits the plane into four named quadrants around two dividers. */
  quadrants?: boolean | ScatterChartQuadrants
  /** Names each point beside it. */
  labels?: boolean
  legend?: ChartLegend
}

const SIZE = { min: 8, max: 38, fixed: 11 }
const CORNERS = [
  "insideTopRight",
  "insideTopLeft",
  "insideBottomLeft",
  "insideBottomRight",
]

export const scatterChartOption = (
  {
    data,
    xLabel = "x",
    yLabel = "y",
    sizeLabel = "Size",
    quadrants,
    labels = false,
    ...spec
  }: ScatterChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const xFormat = toFormatter(spec.xFormat)
  const yFormat = toFormatter(spec.yFormat)
  const sizeFormat = toFormatter(spec.sizeFormat)
  const groups = [...new Set(data.map((point) => point.group ?? ""))]
  const legend = legendOption(tokens, spec.legend, groups.filter(Boolean).length)
  const room = legendRoom(legend)
  const sizes = data.map((point) => point.size ?? 0)
  const peak = Math.max(...sizes, 0)
  // By area, not radius, so a bubble twice the value looks twice as big.
  const radius = (size: number | undefined) =>
    peak > 0
      ? SIZE.min + (SIZE.max - SIZE.min) * Math.sqrt(Math.max(size ?? 0, 0) / peak)
      : SIZE.fixed
  const quad = quadrants
    ? {
        x:
          (typeof quadrants === "object" ? quadrants.x : undefined) ??
          median(data.map((point) => point.x)),
        y:
          (typeof quadrants === "object" ? quadrants.y : undefined) ??
          median(data.map((point) => point.y)),
        labels: typeof quadrants === "object" ? quadrants.labels : undefined,
      }
    : undefined
  const named = (title: string) => ({
    name: title,
    nameLocation: "middle" as const,
    nameTextStyle: { color: tokens.fgMuted, fontFamily: tokens.font, fontSize: 11 },
  })

  const quadrantMarks = quad
    ? {
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: tokens.fgFaint, type: "dashed", width: 1 },
          label: { show: false },
          data: [{ xAxis: quad.x }, { yAxis: quad.y }],
        },
        markArea: {
          silent: true,
          // Infinity reaches the axis extent, however the axis rounds its ends.
          data: [
            [
              { xAxis: quad.x, yAxis: quad.y },
              { xAxis: Infinity, yAxis: Infinity },
            ],
            [
              { xAxis: -Infinity, yAxis: quad.y },
              { xAxis: quad.x, yAxis: Infinity },
            ],
            [
              { xAxis: -Infinity, yAxis: -Infinity },
              { xAxis: quad.x, yAxis: quad.y },
            ],
            [
              { xAxis: quad.x, yAxis: -Infinity },
              { xAxis: Infinity, yAxis: quad.y },
            ],
          ].map((area, index) => [
            {
              ...area[0],
              itemStyle: {
                color: index === 0 ? withAlpha(tokens.accent, 0.06) : "transparent",
              },
              label: {
                show: Boolean(quad.labels?.[index]),
                position: CORNERS[index],
                formatter: quad.labels?.[index] ?? "",
                color: tokens.fgFaint,
                fontFamily: tokens.font,
                fontSize: 11,
                fontWeight: 600,
                distance: 8,
              },
            },
            area[1],
          ]),
        },
      }
    : {}

  return {
    legend: { ...legend, data: groups.filter(Boolean) },
    // The grid box is the outer bound, so axis names fit inside it along with the tick labels.
    grid: {
      left: 4,
      right: 20,
      top: room.top + 4,
      bottom: room.bottom,
      outerBoundsMode: "same",
      outerBoundsContain: "all",
    },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const hit = params as { data: { index: number }; color: string }
        const point = data[hit.data.index]
        if (!point) return ""
        return tooltipHtml(point.label ?? point.group ?? "", [
          { name: xLabel, color: hit.color, value: xFormat(point.x) },
          { name: yLabel, value: yFormat(point.y) },
          ...(point.size === undefined
            ? []
            : [{ name: sizeLabel, value: sizeFormat(point.size) }]),
        ])
      },
    },
    xAxis: {
      ...valueAxis(tokens, xFormat, width),
      ...named(xLabel),
      nameGap: 28,
      scale: true,
      splitLine: { show: false },
      axisLine: { show: true, lineStyle: { color: tokens.border } },
    },
    yAxis: {
      ...valueAxis(tokens, yFormat, width),
      ...named(yLabel),
      nameGap: 40,
      scale: true,
    },
    series: groups.map((group, groupIndex) => {
      const color = colorOf(tokens, undefined, groupIndex)
      return {
        type: "scatter",
        name: group,
        color,
        data: data.flatMap((point, index) =>
          (point.group ?? "") === group
            ? [
                {
                  value: [point.x, point.y],
                  name: point.label ?? "",
                  index,
                  symbolSize: radius(point.size) * 2,
                  itemStyle: {
                    color: withAlpha(
                      point.color ? colorOf(tokens, point.color) : color,
                      peak > 0 ? 0.72 : 0.9,
                    ),
                    borderColor: tokens.surface,
                    borderWidth: 1,
                  },
                },
              ]
            : [],
        ),
        label: {
          show: labels,
          position: "right",
          distance: 6,
          color: tokens.fgMuted,
          fontFamily: tokens.font,
          fontSize: 10,
          formatter: (params: { name: string }) => params.name,
        },
        labelLayout: { hideOverlap: true },
        emphasis: { focus: "self", scale: 1.15 },
        blur: { itemStyle: { opacity: 0.3 } },
        ...(groupIndex === 0 ? quadrantMarks : {}),
      }
    }),
  } as EChartsOption
}

export interface ScatterChartProps extends ChartCommonProps, ScatterChartSpec {}

/** Two measures per point, optionally sized by a third and split into quadrants. */
export const ScatterChart = specChart<ScatterChartSpec>({
  name: "ScatterChart",
  keys: [
    "data",
    "xLabel",
    "yLabel",
    "sizeLabel",
    "xFormat",
    "yFormat",
    "sizeFormat",
    "quadrants",
    "labels",
    "legend",
  ],
  option: scatterChartOption,
  table: (spec) => {
    const x = toFormatter(spec.xFormat)
    const y = toFormatter(spec.yFormat)
    const size = toFormatter(spec.sizeFormat)
    const sized = spec.data.some((point) => point.size !== undefined)
    return {
      columns: [
        "Label",
        spec.xLabel ?? "x",
        spec.yLabel ?? "y",
        ...(sized ? [spec.sizeLabel ?? "Size"] : []),
      ],
      rows: spec.data.map((point) => [
        point.label ?? point.group ?? "",
        x(point.x),
        y(point.y),
        ...(sized ? [point.size === undefined ? null : size(point.size)] : []),
      ]),
    }
  },
  isEmpty: (spec) => spec.data.length === 0,
  label: "Scatter chart",
  height: 360,
})
