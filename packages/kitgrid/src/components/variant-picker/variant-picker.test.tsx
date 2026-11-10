import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import {
  findVariant,
  resolveVariantAvailability,
  type VariantCombination,
  withVariantAvailability,
} from "./variant-availability.js"
import { type VariantOption, VariantPicker } from "./variant-picker.js"

const colors: VariantOption[] = [
  { value: "sage", label: "Sage", color: "oklch(0.7 0.05 150)" },
  { value: "sand", label: "Sand", color: "oklch(0.85 0.04 80)" },
  { value: "ink", label: "Ink", color: "oklch(0.25 0.03 260)", available: false },
]

const sizes: VariantOption[] = [
  { value: "S", label: "S" },
  { value: "M", label: "M", hint: "Low stock" },
  { value: "L", label: "L", available: false },
]

describe("VariantPicker", () => {
  it("is a fieldset whose legend names the option", () => {
    render(<VariantPicker label="Color" type="swatch" options={colors} />)
    const group = screen.getByRole("group", { name: "Color" })
    expect(within(group).getAllByRole("radio")).toHaveLength(3)
    expect(screen.getByRole("radio", { name: "Sage" })).toBeInTheDocument()
  })

  it("shows the selected name in the legend without changing the group name", async () => {
    render(
      <VariantPicker
        label="Color"
        type="swatch"
        options={colors}
        defaultValue="sage"
      />,
    )
    expect(screen.getByText("Sage", { selector: "span" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("radio", { name: "Sand" }))
    expect(screen.getByRole("radio", { name: "Sand" })).toBeChecked()
    const legend = screen.getByRole("group").querySelector("legend")
    expect(legend).toHaveTextContent("Color: Sand")
    expect(screen.getByRole("group", { name: "Color" })).toBeInTheDocument()
  })

  it("announces sold-out options and blocks them by default", async () => {
    const onValueChange = jest.fn()
    render(
      <VariantPicker label="Color" options={colors} onValueChange={onValueChange} />,
    )
    const ink = screen.getByRole("radio", { name: "Ink (sold out)" })
    expect(ink).toBeDisabled()
    await userEvent.click(ink)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("lets shoppers choose sold-out options with allowUnavailable", async () => {
    const onValueChange = jest.fn()
    render(
      <VariantPicker
        label="Color"
        options={colors}
        allowUnavailable
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(screen.getByRole("radio", { name: "Ink (sold out)" }))
    expect(onValueChange).toHaveBeenCalledWith("ink", colors[2])
  })

  it("moves selection with arrow keys, skipping unavailable options", async () => {
    render(<VariantPicker label="Size" options={sizes} defaultValue="S" />)
    screen.getByRole("radio", { name: "S" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("radio", { name: "M, Low stock" })).toBeChecked()
  })

  it("reads hints after the label on chips", () => {
    render(<VariantPicker label="Size" options={sizes} />)
    expect(screen.getByRole("radio", { name: "M, Low stock" })).toBeInTheDocument()
    expect(screen.getByText("Low stock")).toBeVisible()
  })

  it("supports a controlled value and numeric values", async () => {
    const Controlled = () => {
      const [ml, setMl] = useState<number | null>(50)
      return (
        <>
          <VariantPicker
            label="Volume"
            value={ml}
            onValueChange={(next) => setMl(next)}
            options={[
              { value: 50, label: "50 ml" },
              { value: 100, label: "100 ml" },
            ]}
          />
          <output>{ml}</output>
        </>
      )
    }
    render(<Controlled />)
    expect(screen.getByRole("radio", { name: "50 ml" })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: "100 ml" }))
    expect(screen.getByRole("status")).toHaveTextContent("100")
  })

  it("renders image tiles with decorative images", () => {
    const { container } = render(
      <VariantPicker
        label="Finish"
        type="image"
        options={[{ value: "oak", label: "Oak", image: "/oak.jpg" }]}
      />,
    )
    expect(container.querySelector("img")).toHaveAttribute("alt", "")
    expect(screen.getByRole("radio", { name: "Oak" })).toBeInTheDocument()
  })

  it("shares one radio name and forwards required", () => {
    render(<VariantPicker label="Size" options={sizes} name="size" required />)
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveAttribute("name", "size")
      expect(radio).toBeRequired()
    }
  })
})

describe("resolveVariantAvailability", () => {
  const variants: VariantCombination[] = [
    { options: { color: "sage", size: "S" }, quantity: 4 },
    { options: { color: "sage", size: "M" }, quantity: 0 },
    { options: { color: "sand", size: "M" }, quantity: 2 },
    { options: { color: "sand", size: "L" }, available: false },
    { options: { color: "ink", size: "L" } },
  ]

  it("reports every in-stock value when nothing is selected", () => {
    expect(resolveVariantAvailability({}, variants)).toEqual({
      color: { sage: true, sand: true, ink: true },
      size: { S: true, M: true, L: true },
    })
  })

  it("greys out combinations that cannot be bought with the current selection", () => {
    const result = resolveVariantAvailability({ color: "sage" }, variants)
    expect(result.size).toEqual({ S: true, M: false, L: false })
    // An option ignores its own selection so shoppers can switch color freely.
    expect(result.color).toEqual({ sage: true, sand: true, ink: true })
  })

  it("narrows every option by the others", () => {
    const result = resolveVariantAvailability({ color: "sand", size: "L" }, variants)
    expect(result.size).toEqual({ S: false, M: true, L: false })
    expect(result.color).toEqual({ sage: false, sand: false, ink: true })
  })

  it("finds the chosen variant and merges availability into options", () => {
    expect(findVariant({ color: "sand", size: "M" }, variants)).toBe(variants[2])
    expect(findVariant({ color: "sand" }, variants)).toBeUndefined()
    const merged = withVariantAvailability(
      sizes,
      resolveVariantAvailability({ color: "sage" }, variants).size,
    )
    expect(merged.map((option) => option.available)).toEqual([true, false, false])
  })
})
