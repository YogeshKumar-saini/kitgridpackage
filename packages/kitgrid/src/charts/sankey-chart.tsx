"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import { tooltipBase, tooltipHtml } from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, type ChartTone, colorOf } from "./tokens.js"

export interface SankeyChartNode {
  /** Unique, and what links refer to. */
  name: string
  color?: ChartTone | string
}

export interface SankeyChartLink {
  source: string
  target: string
  value: number
}

export interface SankeyChartSpec {
  links: SankeyChartLink[]
  /** Order and colors. Nodes only named in `links` are added in order of appearance. */
  nodes?: SankeyChartNode[]
  format?: ChartFormat
  orient?: "horizontal" | "vertical"
}

export const sankeyNodes = ({
  links,
  nodes = [],
}: SankeyChartSpec): SankeyChartNode[] => {
  const known = new Map(nodes.map((node) => [node.name, node]))
  for (const link of links)
    for (const name of [link.source, link.target])
      if (!known.has(name)) known.set(name, { name })
  return [...known.values()]
}

export const sankeyChartOption = (
  spec: SankeyChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const nodes = sankeyNodes(spec)
  const vertical = spec.orient === "vertical"
  const narrow = width > 0 && width < 520

  return {
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const hit = params as {
          dataType: "node" | "edge"
          name: string
          value: number
          color: string
          data: { source?: string; target?: string }
        }
        return hit.dataType === "edge"
          ? tooltipHtml(`${hit.data.source ?? ""} to ${hit.data.target ?? ""}`, [
              { name: "Flow", color: hit.color, value: format(hit.value) },
            ])
          : tooltipHtml(hit.name, [{ name: "Total", value: format(hit.value) }])
      },
    },
    series: [
      {
        type: "sankey",
        orient: spec.orient ?? "horizontal",
        left: 4,
        top: 8,
        bottom: vertical ? 28 : 8,
        right: vertical ? 4 : narrow ? 84 : 120,
        nodeWidth: 10,
        nodeGap: 12,
        nodeAlign: "justify",
        draggable: false,
        emphasis: { focus: "adjacency" },
        blur: { lineStyle: { opacity: 0.08 }, itemStyle: { opacity: 0.4 } },
        lineStyle: { color: "source", opacity: 0.3, curveness: 0.5 },
        itemStyle: { borderWidth: 0, borderRadius: 2 },
        label: {
          color: tokens.fg,
          fontFamily: tokens.font,
          fontSize: 11,
          ...(vertical ? { position: "bottom" } : {}),
          formatter: (params: { name: string; value: number }) =>
            `{name|${params.name}}  {value|${format(params.value)}}`,
          rich: {
            name: { color: tokens.fg, fontFamily: tokens.font, fontSize: 11 },
            value: { color: tokens.fgFaint, fontFamily: tokens.fontMono, fontSize: 10 },
          },
        },
        data: nodes.map((node, index) => ({
          name: node.name,
          itemStyle: { color: colorOf(tokens, node.color, index) },
        })),
        links: spec.links.map((link) => ({ ...link })),
      },
    ],
  } as EChartsOption
}

export interface SankeyChartProps extends ChartCommonProps, SankeyChartSpec {}

/** Where a quantity goes: flows between stages, each band as wide as its value. */
export const SankeyChart = specChart<SankeyChartSpec>({
  name: "SankeyChart",
  keys: ["links", "nodes", "format", "orient"],
  option: sankeyChartOption,
  table: (spec) => {
    const print = toFormatter(spec.format)
    return {
      columns: ["From", "To", "Value"],
      rows: spec.links.map((link) => [link.source, link.target, print(link.value)]),
    }
  },
  isEmpty: (spec) => spec.links.length === 0,
  label: "Flow chart",
  height: 340,
})
