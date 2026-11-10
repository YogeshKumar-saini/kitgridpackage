import { fireEvent, render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ProductGallery } from "./product-gallery.js"

const images = [
  { src: "/1.jpg", alt: "Front", width: 800, height: 1000 },
  { src: "/2.jpg", alt: "Back" },
  { src: "/3.jpg", alt: "Detail" },
]

const current = () => screen.getByRole("button", { current: true })

describe("ProductGallery", () => {
  it("is a labelled carousel with named slides and reserved aspect ratio", () => {
    render(<ProductGallery images={images} />)
    const region = screen.getByRole("region", { name: "Product images" })
    expect(region).toHaveAttribute("aria-roledescription", "carousel")
    expect(region.style.getPropertyValue("--_ratio")).toBe("800 / 1000")
    expect(screen.getByRole("group", { name: "Image 1 of 3" })).toBeInTheDocument()
    expect(screen.getAllByRole("img", { hidden: true })[0]).toHaveAttribute(
      "loading",
      "eager",
    )
  })

  it("moves with arrows, thumbnails and the keyboard, wrapping at the ends", async () => {
    const onIndexChange = jest.fn()
    render(<ProductGallery images={images} onIndexChange={onIndexChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Next image" }))
    expect(onIndexChange).toHaveBeenLastCalledWith(1)
    expect(current()).toHaveAccessibleName("Show image 2 of 3")

    await userEvent.click(screen.getByRole("button", { name: "Show image 3 of 3" }))
    expect(onIndexChange).toHaveBeenLastCalledWith(2)

    current().focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(onIndexChange).toHaveBeenLastCalledWith(0)
    expect(current()).toHaveFocus()
    await userEvent.keyboard("{End}")
    expect(onIndexChange).toHaveBeenLastCalledWith(2)
    expect(
      screen.getByText("Image 3 of 3", { selector: "[aria-live]" }),
    ).toBeInTheDocument()
  })

  it("keeps hidden slides out of the tab order", () => {
    render(<ProductGallery images={images} index={1} />)
    const open = screen.getByRole("button", { name: "Open image 2 of 3 in fullscreen" })
    expect(open).toHaveAttribute("tabindex", "0")
    const hidden = screen.getByRole("button", {
      name: "Open image 1 of 3 in fullscreen",
      hidden: true,
    })
    expect(hidden).toHaveAttribute("tabindex", "-1")
  })

  it("opens a lightbox that zooms and pages with the arrow keys", async () => {
    render(<ProductGallery images={images} />)
    await userEvent.click(
      screen.getByRole("button", { name: "Open image 1 of 3 in fullscreen" }),
    )
    const viewer = screen.getByRole("dialog", { name: "Image viewer" })
    const zoom = within(viewer).getByRole("button", { name: "Zoom in" })
    await userEvent.click(zoom)
    expect(zoom).toHaveAttribute("aria-pressed", "true")
    fireEvent.keyDown(viewer, { key: "ArrowRight" })
    expect(within(viewer).getByRole("img")).toHaveAttribute("alt", "Back")
    expect(within(viewer).getByRole("button", { name: "Zoom in" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  })

  it("hides navigation for a single image", () => {
    render(<ProductGallery images={images.slice(0, 1)} />)
    expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument()
  })
})

describe("ProductGallery without images", () => {
  it("renders an empty placeholder stage instead of failing", () => {
    const { container } = render(<ProductGallery images={[]} />)
    expect(container.querySelector(".kg-product-gallery__stage")).toHaveAttribute("data-placeholder")
    expect(container.querySelector("img")).toBeNull()
  })
})
