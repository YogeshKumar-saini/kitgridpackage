import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { KeyValue } from "./key-value.js"

describe("KeyValue", () => {
  it("pairs label and value", () => {
    render(<KeyValue label="Region" value="eu-west-2" />)
    expect(screen.getByRole("term")).toHaveTextContent("Region")
    expect(screen.getByRole("definition")).toHaveTextContent("eu-west-2")
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("copies the value and confirms it", async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    render(<KeyValue label="Key" value="pk_live_93" copyable />)
    await user.click(screen.getByRole("button", { name: "Copy" }))
    expect(writeText).toHaveBeenCalledWith("pk_live_93")
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Copied")
  })

  it("prefers copyValue over the rendered value", async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    render(
      <KeyValue label="Token" value={<b>sk_••••</b>} copyValue="sk_full" copyable mono />,
    )
    await user.click(screen.getByRole("button", { name: "Copy" }))
    expect(writeText).toHaveBeenCalledWith("sk_full")
  })
})
