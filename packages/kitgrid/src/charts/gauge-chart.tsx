"use client"

import { forwardRef, useCallback, useMemo } from "react"
import { Chart, type ChartCommonProps, useStableSpec } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import { type ChartTokens, type ChartTone, colorOf, withAlpha } from "./tokens.js"

export interface GaugeChartSpec {
  value: number
  min?: number
  max?: number
  format?: ChartFormat
  /** Printed under the value. */
  caption?: string
  /** A tick on the arc, such as a goal. */
  target?: number
  color?: ChartTone | string
}

const START = 225
const END = -45

export const gaugeChartOption = (
  { value, min = 0, max = 100, caption, target, color, ...spec }: GaugeChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format ?? "number")
  const fill = colorOf(tokens, color)
  const band = width > 0 && width < 260 ? 10 : 14
  const geometry = {
    type: "gauge",
    startAngle: START,
    endAngle: END,
    min,
    max,
    radius: "88%",
    center: ["50%", "54%"],
    splitNumber: 1,
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    anchor: { show: false },
  }

  return {
    series: [
      {
        ...geometry,
        progress: {
          show: true,
          roundCap: true,
          width: band,
          itemStyle: { color: fill },
        },
        axisLine: {
          roundCap: true,
          lineStyle: { width: band, color: [[1, withAlpha(tokens.fgFaint, 0.18)]] },
        },
        pointer: { show: false },
        title: {
          show: Boolean(caption),
          offsetCenter: [0, "30%"],
          color: tokens.fgMuted,
          fontFamily: tokens.font,
          fontSize: 12,
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, caption ? "-2%" : "6%"],
          color: tokens.fg,
          fontFamily: tokens.font,
          fontSize: width > 0 && width < 260 ? 22 : 30,
          fontWeight: 650,
          formatter: (current: number) => format(current),
        },
        data: [{ value: Math.min(Math.max(value, min), max), name: caption ?? "" }],
      },
      ...(target === undefined
        ? []
        : [
            {
              ...geometry,
              silent: true,
              progress: { show: false },
              axisLine: { show: false },
              title: { show: false },
              detail: { show: false },
              pointer: {
                show: true,
                icon: "rect",
                width: 3,
                length: "22%",
                offsetCenter: [0, "-80%"],
                itemStyle: { color: tokens.fg },
              },
              data: [{ value: Math.min(Math.max(target, min), max) }],
            },
          ]),
    ],
  } as EChartsOption
}

export interface GaugeChartProps extends ChartCommonProps, GaugeChartSpec {}

/** One value against its range, with an optional target tick. */
export const GaugeChart = forwardRef<HTMLDivElement, GaugeChartProps>(
  (
    {
      value,
      min,
      max,
      format,
      caption,
      target,
      color,
      label,
      height = 220,
      summary = true,
      empty,
      ...props
    },
    ref,
  ) => {
    const spec = useStableSpec(
      { value, min, max, format, caption, target, color },
      format,
    )
    const option = useCallback(
      (tokens: ChartTokens, width: number) => gaugeChartOption(spec, tokens, width),
      [spec],
    )
    const table = useMemo(() => {
      if (!summary) return undefined
      const print = toFormatter(spec.format ?? "number")
      return {
        columns: ["Measure", "Value"],
        rows: [
          [spec.caption ?? "Value", print(spec.value)],
          ["Range", `${print(spec.min ?? 0)} to ${print(spec.max ?? 100)}`],
          ...(spec.target === undefined ? [] : [["Target", print(spec.target)]]),
        ],
      }
    }, [summary, spec])
    return (
      <Chart
        ref={ref}
        option={option}
        label={label ?? caption ?? "Gauge"}
        height={height}
        summary={table}
        empty={empty}
        {...props}
      />
    )
  },
)

GaugeChart.displayName = "GaugeChart"
