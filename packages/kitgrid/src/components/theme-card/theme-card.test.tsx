import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ThemeCard } from "./theme-card.js"

describe("ThemeCard", () => {
  it("is a radio named by its label with a themed, hidden preview", async () => {
    const onChange = jest.fn()
    const { container } = render(
      <div role="radiogroup" aria-label="Theme">
        <ThemeCard name="theme" value="light" theme="light" label="Daylight" />
        <ThemeCard
          name="theme"
          value="dark"
          theme="dark"
          label="Graphite"
          accent="oklch(0.7 0.12 190)"
          swatches={["oklch(0.7 0.12 190)"]}
          onChange={onChange}
        />
      </div>,
    )
    await userEvent.click(screen.getByRole("radio", { name: "Graphite" }))
    expect(screen.getByRole("radio", { name: "Graphite" })).toBeChecked()
    expect(onChange).toHaveBeenCalledTimes(1)
    const previews = container.querySelectorAll(".kg-appearance-preview")
    expect(previews[1]).toHaveAttribute("data-theme", "dark")
    expect(previews[1]?.closest("[aria-hidden='true']")).not.toBeNull()
  })
})
