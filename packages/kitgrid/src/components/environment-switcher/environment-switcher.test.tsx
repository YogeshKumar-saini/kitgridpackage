import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { EnvironmentSwitcher } from "./environment-switcher.js"

describe("EnvironmentSwitcher", () => {
  it("is a radio group with one tab stop and default environments", () => {
    render(<EnvironmentSwitcher aria-label="Environment" />)
    expect(screen.getByRole("radiogroup", { name: "Environment" })).toBeInTheDocument()
    const radios = screen.getAllByRole("radio")
    expect(radios.map((radio) => radio.textContent)).toEqual(["Development", "Staging", "Production"])
    expect(radios[0]).toHaveAttribute("aria-checked", "true")
    expect(radios[1]).toHaveAttribute("tabindex", "-1")
  })

  it("selects on arrow keys and click", async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(<EnvironmentSwitcher aria-label="Environment" onValueChange={onValueChange} />)
    await user.tab()
    await user.keyboard("{ArrowRight}")
    expect(onValueChange).toHaveBeenLastCalledWith("staging")
    expect(screen.getByRole("radio", { name: "Staging" })).toHaveFocus()
    await user.click(screen.getByRole("radio", { name: "Production" }))
    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-tone", "danger")
  })
})
