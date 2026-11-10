import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { SegmentedControl, type SegmentedControlOption } from "./segmented-control.js"

type View = "grid" | "list" | "map"

const options: SegmentedControlOption<View>[] = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
  { value: "map", label: "Map", disabled: true },
]

describe("SegmentedControl", () => {
  it("renders a named radiogroup and selects the first enabled option by default", () => {
    render(<SegmentedControl aria-label="View" options={options} />)
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Grid" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Map" })).toBeDisabled()
  })

  it("selects on click and with arrow keys", async () => {
    const onValueChange = jest.fn<(value: View) => void>()
    render(
      <SegmentedControl<View>
        aria-label="View"
        options={options}
        defaultValue="grid"
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(screen.getByText("List"))
    expect(screen.getByRole("radio", { name: "List" })).toBeChecked()
    expect(onValueChange).toHaveBeenLastCalledWith("list")
    await userEvent.keyboard("{ArrowLeft}")
    expect(screen.getByRole("radio", { name: "Grid" })).toBeChecked()
    expect(onValueChange).toHaveBeenLastCalledWith("grid")
  })

  it("follows a controlled value", async () => {
    const Controlled = () => {
      const [value, setValue] = useState<View>("list")
      return (
        <>
          <SegmentedControl
            aria-label="View"
            options={options}
            value={value}
            onValueChange={setValue}
          />
          <output>{value}</output>
        </>
      )
    }
    render(<Controlled />)
    expect(screen.getByRole("radio", { name: "List" })).toBeChecked()
    await userEvent.click(screen.getByText("Grid"))
    expect(screen.getByRole("status")).toHaveTextContent("grid")
  })

  it("names icon-only options through aria-label", () => {
    render(
      <SegmentedControl
        aria-label="Align"
        options={[
          { value: "left", icon: <svg />, "aria-label": "Align left" },
          { value: "right", icon: <svg />, "aria-label": "Align right" },
        ]}
      />,
    )
    expect(screen.getByRole("radio", { name: "Align right" })).toBeInTheDocument()
  })

  it("defaults to the default variant and exposes pill and underline", () => {
    const { rerender } = render(
      <SegmentedControl aria-label="View" options={options} />,
    )
    const group = screen.getByRole("radiogroup")
    expect(group).toHaveAttribute("data-variant", "default")
    rerender(<SegmentedControl aria-label="View" options={options} variant="pill" />)
    expect(group).toHaveAttribute("data-variant", "pill")
    rerender(
      <SegmentedControl aria-label="View" options={options} variant="underline" />,
    )
    expect(group).toHaveAttribute("data-variant", "underline")
  })

  it("marks the selected item for the sliding thumb", async () => {
    const { container } = render(
      <SegmentedControl aria-label="View" options={options} />,
    )
    await userEvent.click(screen.getByText("List"))
    const checked = container.querySelectorAll('[data-state="checked"]')
    expect(checked).toHaveLength(1)
    expect(checked[0]).toHaveTextContent("List")
  })
})
