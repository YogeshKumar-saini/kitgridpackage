import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Tabs, TabsContent, TabsList, TabsTrigger, type TabsProps } from "./tabs.js"

const Product = (props: Partial<TabsProps>) => (
  <Tabs defaultValue="details" {...props}>
    <TabsList aria-label="Product information">
      <TabsTrigger value="details">Details</TabsTrigger>
      <TabsTrigger value="shipping">Shipping</TabsTrigger>
      <TabsTrigger value="returns" disabled>
        Returns
      </TabsTrigger>
      <TabsTrigger value="reviews">Reviews</TabsTrigger>
    </TabsList>
    <TabsContent value="details">Organic cotton.</TabsContent>
    <TabsContent value="shipping">Free over $50.</TabsContent>
    <TabsContent value="returns">30 days.</TabsContent>
    <TabsContent value="reviews" forceMount>
      <input aria-label="Review" />
    </TabsContent>
  </Tabs>
)

describe("Tabs", () => {
  it("wires tablist, tabs and panels together", () => {
    render(<Product />)
    expect(
      screen.getByRole("tablist", { name: "Product information" }),
    ).toHaveAttribute("aria-orientation", "horizontal")
    const details = screen.getByRole("tab", { name: "Details" })
    const panel = screen.getByRole("tabpanel", { name: "Details" })
    expect(details).toHaveAttribute("aria-selected", "true")
    expect(details).toHaveAttribute("aria-controls", panel.id)
    expect(panel).toHaveTextContent("Organic cotton.")
    expect(details).toHaveAttribute("tabindex", "0")
    expect(screen.getByRole("tab", { name: "Shipping" })).toHaveAttribute(
      "tabindex",
      "-1",
    )
  })

  it("selects on focus in automatic mode, skipping disabled tabs and wrapping", async () => {
    const onValueChange = jest.fn()
    render(<Product onValueChange={onValueChange} />)
    await userEvent.tab()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Shipping" })).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith("shipping")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Free over $50.")
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Reviews" })).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Details" })).toHaveFocus()
    await userEvent.keyboard("{End}")
    expect(screen.getByRole("tab", { name: "Reviews" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  it("only moves focus in manual mode until Enter activates", async () => {
    render(<Product activationMode="manual" />)
    await userEvent.tab()
    await userEvent.keyboard("{ArrowRight}")
    const shipping = screen.getByRole("tab", { name: "Shipping" })
    expect(shipping).toHaveFocus()
    expect(shipping).toHaveAttribute("aria-selected", "false")
    await userEvent.keyboard("{Enter}")
    expect(shipping).toHaveAttribute("aria-selected", "true")
  })

  it("uses vertical arrows when vertical", async () => {
    render(<Product orientation="vertical" />)
    await userEvent.tab()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Details" })).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("tab", { name: "Shipping" })).toHaveFocus()
  })

  it("keeps force-mounted panels in the DOM, hidden, preserving state", async () => {
    render(<Product />)
    const input = screen.getByRole("textbox", { hidden: true })
    expect(input.closest("[role=tabpanel]")).toHaveAttribute("hidden")
    await userEvent.click(screen.getByRole("tab", { name: "Reviews" }))
    await userEvent.type(screen.getByRole("textbox", { name: "Review" }), "Great")
    await userEvent.click(screen.getByRole("tab", { name: "Details" }))
    await userEvent.click(screen.getByRole("tab", { name: "Reviews" }))
    expect(screen.getByRole("textbox", { name: "Review" })).toHaveValue("Great")
  })

  it("can be controlled", async () => {
    const onValueChange = jest.fn()
    render(<Product value="shipping" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("tab", { name: "Details" }))
    expect(onValueChange).toHaveBeenCalledWith("details")
    expect(screen.getByRole("tab", { name: "Shipping" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })
})
