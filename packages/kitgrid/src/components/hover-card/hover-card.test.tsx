import { act, fireEvent, render, screen } from "@testing-library/react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

const Example = () => (
  <HoverCard openDelay={300} closeDelay={100}>
    <HoverCardTrigger>
      <a href="#maya">@maya</a>
    </HoverCardTrigger>
    <HoverCardContent>Maya Okafor</HoverCardContent>
  </HoverCard>
)

describe("HoverCard", () => {
  it("opens after the hover delay and closes after leaving", () => {
    render(<Example />)
    const link = screen.getByRole("link", { name: "@maya" })
    fireEvent.pointerEnter(link, { pointerType: "mouse" })
    expect(screen.queryByText("Maya Okafor")).not.toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(320)
    })
    expect(screen.getByText("Maya Okafor")).toBeInTheDocument()
    expect(link).toHaveAttribute("aria-describedby")
    fireEvent.pointerLeave(link, { pointerType: "mouse" })
    act(() => {
      jest.advanceTimersByTime(120)
    })
    expect(screen.queryByText("Maya Okafor")).not.toBeInTheDocument()
  })

  it("opens on keyboard focus and closes on Escape", () => {
    render(<Example />)
    act(() => {
      screen.getByRole("link").focus()
      jest.advanceTimersByTime(320)
    })
    expect(screen.getByText("Maya Okafor")).toBeInTheDocument()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByText("Maya Okafor")).not.toBeInTheDocument()
  })

  it("stays open while the pointer is over the card", () => {
    render(<Example />)
    const link = screen.getByRole("link")
    fireEvent.pointerEnter(link, { pointerType: "mouse" })
    act(() => {
      jest.advanceTimersByTime(320)
    })
    fireEvent.pointerLeave(link, { pointerType: "mouse" })
    fireEvent.pointerEnter(screen.getByText("Maya Okafor"), { pointerType: "mouse" })
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(screen.getByText("Maya Okafor")).toBeInTheDocument()
  })
})
