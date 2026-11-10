"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import {
  type ChartDatum,
  datumTable,
  tooltipBase,
  tooltipHtml,
} from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, colorOf, withAlpha } from "./tokens.js"

/** `radial`: one ring per row, its sweep the value. `rose`: one wedge per row, its reach the value. */
export type PolarBarChartVariant = "radial" | "rose"

export interface PolarBarChartSpec {
  data: ChartDatum[]
  format?: ChartFormat
  variant?: PolarBarChartVariant
  /** The value of a full sweep or full reach. Radial rings sweep 270° at the largest otherwise. */
  max?: number
}

export const polarBarChartOption = (
  { data, variant = "radial", max, ...spec }: PolarBarChartSpec,
  tokens: ChartTokens,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const labels = data.map((datum) => datum.label)
  const peak = Math.max(...data.map((datum) => datum.value), Number.EPSILON)
  const radial = variant === "radial"
  const label = { color: tokens.fgMuted, fontFamily: tokens.font, fontSize: 11 }
  const category = {
    type: "category" as const,
    data: labels,
    axisLine: { show: false },
    axisTick: { show: false },
  }
  const value = {
    type: "value" as const,
    min: 0,
    max: max ?? (radial ? peak / 0.75 : peak),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
    splitLine: {
      show: !radial,
      lineStyle: { color: tokens.grid, type: "dashed" as const },
    },
  }

  return {
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const datum = data[(params as { dataIndex: number }).dataIndex]
        const color = (params as { color: string }).color
        return datum
          ? tooltipHtml(datum.label, [
              { name: "Value", color, value: format(datum.value) },
            ])
          : ""
      },
    },
    polar: { radius: radial ? ["18%", "86%"] : ["8%", "78%"], center: ["50%", "52%"] },
    angleAxis: radial
      ? { ...value, startAngle: 90, clockwise: true }
      : {
          ...category,
          startAngle: 90,
          axisLabel: { ...label, interval: 0 },
          splitLine: { show: false },
        },
    radiusAxis: radial
      ? {
          ...category,
          // Names and values sit on the twelve o'clock spoke, upright, just before each ring starts.
          axisLabel: {
            ...label,
            interval: 0,
            align: "right",
            margin: 10,
            formatter: (name: string, index: number) =>
              `{name|${name}}  {value|${format(data[index]?.value ?? 0)}}`,
            rich: {
              name: label,
              value: {
                color: tokens.fg,
                fontFamily: tokens.fontMono,
                fontSize: 11,
                fontWeight: 600,
              },
            },
          },
          z: 10,
        }
      : value,
    series: [
      {
        type: "bar",
        coordinateSystem: "polar",
        roundCap: radial,
        barCategoryGap: radial ? "34%" : "8%",
        showBackground: radial,
        backgroundStyle: { color: withAlpha(tokens.fgFaint, 0.1) },
        emphasis: { focus: "self" },
        blur: { itemStyle: { opacity: 0.35 } },
        itemStyle: radial ? {} : { borderColor: tokens.surface, borderWidth: 2 },
        data: data.map((datum, index) => ({
          value: datum.value,
          itemStyle: { color: colorOf(tokens, datum.color, index) },
        })),
      },
    ],
  } as EChartsOption
}

export interface PolarBarChartProps extends ChartCommonProps, PolarBarChartSpec {}

/** Bars bent around a centre: rings that sweep by value, or a rose of wedges. */
export const PolarBarChart = specChart<PolarBarChartSpec>({
  name: "PolarBarChart",
  keys: ["data", "format", "variant", "max"],
  option: (spec, tokens) => polarBarChartOption(spec, tokens),
  table: (spec) => datumTable(spec.data, toFormatter(spec.format)),
  isEmpty: (spec) => spec.data.length === 0,
  label: "Polar bar chart",
  height: 340,
})
