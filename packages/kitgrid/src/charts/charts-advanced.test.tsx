import { render, screen } from "@testing-library/react"
import { bandChartOption } from "./band-chart.js"
import { bulletChartOption } from "./bullet-chart.js"
import { dumbbellChartOption } from "./dumbbell-chart.js"
import { funnelChartOption } from "./funnel-chart.js"
import { HeatmapChart, heatmapChartOption } from "./heatmap-chart.js"
import {
  sunburstChartOption,
  TreemapChart,
  treemapChartOption,
} from "./hierarchy-chart.js"
import { mekkoBlocks, mekkoChartOption } from "./mekko-chart.js"
import { polarBarChartOption } from "./polar-bar-chart.js"
import { RadarChart, radarChartOption } from "./radar-chart.js"
import { sankeyChartOption } from "./sankey-chart.js"
import { scatterChartOption } from "./scatter-chart.js"
import { inkOn } from "./spec-chart.js"
import { fallbackChartTokens as tokens } from "./tokens.js"
import {
  WaterfallChart,
  waterfallBars,
  waterfallChartOption,
} from "./waterfall-chart.js"

const instance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
  isDisposed: () => false,
}

jest.mock("./echarts.js", () => ({ init: jest.fn(() => instance) }))

// ECharts types options as wide unions; these assertions read them as plain records.
type Key =
  | "angleAxis"
  | "areaStyle"
  | "calendar"
  | "children"
  | "color"
  | "coordinateSystem"
  | "data"
  | "encode"
  | "formatter"
  | "indicator"
  | "inRange"
  | "itemStyle"
  | "label"
  | "lineStyle"
  | "map"
  | "markArea"
  | "markLine"
  | "max"
  | "name"
  | "radar"
  | "radiusAxis"
  | "range"
  | "roundCap"
  | "series"
  | "show"
  | "sort"
  | "stackStrategy"
  | "symbolSize"
  | "tooltip"
  | "type"
  | "upperLabel"
  | "value"
  | "visualMap"
  | "xAxis"
  | "yAxis"
  | 0
  | 1
  | 2
  | 3
type Loose = ((...args: unknown[]) => Loose) & { [K in Key]: Loose }
const loose = (option: unknown) => option as Loose

describe("radarChartOption", () => {
  const data = [
    { metric: "Margin", lisbon: 0.32, porto: 0.41 },
    { metric: "Growth", lisbon: 0.12, porto: 0.05 },
  ]

  it("scales each spoke to its own largest value unless a max is given", () => {
    const option = loose(radarChartOption({ data, xKey: "metric" }, tokens))
    expect(option.radar.indicator).toEqual([
      { name: "Margin", max: 0.41 },
      { name: "Growth", max: 0.12 },
    ])
    expect(option.series[0].data.map((d: Loose) => d.value)).toEqual([
      [0.32, 0.12],
      [0.41, 0.05],
    ])
    expect(option.series[0].data[0].areaStyle).toBeDefined()

    const capped = loose(
      radarChartOption({ data, xKey: "metric", max: 1, filled: false }, tokens),
    )
    expect(capped.radar.indicator[1].max).toBe(1)
    expect(capped.series[0].data[0].areaStyle).toBeUndefined()
  })
})

describe("heatmapChartOption", () => {
  const cells = [
    { x: "Mon", y: "Lisbon", value: 4 },
    { x: "Tue", y: "Lisbon", value: 10 },
    { x: "Mon", y: "Porto", value: -2 },
  ]

  it("indexes cells by category and maps the range to the scale", () => {
    const option = loose(heatmapChartOption({ data: cells }, tokens))
    expect(option.xAxis.data).toEqual(["Mon", "Tue"])
    expect(option.yAxis.data).toEqual(["Lisbon", "Porto"])
    expect(option.series[0].data.map((d: Loose) => d.value)).toEqual([
      [0, 0, 4],
      [1, 0, 10],
      [0, 1, -2],
    ])
    expect(option.visualMap).toMatchObject({ min: -2, max: 10 })
  })

  it("centres a diverging scale on zero", () => {
    const option = loose(
      heatmapChartOption({ data: cells, scheme: "diverging" }, tokens),
    )
    expect(option.visualMap).toMatchObject({ min: -10, max: 10 })
    expect(option.visualMap.inRange.color[0]).toBe(tokens.danger)
  })

  it("lays days out on a calendar", () => {
    const option = loose(
      heatmapChartOption(
        {
          days: [
            { date: "2026-03-02", value: 3 },
            { date: "2026-01-05", value: 1 },
          ],
        },
        tokens,
      ),
    )
    expect(option.calendar.range).toEqual(["2026-01-05", "2026-03-02"])
    expect(option.series[0].coordinateSystem).toBe("calendar")
  })
})

describe("waterfallBars", () => {
  it("floats deltas on the running sum and closes open totals", () => {
    const bars = waterfallBars([
      { label: "Opening", value: 100, kind: "total" },
      { label: "Price", value: 30 },
      { label: "Volume", value: -50 },
      { label: "Closing", kind: "total" },
    ])
    expect(bars.map((bar) => [bar.low, bar.high, bar.level])).toEqual([
      [0, 100, 100],
      [100, 130, 130],
      [80, 130, 80],
      [0, 80, 80],
    ])
  })

  it("tones changes by sign, flipped by invert", () => {
    const steps = [
      { label: "Start", value: 10, kind: "total" as const },
      { label: "Up", value: 5 },
      { label: "End", kind: "total" as const },
    ]
    const option = loose(waterfallChartOption({ data: steps }, tokens))
    expect(option.series[0].encode).toEqual({ x: 0, y: [1, 2] })
    const html = option.tooltip.formatter({ dataIndex: 1 })
    expect(html).toContain("+5")
    expect(html).toContain(tokens.success)
    const inverted = loose(waterfallChartOption({ data: steps, invert: true }, tokens))
    expect(inverted.tooltip.formatter({ dataIndex: 1 })).toContain(tokens.danger)
  })
})

describe("sankeyChartOption", () => {
  it("adds nodes named only by links and colors flows by source", () => {
    const option = loose(
      sankeyChartOption(
        {
          nodes: [{ name: "Visits", color: "info" }],
          links: [
            { source: "Visits", target: "Cart", value: 40 },
            { source: "Cart", target: "Paid", value: 12 },
          ],
        },
        tokens,
      ),
    )
    expect(option.series[0].data.map((node: Loose) => node.name)).toEqual([
      "Visits",
      "Cart",
      "Paid",
    ])
    expect(option.series[0].data[0].itemStyle.color).toBe(tokens.info)
    expect(option.series[0].lineStyle.color).toBe("source")
  })
})

const tree = [
  {
    label: "Apparel",
    children: [
      { label: "Outerwear", value: 60 },
      { label: "Knitwear", value: 40 },
    ],
  },
  { label: "Footwear", value: 50 },
]

describe("hierarchy charts", () => {
  it("sums parents and lets a branch inherit its root color", () => {
    const option = loose(sunburstChartOption({ data: tree }, tokens))
    const apparel = option.series[0].data[0]
    const footwear = option.series[0].data[1]
    expect(apparel.value).toBe(100)
    expect(apparel.itemStyle.color).toBe(tokens.palette[0])
    expect(footwear.itemStyle.color).toBe(tokens.palette[1])
    expect(apparel.children[0].itemStyle.color).toMatch(/^rgba\(242, 138, 46/)
    expect(
      option.tooltip.formatter({ data: apparel.children[0], color: "red" }),
    ).toContain("Apparel / Outerwear")
  })

  it("washes treemap tiles so labels stay legible", () => {
    const option = loose(treemapChartOption({ data: tree }, tokens))
    expect(option.series[0].upperLabel.show).toBe(true)
    expect(option.series[0].data[1].itemStyle.color).toMatch(/, 0\.34\)$/)
  })
})

describe("funnelChartOption", () => {
  it("keeps stage order and reports conversion from the first and previous stage", () => {
    const data = [
      { label: "Visits", value: 1000 },
      { label: "Cart", value: 250 },
      { label: "Paid", value: 100 },
    ]
    const option = loose(funnelChartOption({ data }, tokens))
    expect(option.series[0].sort).toBe("none")
    const html = option.tooltip.formatter({ dataIndex: 2 })
    expect(html).toContain("10%")
    expect(html).toContain("40%")
  })
})

describe("scatterChartOption", () => {
  const data = [
    { label: "Lisbon", x: 1, y: 10, size: 400, group: "South" },
    { label: "Porto", x: 3, y: 30, size: 100, group: "North" },
    { label: "Braga", x: 5, y: 20, size: 25, group: "North" },
  ]

  it("splits groups into series and sizes bubbles by area", () => {
    const option = loose(scatterChartOption({ data }, tokens))
    expect(option.series.map((s: Loose) => s.name)).toEqual(["South", "North"])
    expect(option.series[0].data[0].symbolSize).toBe(76)
    expect(option.series[1].data[0].symbolSize).toBeCloseTo((8 + 30 * 0.5) * 2)
  })

  it("draws dividers at the medians and names the quadrants", () => {
    const option = loose(
      scatterChartOption(
        { data, quadrants: { labels: ["Stars", "Niche", "Laggards", "Volume"] } },
        tokens,
      ),
    )
    expect(option.series[0].markLine.data).toEqual([{ xAxis: 3 }, { yAxis: 20 }])
    expect(option.series[0].markArea.data[0][0].label.formatter).toBe("Stars")
    expect(option.series[1].markArea).toBeUndefined()
  })
})

describe("dumbbellChartOption", () => {
  it("orders rows and tones the change by direction", () => {
    const option = loose(
      dumbbellChartOption(
        {
          data: [
            { label: "Lisbon", from: 10, to: 14 },
            { label: "Porto", from: 20, to: 16 },
          ],
          sort: "desc",
        },
        tokens,
      ),
    )
    expect(option.yAxis.data).toEqual(["Porto", "Lisbon"])
    expect(option.series[2].data).toEqual([
      [16, 0],
      [14, 1],
    ])
    const html = option.tooltip.formatter([{ dataIndex: 1, seriesIndex: 0 }])
    expect(html).toContain("+40%")
    expect(html).toContain(tokens.success)
  })
})

describe("bulletChartOption", () => {
  it("shares one scale wide enough for every value, target and band", () => {
    const option = loose(
      bulletChartOption(
        { data: [{ label: "Revenue", value: 80, target: 90, bands: [50, 75, 100] }] },
        tokens,
      ),
    )
    expect(option.xAxis.max).toBeCloseTo(104)
    expect(option.tooltip.formatter([{ dataIndex: 0, seriesIndex: 0 }])).toContain(
      "88.9%",
    )
  })
})

describe("mekkoBlocks", () => {
  it("makes columns as wide as their total and segments as tall as their share", () => {
    const { blocks, grand } = mekkoBlocks(
      [
        { region: "North", online: 30, retail: 10 },
        { region: "South", online: 15, retail: 45 },
      ],
      ["online", "retail"],
    )
    expect(grand).toBe(100)
    expect(blocks[1]).toMatchObject({ x0: 0, x1: 0.4, y0: 0.75, y1: 1 })
    expect(blocks[2]).toMatchObject({ x0: 0.4, x1: 1, y0: 0, y1: 0.25 })
  })

  it("draws one custom series per segment", () => {
    const option = loose(
      mekkoChartOption(
        { data: [{ region: "North", online: 30, retail: 10 }], xKey: "region" },
        tokens,
      ),
    )
    expect(option.series.map((s: Loose) => s.type)).toEqual(["custom", "custom"])
  })
})

describe("polarBarChartOption", () => {
  it("sweeps the largest ring 270 degrees, or reaches out as a rose", () => {
    const data = [
      { label: "Lisbon", value: 30 },
      { label: "Porto", value: 60 },
    ]
    const radial = loose(polarBarChartOption({ data }, tokens))
    expect(radial.angleAxis.max).toBe(80)
    expect(radial.series[0].roundCap).toBe(true)
    const rose = loose(polarBarChartOption({ data, variant: "rose" }, tokens))
    expect(rose.angleAxis.type).toBe("category")
    expect(rose.radiusAxis.max).toBe(60)
  })
})

describe("bandChartOption", () => {
  it("stacks the range on its floor and keeps band fields out of the lines", () => {
    const option = loose(
      bandChartOption(
        {
          data: [
            { week: "W1", actual: 10, low: null, high: null, mid: null },
            { week: "W2", actual: null, low: 8, high: 14, mid: 11 },
          ],
          xKey: "week",
          band: { low: "low", high: "high", mid: "mid" },
          markers: [{ x: "W1", label: "Today" }],
        },
        tokens,
      ),
    )
    expect(option.series.map((s: Loose) => s.name)).toEqual([
      "",
      "Range",
      "Projected",
      "actual",
    ])
    expect(option.series[1].data).toEqual([null, 6])
    expect(option.series[1].stackStrategy).toBe("all")
    expect(option.series[3].markLine.data[0]).toEqual({ xAxis: "W1", name: "Today" })
  })
})

describe("spec charts", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 640,
    })
  })

  beforeEach(() => instance.setOption.mockClear())

  it("names the plot, describes it and spreads DOM props on the root", () => {
    render(
      <WaterfallChart
        label="Revenue bridge"
        data-testid="bridge"
        data={[
          { label: "Opening", value: 100, kind: "total" },
          { label: "Price", value: 12 },
        ]}
      />,
    )
    expect(screen.getByRole("img", { name: "Revenue bridge" })).toBeInTheDocument()
    expect(screen.getByTestId("bridge")).toHaveClass("kg-chart")
    expect(screen.getByRole("cell", { name: "+12" })).toBeInTheDocument()
    expect(instance.setOption).toHaveBeenCalled()
  })

  it("does not redraw for equal inline data", () => {
    const data = () => [{ metric: "Margin", a: 1, b: 2 }]
    const { rerender } = render(<RadarChart data={data()} xKey="metric" />)
    const calls = instance.setOption.mock.calls.length
    rerender(<RadarChart data={data()} xKey="metric" />)
    expect(instance.setOption.mock.calls.length).toBe(calls)
  })

  it("shows the empty note, and a table row per leaf", () => {
    render(<HeatmapChart data={[]} empty="No sessions yet" />)
    expect(screen.getByText("No sessions yet")).toBeInTheDocument()
    render(<TreemapChart label="Mix" data={tree} />)
    expect(screen.getByRole("cell", { name: "Apparel / Knitwear" })).toBeInTheDocument()
  })
})

describe("inkOn", () => {
  it("picks the ink that contrasts with the fill as laid over the surface", () => {
    expect(inkOn(tokens, "#1b1d22")).toBe(tokens.surface)
    expect(inkOn(tokens, "rgb(250, 250, 250)")).toBe(tokens.fg)
    // A faint wash of a dark color still reads as the light surface underneath.
    expect(inkOn(tokens, "rgba(27, 29, 34, 0.1)")).toBe(tokens.fg)
    const dark = { ...tokens, fg: "#eeeeee", surface: "#111111" }
    expect(inkOn(dark, "rgba(242, 138, 46, 0.2)")).toBe(dark.fg)
  })
})
