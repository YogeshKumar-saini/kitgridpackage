import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ProductBanner } from "./product-banner.js"

describe("ProductBanner", () => {
  it("renders title, description and action, and dismisses", async () => {
    const user = userEvent.setup()
    const onOpenChange = jest.fn()
    render(
      <ProductBanner
        title="You're at 92% of your query limit."
        description="Resets Nov 1."
        action={<button type="button">Upgrade</button>}
        dismissible
        onOpenChange={onOpenChange}
      />,
    )
    expect(screen.getByText("You're at 92% of your query limit.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByText("Resets Nov 1.")).toBeNull()
  })
})
