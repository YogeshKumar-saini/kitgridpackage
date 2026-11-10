import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ImageCompare } from "./image-compare.js"

const setup = (props = {}) =>
  render(
    <ImageCompare
      before={<img src="a.png" alt="Original" />}
      after={<img src="b.png" alt="Retouched" />}
      beforeLabel="Before"
      afterLabel="After"
      {...props}
    />,
  )

describe("ImageCompare", () => {
  it("exposes a labelled slider at the default position", () => {
    setup()
    const slider = screen.getByRole("slider", { name: "Comparison position" })
    expect(slider).toHaveAttribute("aria-valuenow", "50")
    expect(slider).toHaveAttribute("aria-orientation", "horizontal")
    expect(screen.getByText("Before")).toBeInTheDocument()
  })

  it("moves with arrow, Shift+arrow, Home and End", async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    const { container } = setup({ onValueChange })
    const slider = screen.getByRole("slider")
    slider.focus()
    await user.keyboard("{ArrowRight}")
    expect(slider).toHaveAttribute("aria-valuenow", "51")
    await user.keyboard("{Shift>}{ArrowLeft}{/Shift}")
    expect(slider).toHaveAttribute("aria-valuenow", "41")
    await user.keyboard("{End}")
    expect(onValueChange).toHaveBeenLastCalledWith(100)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--_p")).toBe("100")
    await user.keyboard("{Home}")
    expect(slider).toHaveAttribute("aria-valuetext", "0%")
  })

  it("jumps to the pointer position", () => {
    const onValueChange = jest.fn()
    const { container } = setup({ onValueChange })
    const frame = container.firstElementChild as HTMLElement
    frame.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 }) as DOMRect
    fireEvent.pointerDown(frame, { clientX: 50, clientY: 10, button: 0, pointerId: 1 })
    expect(onValueChange).toHaveBeenLastCalledWith(25)
  })
})
