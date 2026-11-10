"use client"

import type { ChartCommonProps, ChartSummary } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, formatPercent, toFormatter } from "./format.js"
import { tooltipBase, tooltipHtml } from "./option-parts.js"
import { inkOn, specChart } from "./spec-chart.js"
import { type ChartTokens, type ChartTone, colorOf, withAlpha } from "./tokens.js"

export interface SunburstChartNode {
  label: string
  /** A leaf's size. A parent without one is the sum of its children. */
  value?: number
  /** Top-level nodes take the next palette color, and their branch inherits it. */
  color?: ChartTone | string
  children?: SunburstChartNode[]
}

export type TreemapChartNode = SunburstChartNode

export interface SunburstChartSpec {
  data: SunburstChartNode[]
  format?: ChartFormat
  /** Names on the segments. */
  labels?: boolean
}

export type TreemapChartSpec = SunburstChartSpec

const sizeOf = (node: SunburstChartNode): number =>
  node.value ?? (node.children ?? []).reduce((sum, child) => sum + sizeOf(child), 0)

interface Painted {
  name: string
  value: number
  path: string
  itemStyle: { color: string }
  label: { color: string }
  children?: Painted[]
}

// Each ring outward fades a step toward the surface, so a branch reads as one hue.
const paint = (
  tokens: ChartTokens,
  nodes: readonly SunburstChartNode[],
  depth = 0,
  inherited?: string,
  trail = "",
): Painted[] =>
  nodes.map((node, index) => {
    const own =
      depth === 0 || node.color ? colorOf(tokens, node.color, index) : (inherited ?? "")
    const path = trail ? `${trail} / ${node.label}` : node.label
    const color =
      node.color || depth === 0 ? own : withAlpha(own, Math.max(1 - depth * 0.24, 0.35))
    return {
      name: node.label,
      value: sizeOf(node),
      path,
      itemStyle: { color },
      label: { color: inkOn(tokens, color) },
      ...(node.children?.length
        ? { children: paint(tokens, node.children, depth + 1, own, path) }
        : {}),
    }
  })

// Treemap tiles carry their labels, so they take light washes of the branch hue for the ink.
const soften = (tokens: ChartTokens, nodes: readonly Painted[]): Painted[] =>
  nodes.map((node) => {
    const color = withAlpha(node.itemStyle.color, node.children ? 0.55 : 0.34)
    return {
      ...node,
      itemStyle: { color },
      label: { color: inkOn(tokens, color) },
      ...(node.children ? { children: soften(tokens, node.children) } : {}),
    }
  })

const tooltip = (
  tokens: ChartTokens,
  total: number,
  format: (v: number) => string,
) => ({
  ...tooltipBase(tokens),
  trigger: "item" as const,
  formatter: (params: unknown) => {
    const hit = params as { data?: Painted; color: string }
    if (!hit.data?.path) return ""
    return tooltipHtml(hit.data.path, [
      { name: "Value", color: hit.color, value: format(hit.data.value) },
      {
        name: "Of total",
        value: formatPercent(total > 0 ? hit.data.value / total : 0),
      },
    ])
  },
})

export const sunburstChartOption = (
  { data, labels = true, ...spec }: SunburstChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const total = data.reduce((sum, node) => sum + sizeOf(node), 0)
  return {
    tooltip: tooltip(tokens, total, format),
    series: [
      {
        type: "sunburst",
        radius: ["16%", width > 0 && width < 420 ? "94%" : "90%"],
        sort: undefined,
        nodeClick: false,
        itemStyle: { borderColor: tokens.surface, borderWidth: 2, borderRadius: 3 },
        emphasis: { focus: "ancestor" },
        blur: { itemStyle: { opacity: 0.3 }, label: { opacity: 0.3 } },
        label: {
          show: labels,
          minAngle: 10,
          rotate: "radial",
          color: tokens.fg,
          fontFamily: tokens.font,
          fontSize: 10,
          overflow: "truncate",
        },
        data: paint(tokens, data),
      },
    ],
  } as EChartsOption
}

export const treemapChartOption = (
  { data, labels = true, ...spec }: TreemapChartSpec,
  tokens: ChartTokens,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const total = data.reduce((sum, node) => sum + sizeOf(node), 0)
  const nested = data.some((node) => node.children?.length)
  return {
    tooltip: tooltip(tokens, total, format),
    series: [
      {
        type: "treemap",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        squareRatio: 1.2,
        label: {
          show: labels,
          position: "insideTopLeft",
          padding: [6, 8],
          formatter: (params: { name: string; value: number }) =>
            `{name|${params.name}}\n{value|${format(params.value)}}`,
          rich: {
            name: {
              color: tokens.fg,
              fontFamily: tokens.font,
              fontSize: 11,
              lineHeight: 15,
            },
            value: {
              color: tokens.fgMuted,
              fontFamily: tokens.fontMono,
              fontSize: 10,
              lineHeight: 14,
            },
          },
        },
        upperLabel: {
          show: nested && labels,
          height: 22,
          color: tokens.fg,
          fontFamily: tokens.font,
          fontSize: 11,
          fontWeight: 600,
          padding: [0, 8],
          formatter: (params: { name: string }) => params.name,
        },
        // levels[0] is the invisible root, so the first visible level is levels[1].
        levels: [
          { itemStyle: { borderWidth: 0, gapWidth: 3 }, upperLabel: { show: false } },
          {
            itemStyle: {
              borderColor: tokens.surface,
              borderWidth: nested ? 2 : 0,
              gapWidth: 2,
              borderRadius: 6,
            },
          },
          { itemStyle: { borderWidth: 0, gapWidth: 1, borderRadius: 3 } },
        ],
        data: soften(tokens, paint(tokens, data)),
      },
    ],
  } as EChartsOption
}

export const hierarchyTable = ({ data, format }: SunburstChartSpec): ChartSummary => {
  const print = toFormatter(format)
  const rows: (string | number | null)[][] = []
  const walk = (nodes: readonly SunburstChartNode[], trail: string) => {
    for (const node of nodes) {
      const path = trail ? `${trail} / ${node.label}` : node.label
      if (node.children?.length) walk(node.children, path)
      else rows.push([path, print(sizeOf(node))])
    }
  }
  walk(data, "")
  return { columns: ["Path", "Value"], rows }
}

export interface SunburstChartProps extends ChartCommonProps, SunburstChartSpec {}
export interface TreemapChartProps extends ChartCommonProps, TreemapChartSpec {}

/** A hierarchy as rings: the centre is the whole, each ring outward a level down. */
export const SunburstChart = specChart<SunburstChartSpec>({
  name: "SunburstChart",
  keys: ["data", "format", "labels"],
  option: sunburstChartOption,
  table: hierarchyTable,
  isEmpty: (spec) => spec.data.length === 0,
  label: "Sunburst chart",
  height: 360,
})

/** A hierarchy as nested tiles, each sized by its value. */
export const TreemapChart = specChart<TreemapChartSpec>({
  name: "TreemapChart",
  keys: ["data", "format", "labels"],
  option: (spec, tokens) => treemapChartOption(spec, tokens),
  table: hierarchyTable,
  isEmpty: (spec) => spec.data.length === 0,
  label: "Treemap",
  height: 340,
})
