import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { type FilterChipOption, FilterChips } from "./filter-chips.js"

const materials: FilterChipOption[] = [
  { value: "linen", label: "Linen", count: 24 },
  { value: "cotton", label: "Cotton", count: 1 },
  { value: "wool", label: "Merino wool", count: 1280 },
  { value: "silk", label: "Silk", disabled: true },
  { value: "hemp", label: "Hemp" },
]

describe("FilterChips", () => {
  it("renders toggle buttons in a named group with counts in their names", () => {
    render(<FilterChips label="Material" options={materials} />)
    expect(screen.getByRole("group", { name: "Material" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Linen, 24 results" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    expect(screen.getByRole("button", { name: "Cotton, 1 result" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Merino wool, 1,280 results" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Hemp" })).toBeInTheDocument()
  })

  it("toggles several values in multiple mode", async () => {
    const onValueChange = jest.fn()
    render(
      <FilterChips
        label="Material"
        options={materials}
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /Linen/ }))
    await userEvent.click(screen.getByRole("button", { name: /Cotton/ }))
    expect(onValueChange).toHaveBeenLastCalledWith(["linen", "cotton"])
    expect(screen.getByRole("button", { name: /Linen/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await userEvent.click(screen.getByRole("button", { name: /Linen/ }))
    expect(onValueChange).toHaveBeenLastCalledWith(["cotton"])
  })

  it("keeps at most one value in single mode", async () => {
    const onValueChange = jest.fn()
    render(
      <FilterChips
        label="Sort"
        selectionMode="single"
        options={materials}
        defaultValue={["linen"]}
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /Cotton/ }))
    expect(onValueChange).toHaveBeenLastCalledWith(["cotton"])
    expect(screen.getByRole("button", { name: /Linen/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    await userEvent.click(screen.getByRole("button", { name: /Cotton/ }))
    expect(onValueChange).toHaveBeenLastCalledWith([])
  })

  it("does not toggle disabled chips", async () => {
    render(<FilterChips label="Material" options={materials} />)
    const silk = screen.getByRole("button", { name: "Silk" })
    expect(silk).toBeDisabled()
    await userEvent.click(silk)
    expect(silk).toHaveAttribute("aria-pressed", "false")
  })

  it("offers Clear all while anything is selected and moves focus back to the chips", async () => {
    render(<FilterChips label="Material" options={materials} defaultValue={["wool"]} />)
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }))
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull()
    expect(screen.getByRole("button", { name: /Merino/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    expect(screen.getByRole("button", { name: /Linen/ })).toHaveFocus()
  })

  it("collapses behind a +N more expander, keeping selected chips visible", async () => {
    render(
      <FilterChips
        label="Material"
        options={materials}
        maxVisible={2}
        defaultValue={["hemp"]}
      />,
    )
    expect(screen.queryByRole("button", { name: /Merino/ })).toBeNull()
    expect(screen.getByRole("button", { name: "Hemp" })).toBeInTheDocument()
    const more = screen.getByRole("button", { name: "+2 more" })
    expect(more).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(more)
    expect(screen.getByRole("button", { name: /Merino/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  it("works controlled", async () => {
    const Controlled = () => {
      const [value, setValue] = useState<string[]>(["linen"])
      return (
        <>
          <FilterChips
            label="Material"
            options={materials}
            value={value}
            onValueChange={setValue}
          />
          <output>{value.join(",")}</output>
        </>
      )
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole("button", { name: /Hemp/ }))
    expect(screen.getByRole("status")).toHaveTextContent("linen,hemp")
  })
})
