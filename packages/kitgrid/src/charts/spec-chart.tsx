"use client"

import {
  type ForwardRefExoticComponent,
  forwardRef,
  type RefAttributes,
  useCallback,
  useMemo,
} from "react"
import {
  Chart,
  type ChartCommonProps,
  type ChartSummary,
  useStableSpec,
} from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import type { ChartTokens } from "./tokens.js"

export interface SpecChartConfig<S extends object> {
  name: string
  /** Every spec prop; anything else is spread onto the root element. */
  keys: readonly (keyof S & string)[]
  option: (spec: S, tokens: ChartTokens, width: number) => EChartsOption
  table: (spec: S) => ChartSummary
  isEmpty: (spec: S) => boolean
  label: string
  height?: number | ((spec: S) => number)
}

export type SpecChartComponent<S extends object> = ForwardRefExoticComponent<
  ChartCommonProps & S & RefAttributes<HTMLDivElement>
>

/**
 * One data-first chart from its pure option builder: splits spec props from DOM props, keeps
 * the spec stable across equal re-renders, and adds the hidden table and the empty note.
 */
export const specChart = <S extends object>(
  config: SpecChartConfig<S>,
): SpecChartComponent<S> => {
  const Component = forwardRef<HTMLDivElement, ChartCommonProps & S>((props, ref) => {
    const {
      label = config.label,
      height,
      summary = true,
      empty = "No data to plot",
      ...rest
    } = props as ChartCommonProps & Record<string, unknown>
    const picked: Record<string, unknown> = {}
    const dom: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) {
      if ((config.keys as readonly string[]).includes(key)) picked[key] = value
      else dom[key] = value
    }
    // Fixed length, so the memo's dependency list never changes size between renders.
    const functions = config.keys.map((key) =>
      typeof picked[key] === "function" ? picked[key] : undefined,
    )
    const spec = useStableSpec(picked as S, ...functions)
    const option = useCallback(
      (tokens: ChartTokens, width: number) => config.option(spec, tokens, width),
      [spec],
    )
    const table = useMemo(
      () => (summary ? config.table(spec) : undefined),
      [summary, spec],
    )
    const isEmpty = config.isEmpty(spec)
    const fitted =
      height ??
      (typeof config.height === "function" ? config.height(spec) : config.height)
    return (
      <Chart
        ref={ref}
        option={option}
        label={label}
        height={fitted}
        summary={isEmpty ? undefined : table}
        empty={isEmpty ? empty : undefined}
        {...dom}
      />
    )
  })
  Component.displayName = config.name
  return Component as SpecChartComponent<S>
}

/** `+12`, `-4`: direction in the text, so it never rests on color alone. */
export const signedFormat =
  (format: (value: number) => string) =>
  (value: number): string =>
    `${value > 0 ? "+" : ""}${format(value)}`

/** The minimal slice of the ECharts custom-series API these charts draw with. */
export interface CustomApi {
  coord: (point: number[]) => number[]
  size: (span: number[]) => number[]
}

export interface CustomParams {
  dataIndex: number
  coordSys: { x: number; y: number; width: number; height: number }
}

export const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length === 0) return 0
  return sorted.length % 2
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

const channelsOf = (color: string): number[] | null => {
  const value = color.trim()
  const hex = /^#([0-9a-f]{6})$/i.exec(value)?.[1]
  if (hex)
    return [0, 2, 4].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)).concat(1)
  const parts = /^rgba?\(([^)]+)\)$/i
    .exec(value)?.[1]
    ?.split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number)
  if (!parts || parts.length < 3 || parts.some(Number.isNaN)) return null
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1]
}

const luminance = ([r = 0, g = 0, b = 0]: number[]): number => {
  const linear = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** The theme's ink or its surface, whichever reads better on `fill` laid over the surface. */
export const inkOn = (tokens: ChartTokens, fill: string): string => {
  const top = channelsOf(fill)
  const paper = channelsOf(tokens.surface)
  const ink = channelsOf(tokens.fg)
  if (!top || !paper || !ink) return tokens.fg
  const alpha = top[3] ?? 1
  const ground = luminance(
    top.slice(0, 3).map((c, i) => c * alpha + (paper[i] ?? 0) * (1 - alpha)),
  )
  const contrast = (other: number) =>
    (Math.max(other, ground) + 0.05) / (Math.min(other, ground) + 0.05)
  return contrast(luminance(ink)) >= contrast(luminance(paper))
    ? tokens.fg
    : tokens.surface
}
