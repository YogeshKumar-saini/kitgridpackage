import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createRef } from "react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { Ripple } from "./ripple.js"

describe("Ripple", () => {
  it("renders the child itself, merging its handlers and forwarding the ref", () => {
    const ref = createRef<HTMLElement>()
    const onPointerDown = jest.fn()
    render(
      <Ripple ref={ref}>
        <button type="button" onPointerDown={onPointerDown}>
          Save
        </button>
      </Ripple>,
    )
    const button = screen.getByRole("button", { name: "Save" })
    expect(ref.current).toBe(button)
    expect(button).toHaveClass("kg-ripple")
    fireEvent.pointerDown(button, { button: 0, clientX: 4, clientY: 4 })
    expect(onPointerDown).toHaveBeenCalledTimes(1)
  })

  it("spawns a decorative wave on press and removes it after release", async () => {
    render(
      <Ripple color="tomato">
        <button type="button">Save</button>
      </Ripple>,
    )
    const button = screen.getByRole("button")
    expect(button.style.getPropertyValue("--kg-ripple-color")).toBe("tomato")
    fireEvent.pointerDown(button, { button: 0, clientX: 4, clientY: 4 })
    const layer = button.querySelector(".kg-ripple__layer")
    expect(layer).toHaveAttribute("aria-hidden", "true")
    fireEvent.pointerUp(window)
    await waitFor(() => expect(button.querySelector(".kg-ripple__layer")).toBeNull())
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
  })

  it("ripples from the centre on Enter and Space", async () => {
    render(
      <Ripple>
        <button type="button">Save</button>
      </Ripple>,
    )
    const button = screen.getByRole("button")
    fireEvent.keyDown(button, { key: " " })
    expect(button.querySelectorAll(".kg-ripple__wave")).toHaveLength(1)
    fireEvent.keyUp(button, { key: " " })
    fireEvent.keyDown(button, { key: "Enter" })
    await waitFor(() => expect(button.querySelector(".kg-ripple__layer")).toBeNull())
  })

  it("does nothing when disabled", () => {
    render(
      <Ripple disabled>
        <button type="button">Save</button>
      </Ripple>,
    )
    const button = screen.getByRole("button")
    fireEvent.pointerDown(button, { button: 0 })
    expect(button.querySelector(".kg-ripple__wave")).toBeNull()
  })

  it("uses a full-surface fade instead of a spreading wave under reduced motion", () => {
    render(
      <KitgridProvider reducedMotion="always">
        <Ripple>
          <button type="button">Save</button>
        </Ripple>
      </KitgridProvider>,
    )
    const button = screen.getByRole("button")
    fireEvent.pointerDown(button, { button: 0, clientX: 4, clientY: 4 })
    const wave = button.querySelector<HTMLElement>(".kg-ripple__wave")
    expect(wave?.style.width).toBe("")
  })

  it("removes in-flight waves on unmount", () => {
    const { unmount } = render(
      <Ripple>
        <button type="button">Save</button>
      </Ripple>,
    )
    const button = screen.getByRole("button")
    fireEvent.pointerDown(button, { button: 0 })
    unmount()
    expect(button.querySelector(".kg-ripple__layer")).toBeNull()
  })
})
