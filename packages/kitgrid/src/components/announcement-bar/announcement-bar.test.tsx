import { act, fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { AnnouncementBar } from "./announcement-bar.js"

const messages = ["Free shipping over $75", "New: the Linen edit", "30-day returns"]

const current = (container: HTMLElement) =>
  container.querySelector('[data-position="current"]')?.textContent

const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms)
  })

describe("AnnouncementBar", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it("is a named carousel region with labelled slides", () => {
    render(<AnnouncementBar messages={messages} />)
    const region = screen.getByRole("region", { name: "Announcements" })
    expect(region).toHaveAttribute("aria-roledescription", "carousel")
    const slide = screen.getByRole("group", { name: "1 of 3" })
    expect(slide).toHaveAttribute("aria-roledescription", "slide")
    expect(slide).toHaveTextContent("Free shipping over $75")
  })

  it("rotates on the interval and hides inactive slides from assistive technology", () => {
    const { container } = render(
      <AnnouncementBar messages={messages} interval={4000} />,
    )
    expect(current(container)).toBe("Free shipping over $75")
    advance(4000)
    expect(current(container)).toBe("New: the Linen edit")
    expect(screen.getByText("Free shipping over $75")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    advance(4000)
    advance(4000)
    expect(current(container)).toBe("Free shipping over $75")
  })

  it("keeps the live region off while rotating and polite when paused", () => {
    const { container } = render(<AnnouncementBar messages={messages} />)
    const viewport = container.querySelector(".kg-announcement-bar__viewport")
    expect(viewport).toHaveAttribute("aria-live", "off")
    fireEvent.click(screen.getByRole("button", { name: "Pause announcements" }))
    expect(viewport).toHaveAttribute("aria-live", "polite")
  })

  it("has a pause/play control that stops rotation", () => {
    const { container } = render(
      <AnnouncementBar messages={messages} interval={1000} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Pause announcements" }))
    advance(5000)
    expect(current(container)).toBe("Free shipping over $75")
    fireEvent.click(screen.getByRole("button", { name: "Play announcements" }))
    advance(1000)
    expect(current(container)).toBe("New: the Linen edit")
  })

  it("pauses while hovered or focused", () => {
    const { container } = render(
      <AnnouncementBar messages={messages} interval={1000} />,
    )
    const region = screen.getByRole("region")
    fireEvent.pointerEnter(region, { pointerType: "mouse" })
    advance(3000)
    expect(current(container)).toBe("Free shipping over $75")
    fireEvent.pointerLeave(region)
    act(() => {
      screen.getByRole("button", { name: "Next announcement" }).focus()
    })
    advance(3000)
    expect(current(container)).toBe("Free shipping over $75")
  })

  it("steps manually in both directions, wrapping around", () => {
    const { container } = render(
      <AnnouncementBar messages={messages} autoPlay={false} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Previous announcement" }))
    expect(current(container)).toBe("30-day returns")
    expect(screen.getByRole("region")).toHaveAttribute("data-direction", "prev")
    fireEvent.click(screen.getByRole("button", { name: "Next announcement" }))
    expect(current(container)).toBe("Free shipping over $75")
  })

  it("does not auto-rotate under reduced motion but stays operable", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <AnnouncementBar messages={messages} interval={1000} />
      </KitgridProvider>,
    )
    advance(5000)
    expect(current(container)).toBe("Free shipping over $75")
    expect(
      screen.getByRole("button", { name: "Play announcements" }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Next announcement" }))
    expect(current(container)).toBe("New: the Linen edit")
  })

  it("dismisses with a labelled close button", () => {
    const onDismiss = jest.fn()
    render(<AnnouncementBar messages={messages} dismissible onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole("button", { name: "Dismiss announcements" }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("region")).toBeNull()
  })

  it("renders a single message without carousel controls", () => {
    render(<AnnouncementBar messages={["Holiday hours: we ship until Dec 20"]} />)
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("group")).toBeNull()
    expect(screen.getByText("Holiday hours: we ship until Dec 20")).toBeInTheDocument()
  })
})
