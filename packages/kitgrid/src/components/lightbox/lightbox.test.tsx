import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Lightbox } from "./lightbox.js"

const images = [
  { src: "/a.jpg", alt: "Harbour at dawn" },
  { src: "/b.jpg", alt: "Market street" },
  { src: "/c.jpg", alt: "Cliff path" },
]

describe("Lightbox", () => {
  it("renders a labelled modal dialog with the current image", () => {
    render(<Lightbox images={images} defaultOpen />)
    expect(screen.getByRole("dialog", { name: "Image viewer" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Harbour at dawn" })).toBeInTheDocument()
    expect(screen.getByText("Image 1 of 3: Harbour at dawn")).toBeInTheDocument()
  })

  it("moves between images with arrow keys, wrapping", async () => {
    const onIndexChange = jest.fn()
    render(<Lightbox images={images} defaultOpen onIndexChange={onIndexChange} />)
    const dialog = screen.getByRole("dialog")
    fireEvent.keyDown(dialog, { key: "ArrowLeft" })
    expect(screen.getByRole("img", { name: "Cliff path" })).toBeInTheDocument()
    expect(onIndexChange).toHaveBeenLastCalledWith(2)
    fireEvent.keyDown(dialog, { key: "ArrowRight" })
    expect(screen.getByRole("img", { name: "Harbour at dawn" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Next image" }))
    expect(screen.getByRole("img", { name: "Market street" })).toBeInTheDocument()
  })

  it("marks the current thumbnail and jumps on click", async () => {
    render(<Lightbox images={images} defaultOpen />)
    const third = screen.getByRole("button", { name: "Show image 3: Cliff path" })
    await userEvent.click(third)
    expect(third).toHaveAttribute("aria-current", "true")
  })

  it("zooms from the keyboard and closes from the toolbar", async () => {
    const onOpenChange = jest.fn()
    render(<Lightbox images={images} defaultOpen onOpenChange={onOpenChange} />)
    const image = screen.getByRole("img", { name: "Harbour at dawn" })
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "+" })
    expect(image.style.transform).toContain("scale(1.6)")
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "0" })
    expect(image.style.transform).toContain("scale(1)")
    await act(() => userEvent.click(screen.getByRole("button", { name: "Close" })))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("shows a labelled skeleton surface when an image has no src", () => {
    render(<Lightbox images={[{ alt: "Harbour at dawn" }, { alt: "Market street" }]} defaultOpen />)
    expect(screen.getByRole("img", { name: "Harbour at dawn" })).toHaveAttribute("data-placeholder")
    expect(document.querySelector("img")).toBeNull()
  })
})
