"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import {
  type ChartDatum,
  categoryAxis,
  datumTable,
  tooltipBase,
  tooltipHtml,
} from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, colorOf, withAlpha } from "./tokens.js"

export type PictorialBarChartSymbol = "circle" | "square" | "diamond" | "person" | "drop"

export interface PictorialBarChartSpec {
  data: ChartDatum[]
  format?: ChartFormat
  symbol?: PictorialBarChartSymbol
  /** The value a full row of symbols stands for. The largest value otherwise. */
  max?: number
  /** Symbols in a full row. */
  count?: number
}

const SYMBOLS: Record<PictorialBarChartSymbol, string> = {
  circle: "circle",
  square: "roundRect",
  diamond: "diamond",
  person:
    "path://M12 2a4.2 4.2 0 1 1 0 8.4A4.2 4.2 0 0 1 12 2zM3.5 22c0-4.9 3.8-8.6 8.5-8.6s8.5 3.7 8.5 8.6z",
  drop: "path://M12 2C9 6.6 5.5 10.2 5.5 14a6.5 6.5 0 0 0 13 0C18.5 10.2 15 6.6 12 2z",
}

export const pictorialBarChartOption = (
  { data, symbol = "circle", max, count = 10, ...spec }: PictorialBarChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const ceiling = max ?? Math.max(...data.map((datum) => datum.value), Number.EPSILON)
  const narrow = width > 0 && width < 480
  const size = narrow ? 16 : 22
  const shape = SYMBOLS[symbol]
  const repeat = {
    type: "pictorialBar",
    symbol: shape,
    // A full row holds `count` symbols, whatever the plot width; the value clips the row.
    symbolRepeat: count,
    symbolClip: true,
    symbolSize: [size, size],
    symbolBoundingData: ceiling,
    barCategoryGap: "30%",
  }

  return {
    grid: { left: 4, right: narrow ? 56 : 72, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const index = (params as { dataIndex: number }).dataIndex
        const datum = data[index]
        return datum
          ? tooltipHtml(datum.label, [
              {
                name: "Value",
                color: colorOf(tokens, datum.color, 0),
                value: format(datum.value),
              },
            ])
          : ""
      },
    },
    xAxis: { type: "value", show: false, min: 0, max: ceiling },
    yAxis: {
      ...categoryAxis(
        tokens,
        data.map((datum) => datum.label),
      ),
      inverse: true,
      axisLine: { show: false },
      axisLabel: { ...categoryAxis(tokens, []).axisLabel, interval: 0 },
    },
    series: [
      {
        ...repeat,
        name: "Track",
        silent: true,
        z: 1,
        itemStyle: { color: withAlpha(tokens.fgFaint, 0.3) },
        label: {
          show: true,
          position: "right",
          distance: 10,
          color: tokens.fg,
          fontFamily: tokens.fontMono,
          fontSize: 11,
          fontWeight: 600,
          formatter: (params: { dataIndex: number }) =>
            format(data[params.dataIndex]?.value ?? 0),
        },
        data: data.map(() => ceiling),
      },
      {
        ...repeat,
        name: "Value",
        z: 2,
        emphasis: { focus: "self" },
        data: data.map((datum) => ({
          value: Math.min(datum.value, ceiling),
          itemStyle: { color: colorOf(tokens, datum.color, 0) },
        })),
      },
    ],
  } as EChartsOption
}

export interface PictorialBarChartProps extends ChartCommonProps, PictorialBarChartSpec {}

/** Bars made of repeated symbols: a count you can almost tally, filled up to the value. */
export const PictorialBarChart = specChart<PictorialBarChartSpec>({
  name: "PictorialBarChart",
  keys: ["data", "format", "symbol", "max", "count"],
  option: pictorialBarChartOption,
  table: (spec) => datumTable(spec.data, toFormatter(spec.format)),
  isEmpty: (spec) => spec.data.length === 0,
  label: "Pictorial bar chart",
  height: (spec) => Math.max(spec.data.length * 52 + 24, 160),
})
