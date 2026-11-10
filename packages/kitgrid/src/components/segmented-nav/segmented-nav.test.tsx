import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SegmentedNav } from "./segmented-nav.js"

const items = [
  { value: "overview", label: "Overview", href: "#overview" },
  { value: "activity", label: "Activity", href: "#activity" },
  { value: "settings", label: "Settings" },
]

describe("SegmentedNav", () => {
  it("renders navigation links with the current page marked", () => {
    render(<SegmentedNav aria-label="Project" items={items} defaultValue="activity" />)
    expect(screen.getByRole("navigation", { name: "Project" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Activity" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current")
  })

  it("updates the current item on click", async () => {
    const onValueChange = jest.fn()
    render(<SegmentedNav aria-label="Project" items={items} onValueChange={onValueChange} />)
    const settings = screen.getByRole("button", { name: "Settings" })
    await userEvent.click(settings)
    expect(settings).toHaveAttribute("aria-current", "page")
    expect(onValueChange).toHaveBeenCalledWith("settings")
  })

  it("renders href items through renderLink", async () => {
    render(
      <SegmentedNav
        aria-label="Project"
        items={items}
        renderLink={({ href, ...props }) => <a data-router="" href={href} {...props} />}
      />,
    )
    const link = screen.getByRole("link", { name: "Activity" })
    expect(link).toHaveAttribute("data-router")
    await userEvent.click(link)
    expect(link).toHaveAttribute("aria-current", "page")
  })
})
