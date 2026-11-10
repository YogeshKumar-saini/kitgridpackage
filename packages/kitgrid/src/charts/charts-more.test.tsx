import { render, screen } from "@testing-library/react"
import { BoxplotChart, boxplotChartOption, boxplotStats } from "./boxplot-chart.js"
import { candlestickChartOption, movingAverage } from "./candlestick-chart.js"
import { graphChartOption, graphDegrees } from "./graph-chart.js"
import { HistogramChart, histogramBins, histogramChartOption } from "./histogram-chart.js"
import { lollipopChartOption } from "./lollipop-chart.js"
import { parallelChartOption } from "./parallel-chart.js"
import { pictorialBarChartOption } from "./pictorial-bar-chart.js"
import { progressRingChartOption, ringProgress } from "./progress-ring-chart.js"
import { radialStackedChartOption } from "./radial-stacked-chart.js"
import { slopeChartOption } from "./slope-chart.js"
import { percentRows, StackedPercentBar, stackedPercentBarOption } from "./stacked-percent-bar.js"
import { themeRiverChartOption } from "./theme-river-chart.js"
import { fallbackChartTokens as tokens } from "./tokens.js"
import { TreeChart, treeChartOption, treeRows } from "./tree-chart.js"
import { waffleCells, waffleChartOption } from "./waffle-chart.js"

const instance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
  isDisposed: () => false,
}

jest.mock("./echarts.js", () => ({ init: jest.fn(() => instance) }))

// ECharts types options as wide unions; these tests read them as plain records.
type Loose = Record<string, unknown> & { series: Record<string, unknown>[] }
const read = (option: unknown) => option as Loose
const first = (option: unknown) => read(option).series[0] as Record<string, unknown>

describe("candlestick", () => {
  const data = [
    { label: "Mon", open: 10, close: 12, low: 9, high: 13 },
    { label: "Tue", open: 12, close: 11, low: 10, high: 12.5 },
    { label: "Wed", open: 11, close: 14, low: 11, high: 15 },
  ]

  it("orders each candle open, close, low, high and adds an average line on request", () => {
    const option = read(candlestickChartOption({ data, average: 2 }, tokens))
    expect(first(option).data).toEqual([
      [10, 12, 9, 13],
      [12, 11, 10, 12.5],
      [11, 14, 11, 15],
    ])
    expect(option.series).toHaveLength(2)
    expect(option.series[1]?.data).toEqual([null, 11.5, 12.5])
  })

  it("averages over a window", () => {
    expect(movingAverage([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3])
  })
})

describe("boxplot", () => {
  it("computes Tukey whiskers and outliers", () => {
    const stats = boxplotStats([1, 2, 3, 4, 5, 6, 7, 8, 100])
    expect(stats.median).toBe(5)
    expect(stats.q1).toBe(3)
    expect(stats.q3).toBe(7)
    expect(stats.max).toBe(8)
    expect(stats.outliers).toEqual([100])
  })

  it("plots outliers as points beside their group", () => {
    const option = read(
      boxplotChartOption({ data: [{ label: "A", values: [1, 2, 3, 4, 5, 6, 7, 8, 100] }] }, tokens),
    )
    expect(option.series[1]?.data).toEqual([[0, 100]])
  })

  it("renders a hidden table and an empty note", () => {
    const { rerender } = render(
      <BoxplotChart label="Lead times" data={[{ label: "North", values: [2, 4, 6] }]} />,
    )
    expect(screen.getByRole("img", { name: "Lead times" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Median" })).toBeInTheDocument()
    rerender(<BoxplotChart data={[{ label: "North", values: [] }]} />)
    expect(screen.getByRole("note")).toHaveTextContent("No data to plot")
  })
})

describe("histogram", () => {
  it("bins on round edges and counts every value once", () => {
    const values = [1, 2, 2, 3, 7, 8, 9, 12, 15, 19]
    const bins = histogramBins(values, 4)
    expect(bins[0]?.x0).toBe(0)
    expect(bins.every((bin) => (bin.x1 - bin.x0) % 1 === 0 || bin.x1 - bin.x0 === 2.5)).toBe(true)
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(values.length)
  })

  it("handles a single repeated value", () => {
    expect(histogramBins([4, 4, 4])).toEqual([{ x0: 4, x1: 5, count: 3 }])
  })

  it("draws bins on a value axis and lists them in the table", () => {
    const option = read(histogramChartOption({ values: [1, 5, 9], bins: 2 }, tokens))
    expect((option.xAxis as { type: string }).type).toBe("value")
    render(<HistogramChart values={[1, 5, 9]} bins={2} />)
    expect(screen.getByRole("columnheader", { name: "Count" })).toBeInTheDocument()
  })
})

describe("slope", () => {
  it("draws one two-point line per row, colored by direction", () => {
    const option = read(
      slopeChartOption(
        {
          data: [
            { label: "A", from: 10, to: 20 },
            { label: "B", from: 20, to: 5 },
          ],
        },
        tokens,
      ),
    )
    expect(option.series).toHaveLength(2)
    expect((option.series[0]?.lineStyle as { color: string }).color).toBe(tokens.success)
    expect((option.series[1]?.lineStyle as { color: string }).color).toBe(tokens.danger)
  })
})

describe("stacked percent bar", () => {
  const data = [
    { region: "North", a: 30, b: 70 },
    { region: "South", a: 0, b: 0 },
  ]

  it("normalises each row to shares", () => {
    expect(percentRows(data, ["a", "b"])).toEqual([
      [0.3, 0.7],
      [0, 0],
    ])
    const option = read(stackedPercentBarOption({ data, xKey: "region" }, tokens))
    expect(option.series.every((entry) => entry.stack === "share")).toBe(true)
  })

  it("prints shares in the hidden table", () => {
    render(<StackedPercentBar data={data} xKey="region" />)
    expect(screen.getByRole("cell", { name: "70%" })).toBeInTheDocument()
  })
})

describe("parallel", () => {
  it("builds one axis per dimension and one line per row", () => {
    const option = read(
      parallelChartOption(
        {
          data: [
            { name: "X", price: 10, rating: 4 },
            { name: "Y", price: 20, rating: 3 },
          ],
          labelKey: "name",
          dimensions: [{ key: "price", inverse: true }, { key: "rating" }],
          highlight: ["X"],
        },
        tokens,
      ),
    )
    expect(option.parallelAxis).toHaveLength(2)
    const lines = first(option).data as { value: number[]; lineStyle: { color: string } }[]
    expect(lines[0]?.value).toEqual([10, 4])
    expect(lines[0]?.lineStyle.color).toBe(tokens.accent)
  })
})

describe("graph", () => {
  const nodes = [{ id: "a" }, { id: "b" }, { id: "c", group: "x" }]
  const links = [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "a", target: "missing" },
  ]

  it("counts degrees and drops links to unknown nodes", () => {
    expect(graphDegrees(nodes, links).get("a")).toBe(2)
    const series = first(graphChartOption({ nodes, links }, tokens))
    expect(series.links).toHaveLength(2)
    expect(series.layout).toBe("force")
  })

  it("names every node in a small graph, and only the larger ones in a crowded graph", () => {
    const shown = (count: number) => {
      const many = Array.from({ length: count }, (_, i) => ({ id: `n${i}` }))
      const spokes = many.slice(1).map((node) => ({ source: "n0", target: node.id }))
      const data = first(graphChartOption({ nodes: many, links: spokes }, tokens)).data as {
        label: { show: boolean }
      }[]
      return data.filter((node) => node.label.show).length
    }
    expect(shown(6)).toBe(6)
    expect(shown(20)).toBe(1)
  })
})

describe("tree", () => {
  const data = {
    label: "Root",
    children: [{ label: "A", children: [{ label: "A1", value: 3 }] }, { label: "B" }],
  }

  it("flattens nodes for the table with depth and parent", () => {
    expect(treeRows(data).map((row) => [row.label, row.parent, row.depth])).toEqual([
      ["Root", "", 0],
      ["A", "Root", 1],
      ["A1", "A", 2],
      ["B", "Root", 1],
    ])
  })

  it("lays out radially on request", () => {
    expect(first(treeChartOption({ data, orient: "radial" }, tokens)).layout).toBe("radial")
    render(<TreeChart data={data} label="Org" />)
    expect(screen.getByRole("img", { name: "Org" })).toBeInTheDocument()
  })
})

describe("theme river", () => {
  it("emits [time, value, name] triples on a time axis", () => {
    const option = read(
      themeRiverChartOption(
        { data: [{ day: "2026-01-01", a: 2, b: 3 }], xKey: "day" },
        tokens,
      ),
    )
    expect((option.singleAxis as { type: string }).type).toBe("time")
    expect(first(option).data).toEqual([
      [Date.parse("2026-01-01"), 2, "a"],
      [Date.parse("2026-01-01"), 3, "b"],
    ])
  })

  it("labels evenly spaced data dates, not month boundaries", () => {
    const weeks = Array.from({ length: 8 }, (_, i) => ({
      day: new Date(Date.UTC(2026, 6, 6 + i * 7)).toISOString().slice(0, 10),
      a: i,
    }))
    const option = themeRiverChartOption({ data: weeks, xKey: "day" }, tokens, 640)
    const axis = option.singleAxis as { axisLabel: { customValues: number[] } }
    expect(axis.axisLabel.customValues).toEqual(
      [0, 2, 4, 6].map((i) => Date.parse(weeks[i]?.day ?? "")),
    )
  })
})

describe("pictorial bar", () => {
  it("repeats symbols over a shared ceiling with a faint track", () => {
    const option = read(
      pictorialBarChartOption(
        { data: [{ label: "A", value: 5 }, { label: "B", value: 12 }], max: 10, symbol: "person" },
        tokens,
      ),
    )
    expect(option.series).toHaveLength(2)
    expect(option.series[1]?.symbolBoundingData).toBe(10)
    expect(String(option.series[1]?.symbol)).toMatch(/^path:\/\//)
    expect((option.series[1]?.data as { value: number }[])[1]?.value).toBe(10)
  })
})

describe("lollipop", () => {
  it("sorts descending and pairs each stem with a dot", () => {
    const option = read(
      lollipopChartOption(
        { data: [{ label: "A", value: 1 }, { label: "B", value: 3 }] },
        tokens,
      ),
    )
    expect((option.yAxis as { data: string[] }).data).toEqual(["B", "A"])
    expect((option.series[1]?.data as { value: number[] }[])[0]?.value).toEqual([3, 0])
  })
})

describe("waffle", () => {
  it("assigns cells by largest remainder so they total the grid", () => {
    const counts = waffleCells(
      [
        { label: "A", value: 1 },
        { label: "B", value: 1 },
        { label: "C", value: 1 },
      ],
      100,
    )
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(100)
    expect(counts).toEqual([34, 33, 33])
  })

  it("leaves cells empty beyond the data when a total is given", () => {
    expect(waffleCells([{ label: "A", value: 25 }], 100, 50)).toEqual([50])
    const option = read(waffleChartOption({ data: [{ label: "A", value: 25 }], total: 100 }, tokens))
    expect((option.series[1]?.data as number[]).length).toBe(75)
  })
})

describe("progress rings", () => {
  it("draws each ring as its share of its own target, capped at full", () => {
    expect(ringProgress({ label: "Move", value: 600, target: 400 })).toBe(1.5)
    const option = read(
      progressRingChartOption(
        {
          data: [
            { label: "Move", value: 600, target: 400 },
            { label: "Stand", value: 6, target: 12 },
          ],
        },
        tokens,
      ),
    )
    expect(option.series[0]?.data).toEqual([1, null])
    expect(option.series[1]?.data).toEqual([null, 0.5])
    expect(option.series[2]?.type).toBe("gauge")
  })
})

describe("radial stacked", () => {
  it("stacks every series on a polar grid", () => {
    const option = read(
      radialStackedChartOption(
        { data: [{ month: "Jan", a: 1, b: 2 }], xKey: "month" },
        tokens,
      ),
    )
    expect(option.series.every((entry) => entry.coordinateSystem === "polar")).toBe(true)
    expect(option.series.every((entry) => entry.stack === "total")).toBe(true)
  })
})
