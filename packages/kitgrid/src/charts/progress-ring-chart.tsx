"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import { legendOption, tooltipBase, tooltipHtml } from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, type ChartTone, colorOf, withAlpha } from "./tokens.js"

export interface ProgressRingChartRing {
  label: string
  value: number
  /** What a full ring stands for. */
  target: number
  color?: ChartTone | string
}

export interface ProgressRingChartSpec {
  /** Outermost ring first. */
  data: ProgressRingChartRing[]
  format?: ChartFormat
  /** Prints the outer ring's progress in the centre. On by default. */
  center?: boolean
}

export const ringProgress = (ring: ProgressRingChartRing): number =>
  ring.target > 0 ? Math.max(ring.value, 0) / ring.target : 0

export const progressRingChartOption = (
  { data, center = true, ...spec }: ProgressRingChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const narrow = width > 0 && width < 520
  const legend = legendOption(tokens, true, data.length)
  const colors = data.map((ring, index) => colorOf(tokens, ring.color, index))
  const middle = narrow ? ["50%", "44%"] : ["34%", "50%"]
  const first = data[0]
  // Thicker rings when there are few, so two rings never look like hairlines.
  const gap = data.length <= 2 ? "28%" : "18%"

  return {
    legend: {
      ...legend,
      ...(narrow
        ? { bottom: 0, left: "center", top: undefined }
        : { top: "middle", left: "64%", orient: "vertical", itemGap: 14 }),
      icon: "circle",
      data: data.map((ring) => ring.label),
      selectedMode: false,
      formatter: (name: string) => {
        const ring = data.find((entry) => entry.label === name)
        return ring
          ? `{name|${name}}\n{value|${format(ring.value)} of ${format(ring.target)}}`
          : name
      },
      textStyle: {
        ...legend.textStyle as object,
        rich: {
          name: { color: tokens.fg, fontFamily: tokens.font, fontSize: 12, fontWeight: 600, lineHeight: 16 },
          value: { color: tokens.fgFaint, fontFamily: tokens.fontMono, fontSize: 11, lineHeight: 16 },
        },
      },
    },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const index = (params as { seriesIndex: number }).seriesIndex
        const ring = data[index]
        return ring
          ? tooltipHtml(ring.label, [
              { name: "Progress", color: colors[index], value: formatPercent(ringProgress(ring)) },
              { name: "Value", value: format(ring.value) },
              { name: "Target", value: format(ring.target) },
            ])
          : ""
      },
    },
    polar: {
      radius: [center ? "34%" : "22%", narrow ? "70%" : "86%"],
      center: middle,
    },
    angleAxis: {
      type: "value",
      min: 0,
      max: 1,
      startAngle: 90,
      clockwise: true,
      show: false,
    },
    radiusAxis: {
      type: "category",
      data: data.map((ring) => ring.label),
      inverse: true,
      show: false,
    },
    series: data.map((ring, index) => ({
      type: "bar",
      name: ring.label,
      coordinateSystem: "polar",
      roundCap: true,
      barGap: "-100%",
      barCategoryGap: gap,
      showBackground: true,
      backgroundStyle: { color: withAlpha(colors[index] ?? tokens.accent, 0.14) },
      color: colors[index],
      emphasis: { focus: "series" },
      blur: { itemStyle: { opacity: 0.35 } },
      // Past the target the ring is simply full; the legend and tooltip carry the real value.
      data: data.map((_, at) => (at === index ? Math.min(ringProgress(ring), 1) : null)),
    })).concat(
      center && first
        ? [
            // A bare gauge is the one centred text box ECharts places on a polar centre.
            {
              type: "gauge",
              name: "Centre",
              center: middle,
              radius: "20%",
              silent: true,
              tooltip: { show: false },
              axisLine: { show: false },
              axisTick: { show: false },
              splitLine: { show: false },
              axisLabel: { show: false },
              pointer: { show: false },
              progress: { show: false },
              title: { show: false },
              detail: {
                offsetCenter: [0, 0],
                valueAnimation: false,
                color: tokens.fg,
                fontFamily: tokens.fontMono,
                fontSize: narrow ? 18 : 22,
                fontWeight: 600,
                formatter: () => formatPercent(ringProgress(first), 0),
              },
              data: [{ value: 0 }],
            } as never,
          ]
        : [],
    ),
  } as EChartsOption
}

export interface ProgressRingChartProps extends ChartCommonProps, ProgressRingChartSpec {}

/** Concentric rings closing on their own targets, like activity rings. */
export const ProgressRingChart = specChart<ProgressRingChartSpec>({
  name: "ProgressRingChart",
  keys: ["data", "format", "center"],
  option: progressRingChartOption,
  table: (spec) => {
    const print = toFormatter(spec.format)
    return {
      columns: ["Ring", "Value", "Target", "Progress"],
      rows: spec.data.map((ring) => [
        ring.label,
        print(ring.value),
        print(ring.target),
        formatPercent(ringProgress(ring)),
      ]),
    }
  },
  isEmpty: (spec) => spec.data.length === 0,
  label: "Progress rings",
  height: 280,
})
