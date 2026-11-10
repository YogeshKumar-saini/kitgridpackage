import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { JsonViewer } from "./json-viewer.js"

const data = {
  id: "ord_81",
  total: 129.5,
  paid: true,
  coupon: null,
  items: [{ sku: "TEE-M", qty: 2 }],
}

describe("JsonViewer", () => {
  it("expands to the default depth and colors primitives by kind", () => {
    render(<JsonViewer data={data} defaultExpandDepth={1} />)
    expect(screen.getByText('"ord_81"')).toHaveAttribute("data-kind", "string")
    expect(screen.getByText("129.5")).toHaveAttribute("data-kind", "number")
    expect(screen.getByText("null")).toHaveAttribute("data-kind", "null")
    const items = screen.getByRole("button", { name: /"items"/ })
    expect(items).toHaveAttribute("aria-expanded", "false")
    expect(items).toHaveTextContent("1 item")
  })

  it("toggles containers with the keyboard", async () => {
    const user = userEvent.setup()
    render(<JsonViewer data={data} defaultExpandDepth={1} />)
    const items = screen.getByRole("button", { name: /"items"/ })
    items.focus()
    await user.keyboard("{Enter}")
    expect(items).toHaveAttribute("aria-expanded", "true")
    const entry = screen.getByRole("button", { name: /2 items/ })
    await user.click(entry)
    expect(screen.getByText('"TEE-M"')).toBeInTheDocument()
  })

  it("survives circular references", () => {
    const loop: Record<string, unknown> = { name: "loop" }
    loop.self = loop
    render(<JsonViewer data={loop} defaultExpandDepth={5} />)
    expect(screen.getByText("circular")).toBeInTheDocument()
  })
})
