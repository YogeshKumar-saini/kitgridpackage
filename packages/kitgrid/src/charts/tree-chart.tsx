"use client"

import type { ChartCommonProps } from "./chart.js"
import type { EChartsOption } from "./echarts.js"
import { type ChartFormat, toFormatter } from "./format.js"
import { tooltipBase, tooltipHtml } from "./option-parts.js"
import { specChart } from "./spec-chart.js"
import type { ChartTokens } from "./tokens.js"

export interface TreeChartNode {
  label: string
  value?: number
  children?: TreeChartNode[]
}

export interface TreeChartSpec {
  data: TreeChartNode
  format?: ChartFormat
  /** `horizontal` grows left to right, `vertical` top to bottom, `radial` outward from the centre. */
  orient?: "horizontal" | "vertical" | "radial"
  /** Levels open on first render; deeper branches open on click. All open by default. */
  depth?: number
}

interface TreeItem {
  name: string
  value?: number
  children?: TreeItem[]
}

const toItem = (node: TreeChartNode): TreeItem => ({
  name: node.label,
  ...(node.value === undefined ? {} : { value: node.value }),
  ...(node.children?.length ? { children: node.children.map(toItem) } : {}),
})

/** Every node with its depth and parent, top-down, for the hidden table. */
export const treeRows = (
  node: TreeChartNode,
  parent = "",
  depth = 0,
): { label: string; parent: string; depth: number; value?: number }[] => [
  { label: node.label, parent, depth, value: node.value },
  ...(node.children ?? []).flatMap((child) => treeRows(child, node.label, depth + 1)),
]

const leafCount = (node: TreeChartNode): number =>
  node.children?.length ? node.children.reduce((sum, child) => sum + leafCount(child), 0) : 1

export const treeChartOption = (
  { data, orient = "horizontal", depth, ...spec }: TreeChartSpec,
  tokens: ChartTokens,
  width = 0,
): EChartsOption => {
  const format = toFormatter(spec.format)
  const radial = orient === "radial"
  const vertical = orient === "vertical"
  const narrow = width > 0 && width < 520
  const text = { color: tokens.fgMuted, fontFamily: tokens.font, fontSize: 11 }

  return {
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (params: unknown) => {
        const hit = params as { name: string; value?: number }
        return tooltipHtml(
          hit.name,
          typeof hit.value === "number" ? [{ name: "Value", value: format(hit.value) }] : [],
        )
      },
    },
    series: [
      {
        type: "tree",
        data: [toItem(data)],
        layout: radial ? "radial" : "orthogonal",
        orient: vertical ? "TB" : "LR",
        top: vertical ? 24 : 12,
        bottom: vertical ? 48 : 12,
        left: radial ? "12%" : vertical ? 12 : narrow ? 60 : 96,
        right: radial ? "12%" : vertical ? 12 : narrow ? 80 : 128,
        initialTreeDepth: depth ?? -1,
        expandAndCollapse: true,
        roam: false,
        symbol: "circle",
        symbolSize: 8,
        edgeShape: radial ? "curve" : "polyline",
        edgeForkPosition: "50%",
        itemStyle: { color: tokens.accent, borderColor: tokens.surface, borderWidth: 1.5 },
        lineStyle: { color: tokens.border, width: 1.25, curveness: 0.5 },
        emphasis: { focus: "relative" },
        blur: { itemStyle: { opacity: 0.3 }, lineStyle: { opacity: 0.2 } },
        label: {
          ...text,
          color: tokens.fg,
          position: vertical ? "top" : "left",
          verticalAlign: "middle",
          align: vertical ? "center" : "right",
          distance: 6,
          ...(vertical ? { rotate: 0 } : {}),
        },
        leaves: {
          label: {
            ...text,
            position: vertical ? "bottom" : "right",
            align: vertical ? "center" : "left",
            ...(vertical && leafCount(data) > 8 ? { rotate: -45, align: "left" } : {}),
          },
          itemStyle: {
            color: tokens.surface,
            borderColor: tokens.accent,
            borderWidth: 1.5,
          },
        },
        animationDurationUpdate: 420,
      },
    ],
  } as EChartsOption
}

export interface TreeChartProps extends ChartCommonProps, TreeChartSpec {}

/** A hierarchy as a tidy tree: parents filled, leaves hollow, branches collapse on click. */
export const TreeChart = specChart<TreeChartSpec>({
  name: "TreeChart",
  keys: ["data", "format", "orient", "depth"],
  option: treeChartOption,
  table: (spec) => {
    const print = toFormatter(spec.format)
    return {
      columns: ["Node", "Parent", "Level", "Value"],
      rows: treeRows(spec.data).map((row) => [
        row.label,
        row.parent || null,
        row.depth,
        row.value === undefined ? null : print(row.value),
      ]),
    }
  },
  isEmpty: (spec) => !spec.data?.label,
  label: "Tree chart",
  height: (spec) =>
    spec.orient === "horizontal" || spec.orient === undefined
      ? Math.max(Math.min(leafCount(spec.data) * 26 + 40, 640), 220)
      : 400,
})
