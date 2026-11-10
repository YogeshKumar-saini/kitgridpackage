"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useMemo,
} from "react"
import { Stat, type StatSize } from "../components/stat/stat.js"
import { cx } from "../utils/cx.js"
import { Chart, type ChartCommonProps, useStableSpec } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import {
  areaFade,
  axisParams,
  lastPointMark,
  tooltipBase,
  tooltipHtml,
} from "./option-parts.js"
import { type ChartTokens, type ChartTone, colorOf } from "./tokens.js"

export interface SparklineSpec {
  /** Oldest first. Null leaves a gap. */
  values: (number | null)[]
  /** Names each point in the tooltip, such as dates. */
  labels?: string[]
  format?: ChartFormat
  color?: ChartTone | string
  area?: boolean
  smooth?: boolean
  /** A level ruled across the line, such as last period's average. */
  reference?: number
  tooltip?: boolean
}

export const sparklineOption = (
  {
    values,
    labels,
    color,
    area = true,
    smooth = true,
    reference,
    tooltip = true,
    ...spec
  }: SparklineSpec,
  tokens: ChartTokens,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const stroke = colorOf(tokens, color)
  return {
    grid: { left: 3, right: 6, top: 6, bottom: 3 },
    tooltip: tooltip
      ? {
          ...tooltipBase(tokens),
          trigger: "axis",
          axisPointer: { type: "line", lineStyle: { color: tokens.border, width: 1 } },
          formatter: (params: unknown) => {
            const at = axisParams(params)[0]?.dataIndex ?? -1
            const value = values[at]
            if (value == null) return ""
            return tooltipHtml(labels?.[at] ?? "", [
              { name: "Value", color: stroke, value: format(value) },
            ])
          },
        }
      : { show: false },
    xAxis: {
      type: "category",
      show: false,
      boundaryGap: false,
      data: values.map((_, index) => labels?.[index] ?? String(index + 1)),
    },
    // Scaled to its own range: a sparkline carries shape, not magnitude.
    yAxis: { type: "value", show: false, scale: true },
    series: [
      {
        type: "line",
        data: values,
        color: stroke,
        smooth: smooth ? 0.35 : false,
        smoothMonotone: "x",
        showSymbol: false,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 1.75, color: stroke, cap: "round", join: "round" },
        itemStyle: { color: stroke, borderColor: tokens.surface, borderWidth: 1.5 },
        ...(area ? { areaStyle: { color: areaFade(stroke), opacity: 1 } } : {}),
        ...lastPointMark(tokens, stroke, values),
        ...(reference === undefined
          ? {}
          : {
              markLine: {
                silent: true,
                symbol: "none",
                animation: false,
                label: { show: false },
                lineStyle: { color: tokens.fgFaint, type: "dashed", width: 1 },
                data: [{ yAxis: reference }],
              },
            }),
      },
    ],
  } as EChartsOption
}

export interface SparklineProps extends ChartCommonProps, SparklineSpec {}

/** A trend at the size of a word, with a hover readout. */
export const Sparkline = forwardRef<HTMLDivElement, SparklineProps>(
  (
    {
      values,
      labels,
      format,
      color,
      area,
      smooth,
      reference,
      tooltip,
      label = "Trend",
      height = 48,
      summary = true,
      empty,
      ...props
    },
    ref,
  ) => {
    const spec = useStableSpec(
      { values, labels, format, color, area, smooth, reference, tooltip },
      format,
    )
    const option = useCallback(
      (tokens: ChartTokens) => sparklineOption(spec, tokens),
      [spec],
    )
    const table = useMemo(() => {
      if (!summary) return undefined
      const print = toFormatter(spec.format)
      return {
        columns: ["Point", "Value"],
        rows: spec.values.map((value, index) => [
          spec.labels?.[index] ?? String(index + 1),
          value === null ? null : print(value),
        ]),
      }
    }, [summary, spec])
    return (
      <Chart
        ref={ref}
        option={option}
        label={label}
        height={height}
        summary={table}
        empty={empty}
        data-variant="sparkline"
        {...props}
      />
    )
  },
)

Sparkline.displayName = "Sparkline"

export interface SparkGridItem {
  label: string
  value: number
  /** Change versus the previous period, in percent. */
  delta?: number
  /** For metrics where down is good. */
  invertDelta?: boolean
  /** Recent values, oldest first. */
  trend?: number[]
}

export interface SparkGridProps extends HTMLAttributes<HTMLUListElement> {
  items: SparkGridItem[]
  format?: ChartFormat
  /** Narrowest a tile may get before the grid drops a column, in px. */
  minTileWidth?: number
  size?: StatSize
  /** Context under each value, such as “vs last week”. */
  helper?: string
}

/**
 * Small multiples: one KPI tile per entity, each with its own sparkline. Plain SVG rather
 * than one canvas per tile, which would cost more than the page around it at forty tiles.
 */
export const SparkGrid = forwardRef<HTMLUListElement, SparkGridProps>(
  (
    {
      items,
      format,
      minTileWidth = 180,
      size = "sm",
      helper,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const print = toFormatter(format)
    return (
      <ul
        ref={ref}
        className={cx("kg-spark-grid", className)}
        style={{ ...style, "--_tile": `${minTileWidth}px` } as CSSProperties}
        {...props}
      >
        {items.map((item) => {
          const trend = item.trend?.filter(Number.isFinite) ?? []
          const first = trend[0]
          const last = trend[trend.length - 1]
          return (
            <li key={item.label} className="kg-spark-grid__tile">
              <Stat
                label={item.label}
                value={print(item.value)}
                delta={item.delta}
                invertDelta={item.invertDelta}
                helper={helper}
                trend={item.trend}
                trendLabel={
                  first !== undefined && last !== undefined && trend.length > 1
                    ? `${item.label} trend, ${print(first)} to ${print(last)}`
                    : undefined
                }
                size={size}
              />
            </li>
          )
        })}
      </ul>
    )
  },
)

SparkGrid.displayName = "SparkGrid"
