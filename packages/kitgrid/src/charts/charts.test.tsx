import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { areaChartOption, AreaChart, LineChart, lineChartOption } from "./line-chart.js"
import { barChartOption, divergingBarsOption, rankedBarsOption } from "./bar-chart.js"
import { comboChartOption } from "./combo-chart.js"
import { donutChartOption } from "./donut-chart.js"
import { formatCompact, formatPercent, toFormatter } from "./format.js"
import { gaugeChartOption } from "./gauge-chart.js"
import { SparkGrid, sparklineOption } from "./sparkline.js"
import { colorOf, fallbackChartTokens as tokens, withAlpha } from "./tokens.js"

const instance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
  isDisposed: () => false,
}

jest.mock("./echarts.js", () => ({ init: jest.fn(() => instance) }))

// The option keys these assertions read; ECharts types them as wide unions.
type Key =
  | "areaStyle"
  | "color"
  | "colorStops"
  | "coord"
  | "data"
  | "every"
  | "find"
  | "formatter"
  | "graphic"
  | "inverse"
  | "itemStyle"
  | "legend"
  | "map"
  | "markLine"
  | "markPoint"
  | "max"
  | "min"
  | "name"
  | "pointer"
  | "radius"
  | "series"
  | "show"
  | "stack"
  | "style"
  | "text"
  | "tooltip"
  | "type"
  | "value"
  | "xAxis"
  | "yAxis"
  | "yAxisIndex"
  | 0
  | 1
  | 2
type Loose = ((...args: unknown[]) => Loose) & { [K in Key]: Loose }
const loose = (option: unknown) => option as Loose

const months = [
  { month: "Jan", revenue: 1200, orders: 40 },
  { month: "Feb", revenue: 1800, orders: 55 },
  { month: "Mar", revenue: 1500, orders: 50 },
]

describe("format", () => {
  it("prints compact numbers, currency and percentages", () => {
    expect(formatCompact(1_234_567)).toBe("1.2M")
    expect(formatCompact(48_200, { currency: "USD" })).toBe("$48.2K")
    expect(formatPercent(0.124)).toBe("12.4%")
    expect(toFormatter({ style: "currency", currency: "EUR" })(12)).toBe("€12.00")
    expect(toFormatter((value) => `${value} pts`)(3)).toBe("3 pts")
  })
})

describe("tokens", () => {
  it("re-alphas hex and rgb colors", () => {
    expect(withAlpha("#ff8000", 0.5)).toBe("rgba(255, 128, 0, 0.5)")
    expect(withAlpha("rgb(10, 20, 30)", 0.2)).toBe("rgba(10, 20, 30, 0.2)")
  })

  it("maps tones and cycles the palette", () => {
    expect(colorOf(tokens, "danger")).toBe(tokens.danger)
    expect(colorOf(tokens, undefined, 0)).toBe(tokens.accent)
    expect(colorOf(tokens, undefined, tokens.palette.length + 1)).toBe(
      tokens.palette[1],
    )
  })
})

describe("lineChartOption", () => {
  it("infers series from numeric fields and marks the latest point", () => {
    const option = loose(lineChartOption({ data: months, xKey: "month" }, tokens))
    expect(option.series.map((s: Loose) => s.name)).toEqual(["revenue", "orders"])
    expect(option.xAxis.data).toEqual(["Jan", "Feb", "Mar"])
    expect(option.series[0].markPoint.data[0].coord).toEqual([2, 1500])
    expect(option.legend.show).toBe(true)
  })

  it("stacks, fills and rules a reference line", () => {
    const option = loose(
      lineChartOption(
        {
          data: months,
          xKey: "month",
          series: ["revenue"],
          stacked: true,
          area: true,
          reference: { value: 1400, label: "Goal" },
        },
        tokens,
      ),
    )
    expect(option.series[0].stack).toBe("total")
    expect(option.series[0].areaStyle).toBeDefined()
    expect(option.series[0].markLine.data).toEqual([{ yAxis: 1400 }])
    expect(option.legend.show).toBe(false)
  })

  it("escapes data labels in the tooltip", () => {
    const option = loose(
      lineChartOption(
        {
          data: [
            { x: "<img>", y: 1 },
            { x: "b", y: 2 },
          ],
          xKey: "x",
        },
        tokens,
      ),
    )
    const html = option.tooltip.formatter([{ dataIndex: 0, seriesIndex: 0 }])
    expect(html).toContain("&lt;img&gt;")
    expect(html).not.toContain("<img>")
  })
})

describe("areaChartOption", () => {
  it("turns values into shares in percent mode", () => {
    const option = loose(
      areaChartOption({ data: months, xKey: "month", mode: "percent" }, tokens),
    )
    expect(option.yAxis.max).toBe(1)
    expect(option.series[0].data[0]).toBeCloseTo(1200 / 1240)
  })

  it("rests a stream on a hidden base at minus half the total", () => {
    const option = loose(
      areaChartOption({ data: months, xKey: "month", mode: "stream" }, tokens),
    )
    expect(option.series).toHaveLength(3)
    expect(option.series[0].data[0]).toBe(-620)
    expect(option.yAxis.show).toBe(false)
  })
})

describe("barChartOption", () => {
  it("swaps the axes for horizontal bars", () => {
    const option = loose(
      barChartOption(
        { data: months, xKey: "month", orientation: "horizontal", stacked: true },
        tokens,
      ),
    )
    expect(option.xAxis.type).toBe("value")
    expect(option.yAxis.type).toBe("category")
    expect(option.yAxis.inverse).toBe(true)
    expect(option.series.every((s: Loose) => (s.stack as unknown) === "total")).toBe(
      true,
    )
  })
})

const regions = [
  { label: "North", value: 30 },
  { label: "South", value: -12 },
  { label: "East", value: 55 },
  { label: "West", value: 8 },
]

describe("rankedBarsOption", () => {
  it("sorts largest first and keeps the limit", () => {
    const option = loose(rankedBarsOption({ data: regions, limit: 2 }, tokens))
    expect(option.yAxis.data).toEqual(["East", "North"])
    expect(option.series[0].data.map((d: Loose) => d.value)).toEqual([55, 30])
  })
})

describe("divergingBarsOption", () => {
  it("tones by sign, flips with invert and stays symmetric", () => {
    const option = loose(divergingBarsOption({ data: regions }, tokens))
    const south = option.series[0].data.find((d: Loose) => (d.value as unknown) === -12)
    expect(south.itemStyle.color.colorStops[0].color).toBe(tokens.danger)
    expect(Number(option.xAxis.min)).toBe(-Number(option.xAxis.max))

    const inverted = loose(divergingBarsOption({ data: regions, invert: true }, tokens))
    const flipped = inverted.series[0].data.find(
      (d: Loose) => (d.value as unknown) === -12,
    )
    expect(flipped.itemStyle.color.colorStops[0].color).toBe(tokens.success)
  })
})

it("scales to small ratios rather than a floor of one", () => {
  const option = loose(
    divergingBarsOption({ data: [{ label: "Swim", value: -0.04 }] }, tokens),
  )
  expect(Number(option.xAxis.max)).toBeCloseTo(0.052)
})

describe("comboChartOption", () => {
  it("puts lines on a second axis", () => {
    const option = loose(
      comboChartOption(
        { data: months, xKey: "month", bars: ["revenue"], lines: ["orders"] },
        tokens,
      ),
    )
    expect(option.yAxis).toHaveLength(2)
    expect(option.series[0].type).toBe("bar")
    expect(option.series[1]).toMatchObject({ type: "line", yAxisIndex: 1 })

    const single = loose(
      comboChartOption(
        {
          data: months,
          xKey: "month",
          bars: ["revenue"],
          lines: ["orders"],
          dualAxis: false,
        },
        tokens,
      ),
    )
    expect(single.yAxis).toHaveLength(1)
    expect(single.series[1].yAxisIndex).toBe(0)
  })
})

describe("donutChartOption", () => {
  it("prints the total in the hole, and none for a pie", () => {
    const option = loose(
      donutChartOption({ data: regions.slice(0, 2), centerLabel: "Units" }, tokens),
    )
    expect(option.graphic[0].style.text).toContain("18")
    expect(option.graphic[0].style.text).toContain("Units")

    const pie = loose(donutChartOption({ data: regions, variant: "pie" }, tokens))
    expect(pie.series[0].radius[0]).toBe("0%")
    expect(pie.graphic).toEqual([])
  })
})

describe("sparklineOption", () => {
  it("dots the last real value and rules the reference", () => {
    const option = loose(
      sparklineOption({ values: [3, 5, 4, null], reference: 4 }, tokens),
    )
    expect(option.series[0].markPoint.data[0].coord).toEqual([2, 4])
    expect(option.series[0].markLine.data).toEqual([{ yAxis: 4 }])
  })
})

describe("gaugeChartOption", () => {
  it("clamps the value and adds a target tick", () => {
    const option = loose(gaugeChartOption({ value: 140, max: 120, target: 90 }, tokens))
    expect(option.series[0].data[0].value).toBe(120)
    expect(option.series[1].pointer.show).toBe(true)
    expect(option.series[1].data[0].value).toBe(90)
  })
})

describe("Chart", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 640,
    })
  })

  beforeEach(() => {
    instance.setOption.mockClear()
    instance.dispose.mockClear()
  })

  it("names the plot, describes it with a table and draws the option", () => {
    const { unmount } = render(
      <LineChart data={months} xKey="month" label="Monthly revenue" />,
    )
    const plot = screen.getByRole("img", { name: "Monthly revenue" })
    const table = screen.getByRole("table")
    expect(plot).toHaveAttribute("aria-describedby", table.id)
    expect(screen.getByRole("columnheader", { name: "revenue" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "1.8K" })).toBeInTheDocument()
    expect(instance.setOption).toHaveBeenCalled()
    const [option] = instance.setOption.mock.lastCall ?? []
    expect(loose(option).color).toEqual(tokens.palette)
    unmount()
    expect(instance.dispose).toHaveBeenCalled()
  })

  it("holds a busy skeleton until the first draw, then clears it", () => {
    const html = renderToString(<LineChart data={months} xKey="month" label="Revenue" />)
    expect(html).toContain('data-state="loading"')
    expect(html).toContain('aria-busy="true"')
    render(<LineChart data={months} xKey="month" label="Revenue" />)
    const plot = screen.getByRole("img", { name: "Revenue" })
    expect(plot).toHaveAttribute("data-state", "ready")
    expect(plot).not.toHaveAttribute("aria-busy")
  })

  it("does not redraw when a parent re-renders with equal inline data", () => {
    const { rerender } = render(<AreaChart data={[...months]} xKey="month" />)
    const calls = instance.setOption.mock.calls.length
    rerender(<AreaChart data={[...months]} xKey="month" />)
    expect(instance.setOption.mock.calls.length).toBe(calls)
  })

  it("shows the empty note instead of a canvas", () => {
    render(<LineChart data={[]} xKey="month" empty="Nothing sold yet" />)
    expect(screen.getByText("Nothing sold yet")).toBeInTheDocument()
    expect(screen.queryByRole("img")).toBeNull()
  })
})

describe("SparkGrid", () => {
  it("renders one KPI tile per item", () => {
    render(
      <SparkGrid
        aria-label="Stores"
        items={[
          { label: "Lisbon", value: 48200, delta: 12, trend: [1, 3, 2, 5] },
          { label: "Porto", value: 31000, delta: -4, trend: [4, 3, 3, 2] },
        ]}
        format="currency"
      />,
    )
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByText("$48.2K")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /Porto trend/ })).toBeInTheDocument()
  })
})
