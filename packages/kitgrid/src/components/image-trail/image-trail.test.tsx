import { fireEvent, render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { ImageTrail } from "./image-trail.js"

const images = Array.from({ length: 6 }, (_, index) => ({
  src: `/look-${index}.jpg`,
  alt: `Look ${index}`,
}))

const animate = jest.fn(() => ({ cancel: jest.fn(), finished: Promise.resolve() }))

beforeEach(() => {
  animate.mockClear()
  jest.spyOn(HTMLElement.prototype, "animate").mockImplementation(
    animate as unknown as HTMLElement["animate"],
  )
})

afterEach(() => jest.restoreAllMocks())

const slots = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLImageElement>(".kg-image-trail__image"))

const move = (node: HTMLElement, x: number, y: number, pointerType = "mouse") =>
  fireEvent.pointerMove(node, { pointerType, clientX: x, clientY: y })

describe("ImageTrail", () => {
  it("keeps a fixed, hidden pool of images and describes the region", () => {
    const { container } = render(
      <ImageTrail
        images={images}
        maxActive={4}
        description="Spring lookbook, six outfits"
      >
        <h2>Spring 26</h2>
      </ImageTrail>,
    )
    expect(slots(container)).toHaveLength(4)
    expect(container.querySelector(".kg-image-trail__layer")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    for (const slot of slots(container)) expect(slot).toHaveAttribute("alt", "")
    expect(screen.getByText("Spring lookbook, six outfits")).toHaveClass(
      "kg-visually-hidden",
    )
    expect(screen.getByRole("heading", { name: "Spring 26" })).toBeInTheDocument()
  })

  it("drops an image each time the pointer travels the threshold", () => {
    const { container } = render(
      <ImageTrail data-testid="trail" images={images} threshold={50} maxActive={3} />,
    )
    const trail = screen.getByTestId("trail")
    move(trail, 0, 0)
    move(trail, 30, 0)
    expect(animate).not.toHaveBeenCalled()
    move(trail, 60, 0)
    expect(animate).toHaveBeenCalledTimes(1)
    expect(slots(container)[0]).toHaveAttribute("src", "/look-0.jpg")
    move(trail, 120, 0)
    move(trail, 180, 0)
    move(trail, 240, 0)
    expect(animate).toHaveBeenCalledTimes(4)
    // The pool wraps: the fourth image reuses the first element instead of adding one.
    expect(slots(container)).toHaveLength(3)
    expect(slots(container)[0]).toHaveAttribute("src", "/look-3.jpg")
  })

  it("never spawns from touch movement, but a tap drops an image", () => {
    render(<ImageTrail data-testid="trail" images={images} threshold={10} />)
    const trail = screen.getByTestId("trail")
    move(trail, 0, 0, "touch")
    move(trail, 200, 200, "touch")
    expect(animate).not.toHaveBeenCalled()
    fireEvent.pointerDown(trail, {
      pointerType: "touch",
      pointerId: 1,
      clientX: 40,
      clientY: 40,
    })
    fireEvent.pointerUp(trail, {
      pointerType: "touch",
      pointerId: 1,
      clientX: 42,
      clientY: 41,
    })
    expect(animate).toHaveBeenCalledTimes(1)
  })

  it("shows a still collage under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <ImageTrail data-testid="trail" images={images} threshold={10} />
      </KitgridProvider>,
    )
    const trail = screen.getByTestId("trail")
    expect(trail).toHaveAttribute("data-static")
    const collage = slots(container)
    expect(collage).toHaveLength(5)
    expect(collage[0]).toHaveAttribute("src", "/look-0.jpg")
    move(trail, 0, 0)
    move(trail, 300, 0)
    expect(animate).not.toHaveBeenCalled()
  })
})
