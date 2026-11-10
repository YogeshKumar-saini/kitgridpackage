import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Clamp } from "./clamp.js"

const overflow = (value: boolean) => {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => (value ? 200 : 40),
  })
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 40,
  })
}

describe("Clamp", () => {
  afterEach(() => {
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight
  })

  it("hides the toggle when content fits", () => {
    overflow(false)
    render(<Clamp>Short note.</Clamp>)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("toggles an overflowing clamp and wires aria-controls", async () => {
    overflow(true)
    const user = userEvent.setup()
    const onExpandedChange = jest.fn()
    const { container } = render(
      <Clamp lines={2} onExpandedChange={onExpandedChange}>
        A long body of text.
      </Clamp>,
    )
    const toggle = screen.getByRole("button", { name: "Show more" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")).toBe(
      container.querySelector(".kg-clamp__body"),
    )
    await user.click(toggle)
    expect(onExpandedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    expect(container.firstElementChild).toHaveAttribute("data-state", "expanded")
  })
})
