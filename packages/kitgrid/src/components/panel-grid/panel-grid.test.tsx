import { render, screen } from "@testing-library/react"
import { Panel, PanelTitle } from "../panel/panel.js"
import { PanelGrid } from "./panel-grid.js"

describe("PanelGrid", () => {
  it("renders its variant and gap and lets children declare spans", () => {
    const { container } = render(
      <PanelGrid variant="seam" gap="lg">
        <Panel span={8}>
          <PanelTitle>Sessions</PanelTitle>
        </Panel>
        <div data-span="4">Aside</div>
      </PanelGrid>,
    )
    const grid = container.firstElementChild as HTMLElement
    expect(grid).toHaveClass("kg-panel-grid")
    expect(grid).toHaveAttribute("data-variant", "seam")
    expect(grid).toHaveAttribute("data-gap", "lg")
    expect(screen.getByRole("region", { name: "Sessions" })).toHaveAttribute(
      "data-span",
      "8",
    )
    expect(screen.getByText("Aside")).toHaveAttribute("data-span", "4")
  })
})
