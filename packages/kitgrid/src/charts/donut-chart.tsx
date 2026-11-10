"use client"

import { forwardRef, useCallback, useMemo } from "react"
import { Chart, type ChartCommonProps, useStableSpec } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import {
  type ChartDatum,
  type ChartLegend,
  datumTable,
  legendOption,
  tooltipBase,
  tooltipHtml,
} from "./option-parts.js"
import { type ChartTokens, colorOf } from "./tokens.js"

export type DonutChartVariant = "donut" | "pie"

export interface DonutChartSpec {
  data: ChartDatum[]
  format?: ChartFormat
  variant?: DonutChartVariant
  /** Printed in the hole under the value. */
  centerLabel?: string
  /** Replaces the total printed in the hole. */
  centerValue?: string
  /** Names and shares outside the ring. */
  labels?: boolean
  legend?: ChartLegend
}

export const donutChartOption = (
  {
    data,
    variant = "donut",
    centerLabel,
    centerValue,
    labels = true,
    ...spec
  }: DonutChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const total = data.reduce((sum, datum) => sum + datum.value, 0)
  const donut = variant === "donut"
  const legend = legendOption(tokens, spec.legend ?? false, data.length)
  const below = legend.show && legend.bottom !== undefined
  // On a phone the outside labels need the ring smaller, or they clip at the edge.
  const outer = labels ? (width > 0 && width < 420 ? "56%" : "70%") : "86%"
  const center = ["50%", legend.show ? (below ? "45%" : "55%") : "50%"]

  return {
    legend: { ...legend, data: data.map((datum) => datum.label) },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const slice = params as {
          name: string
          value: number
          percent: number
          color: string
        }
        return tooltipHtml(slice.name, [
          { name: "Value", color: slice.color, value: format(slice.value) },
          { name: "Share", value: formatPercent(slice.percent / 100) },
        ])
      },
    },
    series: [
      {
        type: "pie",
        radius: [donut ? "58%" : "0%", outer],
        center,
        startAngle: 90,
        minAngle: 2,
        avoidLabelOverlap: true,
        animationType: "expansion",
        padAngle: donut ? 1.2 : 0,
        itemStyle: {
          borderColor: tokens.surface,
          borderWidth: donut ? 0 : 2,
          borderRadius: donut ? 4 : 2,
        },
        label: {
          show: labels,
          formatter: (params: { name: string; percent: number }) =>
            `{name|${params.name}}\n{value|${formatPercent(params.percent / 100)}}`,
          lineHeight: 15,
          rich: {
            name: { color: tokens.fgMuted, fontFamily: tokens.font, fontSize: 11 },
            value: {
              color: tokens.fg,
              fontFamily: tokens.fontMono,
              fontSize: 11,
              fontWeight: 600,
            },
          },
        },
        labelLine: {
          show: labels,
          length: 8,
          length2: 10,
          lineStyle: { color: tokens.border },
        },
        emphasis: { scale: true, scaleSize: 5, focus: "self" },
        blur: { itemStyle: { opacity: 0.35 } },
        data: data.map((datum, index) => ({
          name: datum.label,
          value: datum.value,
          itemStyle: { color: colorOf(tokens, datum.color, index) },
        })),
      },
    ],
    graphic: donut
      ? [
          {
            type: "text",
            left: "center",
            top: center[1] === "50%" ? "middle" : center[1] === "55%" ? "52%" : "42%",
            silent: true,
            style: {
              text: centerLabel
                ? `{value|${centerValue ?? format(total)}}\n{label|${centerLabel}}`
                : `{value|${centerValue ?? format(total)}}`,
              align: "center",
              rich: {
                value: {
                  fill: tokens.fg,
                  fontFamily: tokens.font,
                  fontSize: 20,
                  fontWeight: 650,
                  lineHeight: 26,
                  align: "center",
                },
                label: {
                  fill: tokens.fgMuted,
                  fontFamily: tokens.font,
                  fontSize: 11,
                  lineHeight: 16,
                  align: "center",
                },
              },
            },
          },
        ]
      : [],
  } as EChartsOption
}

export interface DonutChartProps extends ChartCommonProps, DonutChartSpec {}

/** Share of a whole, with the total in the hole. */
export const DonutChart = forwardRef<HTMLDivElement, DonutChartProps>(
  (
    {
      data,
      format,
      variant,
      centerLabel,
      centerValue,
      labels,
      legend,
      label = "Donut chart",
      summary = true,
      empty = "No data to plot",
      ...props
    },
    ref,
  ) => {
    const spec = useStableSpec(
      { data, format, variant, centerLabel, centerValue, labels, legend },
      format,
    )
    const option = useCallback(
      (tokens: ChartTokens, width: number) => donutChartOption(spec, tokens, width),
      [spec],
    )
    const table = useMemo(
      () => (summary ? datumTable(spec.data, toFormatter(spec.format)) : undefined),
      [summary, spec],
    )
    return (
      <Chart
        ref={ref}
        option={option}
        label={label}
        summary={table}
        empty={data.length === 0 ? empty : undefined}
        {...props}
      />
    )
  },
)

DonutChart.displayName = "DonutChart"
