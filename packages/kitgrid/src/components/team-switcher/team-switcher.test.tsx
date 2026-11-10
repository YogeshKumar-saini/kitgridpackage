import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { TeamSwitcher, type TeamSwitcherTeam } from "./team-switcher.js"

const teams: TeamSwitcherTeam[] = [
  { id: "eng", name: "Engineering", key: "EN" },
  { id: "growth", name: "Growth", key: "GR" },
]

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("TeamSwitcher", () => {
  it("lists teams as radio items and switches", async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(<TeamSwitcher teams={teams} onValueChange={onValueChange} />)
    const trigger = screen.getByRole("button", { name: /Engineering/ })
    await user.click(trigger)
    expect(screen.getByRole("group", { name: "Teams" })).toBeInTheDocument()
    expect(screen.getByRole("menuitemradio", { name: /Engineering/ })).toHaveAttribute("aria-checked", "true")
    await user.click(screen.getByRole("menuitemradio", { name: /Growth/ }))
    expect(onValueChange).toHaveBeenCalledWith("growth")
    expect(screen.getByRole("button", { name: /Growth/ })).toBeInTheDocument()
  })

  it("names a compact trigger and offers create", async () => {
    const user = userEvent.setup()
    const onCreate = jest.fn()
    render(<TeamSwitcher teams={teams} compact onCreate={onCreate} />)
    await user.click(screen.getByRole("button", { name: "Teams: Engineering" }))
    await user.click(screen.getByRole("menuitem", { name: "New team" }))
    expect(onCreate).toHaveBeenCalled()
  })
})
