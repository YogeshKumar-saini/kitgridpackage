import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { FeatureFlagList } from "./feature-flag-list.js"

const environments = [
  { id: "dev", label: "Dev" },
  { id: "prod", label: "Prod" },
]

describe("FeatureFlagList", () => {
  it("renders a named switch for the current environment and written env states", () => {
    render(
      <FeatureFlagList
        environments={environments}
        environment="prod"
        flags={[{ id: "f1", name: "New billing", flagKey: "new-billing", enabled: { dev: true, prod: false } }]}
      />,
    )
    const toggle = screen.getByRole("switch", { name: "New billing in Prod" })
    expect(toggle).not.toBeChecked()
    const envs = within(screen.getByRole("list", { name: "New billing by environment" })).getAllByRole("listitem")
    expect(envs[0]).toHaveTextContent("Dev: on")
    expect(envs[1]).toHaveTextContent("Prod: off")
  })

  it("toggles and reports the environment", async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()
    render(
      <FeatureFlagList
        environments={environments}
        environment="prod"
        onToggle={onToggle}
        flags={[{ id: "f1", name: "New billing", enabled: { dev: true, prod: false } }]}
      />,
    )
    await user.click(screen.getByRole("switch"))
    expect(onToggle).toHaveBeenCalledWith("f1", "prod", true)
    expect(screen.getByRole("switch")).toBeChecked()
    expect(screen.getByText(/Prod/, { selector: "li" })).toHaveTextContent("Prod: on")
  })
})
