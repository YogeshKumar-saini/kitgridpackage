import { render, screen } from "@testing-library/react"
import { Readout } from "../readout/readout.js"
import { KpiStrip } from "./kpi-strip.js"

describe("KpiStrip", () => {
  it("lists each readout as an item of a named list and skips empty children", () => {
    render(
      <KpiStrip label="Key metrics" minItemWidth="12rem">
        <Readout label="Orders" value="1,284" />
        {false}
        <Readout label="Conversion" value="3.4%" />
      </KpiStrip>,
    )
    const list = screen.getByRole("list", { name: "Key metrics" })
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(list.style.getPropertyValue("--kg-kpi-strip-min")).toBe("12rem")
  })
})
