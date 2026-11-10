import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { OptionTile } from "./option-tile.js"

describe("OptionTile", () => {
  it("is a native radio named by its label, with arrow-key selection", async () => {
    const onChange = jest.fn()
    render(
      <div role="radiogroup" aria-label="Density">
        <OptionTile
          name="density"
          value="compact"
          label="Compact"
          onChange={onChange}
        />
        <OptionTile
          name="density"
          value="comfy"
          label="Comfortable"
          description="More air"
          defaultChecked
        />
        <OptionTile name="density" value="spacious" label="Spacious" disabled />
      </div>,
    )
    const comfy = screen.getByRole("radio", { name: /Comfortable/ })
    expect(comfy).toBeChecked()
    expect(screen.getByRole("radio", { name: "Spacious" })).toBeDisabled()
    await userEvent.click(screen.getByText("Compact"))
    expect(screen.getByRole("radio", { name: "Compact" })).toBeChecked()
    expect(onChange).toHaveBeenCalledTimes(1)
    await userEvent.keyboard("{ArrowRight}")
    expect(comfy).toBeChecked()
  })
})
