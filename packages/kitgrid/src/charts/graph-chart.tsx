"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import { legendOption, tooltipBase, tooltipHtml } from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import { type ChartTokens, withAlpha } from "./tokens.js"

export interface GraphChartNode {
  /** Unique, and what links refer to. */
  id: string
  label?: string
  /** Sizes the node. Its link count is used otherwise. */
  value?: number
  /** Nodes in one group share a color and a legend entry. */
  group?: string
}

export interface GraphChartLink {
  source: string
  target: string
  value?: number
}

export interface GraphChartSpec {
  nodes: GraphChartNode[]
  links: GraphChartLink[]
  format?: ChartFormat
  /** Names beside the larger nodes. On by default. */
  labels?: boolean
  /** Lets people drag nodes and pan the layout. */
  interactive?: boolean
}

/** Each node's number of links, the default measure of its weight. */
export const graphDegrees = (
  nodes: readonly GraphChartNode[],
  links: readonly GraphChartLink[],
): Map<string, number> => {
  const degrees = new Map(nodes.map((node) => [node.id, 0]))
  for (const link of links) {
    if (!degrees.has(link.source) || !degrees.has(link.target)) continue
    for (const end of [link.source, link.target]) degrees.set(end, (degrees.get(end) ?? 0) + 1)
  }
  return degrees
}

export const graphChartOption = (
  { nodes, links, labels = true, interactive = false, ...spec }: GraphChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const degrees = graphDegrees(nodes, links)
  const groups = [...new Set(nodes.map((node) => node.group ?? ""))].filter(Boolean)
  const weight = (node: GraphChartNode) => node.value ?? degrees.get(node.id) ?? 0
  const heaviest = Math.max(...nodes.map(weight), 1)
  const narrow = width > 0 && width < 520
  const legend = legendOption(tokens, groups.length > 1 ? "bottom" : false, groups.length)
  const known = new Set(nodes.map((node) => node.id))
  const strongest = Math.max(...links.map((link) => link.value ?? 1), 1)

  return {
    legend: { ...legend, icon: "circle", data: groups },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const hit = params as {
          dataType: "node" | "edge"
          name: string
          color: string
          data: { source?: string; target?: string; value?: number; group?: string }
        }
        if (hit.dataType === "edge")
          return tooltipHtml(`${hit.data.source ?? ""} to ${hit.data.target ?? ""}`, [
            ...(hit.data.value === undefined
              ? []
              : [{ name: "Weight", value: format(hit.data.value) }]),
          ])
        return tooltipHtml(hit.name, [
          ...(hit.data.group ? [{ name: "Group", color: hit.color, value: hit.data.group }] : []),
          { name: "Value", value: format(hit.data.value ?? 0) },
        ])
      },
    },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: interactive,
        draggable: interactive,
        top: 12,
        bottom: groups.length > 1 ? 40 : 12,
        left: 12,
        right: 12,
        force: {
          repulsion: narrow ? 90 : 160,
          gravity: 0.08,
          edgeLength: narrow ? [30, 70] : [50, 110],
          friction: 0.2,
        },
        categories: groups.map((name) => ({ name })),
        emphasis: { focus: "adjacency", lineStyle: { width: 2 } },
        blur: { itemStyle: { opacity: 0.2 }, lineStyle: { opacity: 0.05 } },
        lineStyle: { color: withAlpha(tokens.fgFaint, 0.5), width: 1, curveness: 0.12 },
        itemStyle: { borderColor: tokens.surface, borderWidth: 1.5 },
        label: {
          show: labels,
          position: "right",
          color: tokens.fgMuted,
          fontFamily: tokens.font,
          fontSize: 11,
        },
        labelLayout: { hideOverlap: true },
        data: nodes.map((node) => {
          const share = weight(node) / heaviest
          return {
            id: node.id,
            name: node.label ?? node.id,
            value: weight(node),
            group: node.group,
            category: node.group ? groups.indexOf(node.group) : undefined,
            symbolSize: 8 + share * (narrow ? 18 : 26),
            // In a crowded graph small nodes stay unlabelled so the names that matter are readable.
            label: { show: labels && (nodes.length <= 12 || share >= 0.34) },
          }
        }),
        links: links
          .filter((link) => known.has(link.source) && known.has(link.target))
          .map((link) => ({
            source: link.source,
            target: link.target,
            value: link.value,
            lineStyle: link.value
              ? { width: 0.75 + (link.value / strongest) * 2.5 }
              : undefined,
          })),
      },
    ],
  } as EChartsOption
}

export interface GraphChartProps extends ChartCommonProps, GraphChartSpec {}

/** A network: who connects to whom, laid out by force so clusters pull together. */
export const GraphChart = specChart<GraphChartSpec>({
  name: "GraphChart",
  keys: ["nodes", "links", "format", "labels", "interactive"],
  option: graphChartOption,
  table: (spec) => {
    const print = toFormatter(spec.format)
    return {
      columns: ["From", "To", "Weight"],
      rows: spec.links.map((link) => [
        link.source,
        link.target,
        link.value === undefined ? null : print(link.value),
      ]),
    }
  },
  isEmpty: (spec) => spec.nodes.length === 0,
  label: "Network graph",
  height: 380,
})
