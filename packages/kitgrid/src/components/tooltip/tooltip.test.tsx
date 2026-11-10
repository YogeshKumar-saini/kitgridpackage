import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Tooltip, TooltipProvider } from "./tooltip.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const mouse = { pointerType: "mouse" }

const hover = (element: Element) => fireEvent.pointerEnter(element, mouse)
const unhover = (element: Element) => fireEvent.pointerLeave(element, mouse)

describe("Tooltip", () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it("opens after the hover delay and describes its trigger", () => {
    jest.useFakeTimers()
    render(
      <Tooltip content="Add to wishlist" delay={400}>
        <button type="button">Save</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole("button", { name: "Save" })
    hover(trigger)
    act(() => {
      jest.advanceTimersByTime(399)
    })
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(screen.getByRole("tooltip")).toHaveTextContent("Add to wishlist")
    expect(trigger).toHaveAccessibleDescription("Add to wishlist")
  })

  it("opens immediately on keyboard focus and closes on Escape without moving focus", async () => {
    render(
      <Tooltip content="Keyboard shortcut: S">
        <button type="button">Save</button>
      </Tooltip>,
    )
    await userEvent.tab()
    const trigger = screen.getByRole("button", { name: "Save" })
    expect(trigger).toHaveFocus()
    expect(screen.getByRole("tooltip")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger).not.toHaveAttribute("aria-describedby")
  })

  it("stays open while the pointer moves onto the bubble", () => {
    jest.useFakeTimers()
    render(
      <Tooltip content="Ships in 2 days" delay={0}>
        <button type="button">Delivery</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole("button", { name: "Delivery" })
    hover(trigger)
    act(() => {
      jest.advanceTimersByTime(0)
    })
    const bubble = screen.getByRole("tooltip")
    unhover(trigger)
    hover(bubble)
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(screen.getByRole("tooltip")).toBeInTheDocument()
    unhover(bubble)
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })

  it("skips the delay for neighbours inside a provider", () => {
    jest.useFakeTimers()
    render(
      <TooltipProvider delayDuration={600} skipDelayDuration={300}>
        <Tooltip content="Bold">
          <button type="button">B</button>
        </Tooltip>
        <Tooltip content="Italic">
          <button type="button">I</button>
        </Tooltip>
      </TooltipProvider>,
    )
    const bold = screen.getByRole("button", { name: "B" })
    const italic = screen.getByRole("button", { name: "I" })
    hover(bold)
    act(() => {
      jest.advanceTimersByTime(600)
    })
    expect(screen.getByRole("tooltip")).toHaveTextContent("Bold")
    unhover(bold)
    hover(italic)
    expect(screen.getByRole("tooltip")).toHaveTextContent("Italic")
  })

  it("never opens when disabled, and keeps the child's own description", async () => {
    render(
      <>
        <p id="hint">Saved items sync across devices</p>
        <Tooltip content="Save" disabled>
          <button type="button" aria-describedby="hint">
            Save
          </button>
        </Tooltip>
      </>,
    )
    await userEvent.tab()
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    expect(screen.getByRole("button")).toHaveAccessibleDescription(
      "Saved items sync across devices",
    )
  })

  it("hides when the trigger is pressed", async () => {
    render(
      <Tooltip content="Copy link" defaultOpen>
        <button type="button">Copy</button>
      </Tooltip>,
    )
    expect(screen.getByRole("tooltip")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Copy" }))
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })
})
