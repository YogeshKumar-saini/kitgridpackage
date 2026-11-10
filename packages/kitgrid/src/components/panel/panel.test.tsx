import { fireEvent, render, screen } from "@testing-library/react"
import {
  Panel,
  PanelActions,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelMeta,
  PanelTitle,
} from "./panel.js"

describe("Panel", () => {
  it("names the region after its title and exposes layout as data attributes", () => {
    render(
      <Panel variant="raised" span={4} spanMd={6} rowSpan={2} marks>
        <PanelHeader>
          <PanelTitle>Revenue by channel</PanelTitle>
          <PanelMeta>last 30 days</PanelMeta>
          <PanelActions>
            <button type="button">Export</button>
          </PanelActions>
        </PanelHeader>
        <PanelBody>Chart</PanelBody>
        <PanelFooter>Updated 2 min ago</PanelFooter>
      </Panel>,
    )
    const region = screen.getByRole("region", { name: "Revenue by channel" })
    expect(region).toHaveAttribute("data-variant", "raised")
    expect(region).toHaveAttribute("data-span", "4")
    expect(region).toHaveAttribute("data-span-md", "6")
    expect(region).toHaveAttribute("data-row-span", "2")
    expect(region).toHaveAttribute("data-marks")
    expect(
      screen.getByRole("heading", { level: 2, name: "Revenue by channel" }),
    ).toBeInTheDocument()
  })

  it("folds the body behind a disclosure button when collapsible", () => {
    const onOpenChange = jest.fn()
    render(
      <Panel collapsible onOpenChange={onOpenChange}>
        <PanelHeader>
          <PanelTitle as="h3">Top products</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <a href="/products">All products</a>
        </PanelBody>
      </Panel>,
    )
    const toggle = screen.getByRole("button", { name: "Top products" })
    const body = document.getElementById(toggle.getAttribute("aria-controls") ?? "")
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(body?.inert).toBe(false)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(body).toHaveAttribute("data-state", "closed")
    expect(body?.inert).toBe(true)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("follows a controlled open and ignores clicks until the parent agrees", () => {
    const { rerender } = render(
      <Panel collapsible open={false}>
        <PanelTitle>Refunds</PanelTitle>
        <PanelBody>Body</PanelBody>
      </Panel>,
    )
    const toggle = screen.getByRole("button", { name: "Refunds" })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    rerender(
      <Panel collapsible open>
        <PanelTitle>Refunds</PanelTitle>
        <PanelBody>Body</PanelBody>
      </Panel>,
    )
    expect(toggle).toHaveAttribute("aria-expanded", "true")
  })
})
