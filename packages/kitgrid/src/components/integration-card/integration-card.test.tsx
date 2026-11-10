import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { IntegrationCard } from "./integration-card.js"

describe("IntegrationCard", () => {
  it("connects after the callback resolves and can disconnect", async () => {
    const user = userEvent.setup()
    const onConnect = jest.fn(() => Promise.resolve())
    const onConnectedChange = jest.fn()
    render(
      <IntegrationCard
        name="Snowflake"
        category="Warehouse"
        onConnect={onConnect}
        onConnectedChange={onConnectedChange}
      />,
    )
    expect(screen.getByRole("article", { name: "Snowflake" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Connect Snowflake" }))
    expect(onConnect).toHaveBeenCalled()
    expect(onConnectedChange).toHaveBeenCalledWith(true)
    expect(screen.getByText("Connected")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Disconnect Snowflake" }))
    expect(onConnectedChange).toHaveBeenLastCalledWith(false)
  })
})
