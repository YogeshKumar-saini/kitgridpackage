"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import {
  axisParams,
  categoryAxis,
  tooltipBase,
  tooltipHtml,
  valueAxis,
} from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, withAlpha } from "./tokens.js"

export interface CandlestickChartCandle {
  label: string
  open: number
  close: number
  low: number
  high: number
}

export interface CandlestickChartSpec {
  data: CandlestickChartCandle[]
  format?: ChartFormat
  /** A moving average of closes over this many candles, drawn as a thin line. */
  average?: number
}

export const movingAverage = (
  values: readonly number[],
  span: number,
): (number | null)[] =>
  values.map((_, index) => {
    if (span < 1 || index < span - 1) return null
    let sum = 0
    for (let at = index - span + 1; at <= index; at++) sum += values[at] ?? 0
    return sum / span
  })

export const candlestickChartOption = (
  { data, average, ...spec }: CandlestickChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const closes = data.map((candle) => candle.close)
  const trend = average ? movingAverage(closes, average) : []

  return {
    grid: { left: 4, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: tokens.border } },
      formatter: (params: unknown) => {
        const candle = data[axisParams(params)[0]?.dataIndex ?? -1]
        if (!candle) return ""
        const up = candle.close >= candle.open
        const move = candle.open === 0 ? 0 : (candle.close - candle.open) / candle.open
        return tooltipHtml(candle.label, [
          { name: "Open", value: format(candle.open) },
          { name: "High", value: format(candle.high) },
          { name: "Low", value: format(candle.low) },
          {
            name: "Close",
            color: up ? tokens.success : tokens.danger,
            value: `${format(candle.close)} (${move > 0 ? "+" : ""}${formatPercent(move)})`,
          },
        ])
      },
    },
    xAxis: {
      ...categoryAxis(
        tokens,
        data.map((candle) => candle.label),
      ),
      boundaryGap: true,
    },
    yAxis: { ...valueAxis(tokens, format, width), scale: true },
    series: [
      {
        type: "candlestick",
        name: "Price",
        barMaxWidth: 14,
        data: data.map((candle) => [candle.open, candle.close, candle.low, candle.high]),
        // Up candles are hollow, so direction never rests on color alone.
        itemStyle: {
          color: withAlpha(tokens.success, 0.18),
          color0: tokens.danger,
          borderColor: tokens.success,
          borderColor0: tokens.danger,
          borderWidth: 1.5,
        },
        emphasis: { itemStyle: { borderWidth: 2 } },
      },
      ...(average
        ? [
            {
              type: "line",
              name: `${average}-period average`,
              data: trend,
              symbol: "none",
              smooth: true,
              lineStyle: { color: tokens.accent, width: 1.5 },
              z: 3,
            },
          ]
        : []),
    ],
  } as EChartsOption
}

export interface CandlestickChartProps extends ChartCommonProps, CandlestickChartSpec {}

/** Open, high, low and close per period: hollow bodies rise, filled bodies fall. */
export const CandlestickChart = specChart<CandlestickChartSpec>({
  name: "CandlestickChart",
  keys: ["data", "format", "average"],
  option: candlestickChartOption,
  table: (spec) => {
    const print = toFormatter(spec.format)
    return {
      columns: ["Period", "Open", "High", "Low", "Close"],
      rows: spec.data.map((candle) => [
        candle.label,
        print(candle.open),
        print(candle.high),
        print(candle.low),
        print(candle.close),
      ]),
    }
  },
  isEmpty: (spec) => spec.data.length === 0,
  label: "Candlestick chart",
  height: 320,
})
