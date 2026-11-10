"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import { type ChartDatum, tooltipBase, tooltipHtml } from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, colorOf, withAlpha } from "./tokens.js"

export interface FunnelChartSpec {
  /** Stages in order, widest first. */
  data: ChartDatum[]
  format?: ChartFormat
  /** Prints each stage's share of the first one next to its value. */
  conversion?: boolean
}

export const funnelChartOption = (
  { data, conversion = true, ...spec }: FunnelChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const first = data[0]?.value ?? 0
  const share = (value: number) => (first > 0 ? value / first : 0)
  const narrow = width > 0 && width < 420

  return {
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const index = (params as { dataIndex: number }).dataIndex
        const stage = data[index]
        if (!stage) return ""
        const previous = data[index - 1]
        return tooltipHtml(stage.label, [
          { name: "Value", value: format(stage.value) },
          { name: "Of first stage", value: formatPercent(share(stage.value)) },
          ...(previous && previous.value > 0
            ? [
                {
                  name: "From previous",
                  value: formatPercent(stage.value / previous.value),
                },
              ]
            : []),
        ])
      },
    },
    series: [
      {
        type: "funnel",
        sort: "none",
        left: 4,
        top: 8,
        bottom: 8,
        width: narrow ? "52%" : "60%",
        minSize: "14%",
        gap: 3,
        funnelAlign: "center",
        itemStyle: { borderWidth: 0, borderRadius: 4 },
        emphasis: { label: { show: true } },
        // Outside, so every stage keeps the theme's ink whatever its fill.
        label: {
          show: true,
          position: "right",
          formatter: (params: { name: string; value: number }) =>
            `{name|${params.name}}\n{value|${format(params.value)}}` +
            (conversion ? `  {share|${formatPercent(share(params.value))}}` : ""),
          lineHeight: 16,
          rich: {
            name: { color: tokens.fgMuted, fontFamily: tokens.font, fontSize: 11 },
            value: {
              color: tokens.fg,
              fontFamily: tokens.fontMono,
              fontSize: 12,
              fontWeight: 600,
            },
            share: { color: tokens.fgFaint, fontFamily: tokens.fontMono, fontSize: 11 },
          },
        },
        labelLine: { length: 28, lineStyle: { color: tokens.border } },
        data: data.map((stage, index) => ({
          name: stage.label,
          value: stage.value,
          itemStyle: {
            color: stage.color
              ? colorOf(tokens, stage.color)
              : withAlpha(tokens.accent, Math.max(1 - index * 0.14, 0.32)),
          },
        })),
      },
    ],
  } as EChartsOption
}

export interface FunnelChartProps extends ChartCommonProps, FunnelChartSpec {}

/** How many make it through each stage, and what share of the start that is. */
export const FunnelChart = specChart<FunnelChartSpec>({
  name: "FunnelChart",
  keys: ["data", "format", "conversion"],
  option: funnelChartOption,
  table: ({ data, format }) => {
    const print = toFormatter(format)
    const first = data[0]?.value ?? 0
    return {
      columns: ["Stage", "Value", "Of first stage"],
      rows: data.map((stage) => [
        stage.label,
        print(stage.value),
        formatPercent(first > 0 ? stage.value / first : 0),
      ]),
    }
  },
  isEmpty: (spec) => spec.data.length === 0,
  label: "Funnel chart",
  height: 320,
})
