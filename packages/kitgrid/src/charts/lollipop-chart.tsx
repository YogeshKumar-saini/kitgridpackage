"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import {
  type ChartDatum,
  type ChartReference,
  categoryAxis,
  datumTable,
  referenceLine,
  sortData,
  tooltipBase,
  tooltipHtml,
  valueAxis,
} from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, colorOf, withAlpha } from "./tokens.js"

export interface LollipopChartSpec {
  data: ChartDatum[]
  format?: ChartFormat
  orientation?: "horizontal" | "vertical"
  sort?: "desc" | "asc" | "none"
  /** Prints each value beside its dot. On by default. */
  labels?: boolean
  reference?: ChartReference
}

const ROW = 30

export const lollipopChartOption = (
  {
    data,
    orientation = "horizontal",
    sort = "desc",
    labels = true,
    reference,
    ...spec
  }: LollipopChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const rows = sortData(data, sort)
  const sideways = orientation === "horizontal"
  const colors = rows.map((datum) => colorOf(tokens, datum.color, 0))
  const category = {
    ...categoryAxis(
      tokens,
      rows.map((datum) => datum.label),
    ),
    ...(sideways
      ? {
          inverse: true,
          axisLine: { show: false },
          axisLabel: { ...categoryAxis(tokens, []).axisLabel, interval: 0 },
        }
      : {}),
  }
  const value = valueAxis(tokens, format, width)
  const point = (datum: ChartDatum, index: number) =>
    sideways ? [datum.value, index] : [index, datum.value]

  return {
    grid: { left: 4, right: labels && sideways ? 48 : 16, top: 20, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const index = (params as { dataIndex: number }).dataIndex
        const datum = rows[index]
        return datum
          ? tooltipHtml(datum.label, [
              { name: "Value", color: colors[index], value: format(datum.value) },
            ])
          : ""
      },
    },
    xAxis: sideways ? value : category,
    yAxis: sideways ? category : value,
    series: [
      {
        type: "bar",
        name: "Stem",
        silent: true,
        barWidth: 2,
        data: rows.map((datum, index) => ({
          value: datum.value,
          itemStyle: { color: withAlpha(colors[index] ?? tokens.accent, 0.45) },
        })),
        ...referenceLine(tokens, reference, sideways ? "xAxis" : "yAxis"),
      },
      {
        type: "scatter",
        name: "Value",
        symbolSize: 12,
        z: 3,
        emphasis: { scale: 1.3 },
        label: {
          show: labels,
          position: sideways ? "right" : "top",
          distance: 8,
          color: tokens.fg,
          fontFamily: tokens.fontMono,
          fontSize: 11,
          fontWeight: 600,
          formatter: (params: { dataIndex: number }) =>
            format(rows[params.dataIndex]?.value ?? 0),
        },
        data: rows.map((datum, index) => ({
          value: point(datum, index),
          itemStyle: {
            color: colors[index],
            borderColor: tokens.surface,
            borderWidth: 2,
          },
        })),
      },
    ],
  } as EChartsOption
}

export interface LollipopChartProps extends ChartCommonProps, LollipopChartSpec {}

/** A ranked bar chart with less ink: a thin stem and a dot at the value. */
export const LollipopChart = specChart<LollipopChartSpec>({
  name: "LollipopChart",
  keys: ["data", "format", "orientation", "sort", "labels", "reference"],
  option: lollipopChartOption,
  table: (spec) => datumTable(sortData(spec.data, spec.sort ?? "desc"), toFormatter(spec.format)),
  isEmpty: (spec) => spec.data.length === 0,
  label: "Lollipop chart",
  height: (spec) =>
    spec.orientation === "vertical" ? 300 : Math.max(spec.data.length * ROW + 40, 160),
})
