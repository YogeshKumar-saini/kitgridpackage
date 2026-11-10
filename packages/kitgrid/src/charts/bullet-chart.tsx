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
import { type CustomApi, type CustomParams, specChart } from "./spec-chart.js"
import { type ChartTokens, type ChartTone, colorOf, withAlpha } from "./tokens.js"

export interface BulletChartRow {
  label: string
  value: number
  target?: number
  /** Upper bounds of the qualitative ranges, such as poor, fair and good, ascending. */
  bands?: number[]
}

export interface BulletChartSpec {
  data: BulletChartRow[]
  format?: ChartFormat
  /** The shared scale's end. The largest value, target or band otherwise. */
  max?: number
  color?: ChartTone | string
}

const ROW = 44

const ceilingOf = ({ data, max }: BulletChartSpec) =>
  max ??
  Math.max(
    ...data.flatMap((row) => [row.value, row.target ?? 0, ...(row.bands ?? [])]),
    Number.EPSILON,
  ) * 1.04

export const bulletChartOption = (
  spec: BulletChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const { data } = spec
  const format = toFormatter(spec.format)
  const fill = colorOf(tokens, spec.color)
  const ceiling = ceilingOf(spec)

  return {
    grid: { left: 4, right: 20, top: 8, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "axis",
      axisPointer: { type: "none" },
      formatter: (params: unknown) => {
        const row = data[axisParams(params)[0]?.dataIndex ?? -1]
        if (!row) return ""
        return tooltipHtml(row.label, [
          { name: "Value", color: fill, value: format(row.value) },
          ...(row.target === undefined
            ? []
            : [
                { name: "Target", color: tokens.fg, value: format(row.target) },
                {
                  name: "Of target",
                  value: formatPercent(row.target ? row.value / row.target : 0),
                },
              ]),
        ])
      },
    },
    xAxis: { ...valueAxis(tokens, format, width), min: 0, max: ceiling },
    yAxis: {
      ...categoryAxis(
        tokens,
        data.map((row) => row.label),
      ),
      inverse: true,
      axisLine: { show: false },
      axisLabel: {
        ...categoryAxis(tokens, []).axisLabel,
        interval: 0,
        width: 140,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "custom",
        name: "Value",
        encode: { x: 1, y: 0 },
        data: data.map((row, index) => [index, row.value]),
        renderItem: (params: CustomParams, api: CustomApi) => {
          const index = params.dataIndex
          const row = data[index]
          if (!row) return null
          const slot = api.size([0, 1])[1] ?? ROW
          const [zero = 0, middle = 0] = api.coord([0, index])
          const at = (value: number) =>
            api.coord([Math.min(value, ceiling), index])[0] ?? 0
          const track = Math.min(slot * 0.62, 26)
          const bar = track * 0.38
          // Widest band first, so each narrower and darker band paints over it.
          const bands = [...(row.bands?.length ? row.bands : [ceiling])].sort(
            (a, b) => b - a,
          )
          return {
            type: "group",
            children: [
              ...bands.map((bound, step) => ({
                type: "rect",
                silent: true,
                shape: {
                  x: zero,
                  y: middle - track / 2,
                  width: Math.max(at(bound) - zero, 0),
                  height: track,
                  r: 3,
                },
                style: { fill: withAlpha(tokens.fgFaint, 0.1 + step * 0.08) },
              })),
              {
                type: "rect",
                shape: {
                  x: zero,
                  y: middle - bar / 2,
                  width: Math.max(at(row.value) - zero, 0),
                  height: bar,
                  r: 2,
                },
                style: { fill },
              },
              ...(row.target === undefined
                ? []
                : [
                    {
                      type: "rect",
                      silent: true,
                      shape: {
                        x: at(row.target) - 1.5,
                        y: middle - track * 0.42,
                        width: 3,
                        height: track * 0.84,
                        r: 1,
                      },
                      style: { fill: tokens.fg },
                    },
                  ]),
            ],
          }
        },
      },
    ],
  } as EChartsOption
}

export interface BulletChartProps extends ChartCommonProps, BulletChartSpec {}

/** A value against its target and qualitative ranges, compact enough to stack many. */
export const BulletChart = specChart<BulletChartSpec>({
  name: "BulletChart",
  keys: ["data", "format", "max", "color"],
  option: bulletChartOption,
  table: (spec) => {
    const print = toFormatter(spec.format)
    return {
      columns: ["Measure", "Value", "Target", "Ranges"],
      rows: spec.data.map((row) => [
        row.label,
        print(row.value),
        row.target === undefined ? null : print(row.target),
        row.bands?.map(print).join(", ") ?? null,
      ]),
    }
  },
  isEmpty: (spec) => spec.data.length === 0,
  label: "Bullet chart",
  height: (spec) => Math.max(spec.data.length * ROW + 36, 120),
})
