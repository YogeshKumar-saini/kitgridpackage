import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { Carousel, type CarouselProps, CarouselSlide } from "./carousel.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

const names = ["Overshirt", "Merino crew", "Canvas tote", "Court sneaker"]

const renderCarousel = (props: Partial<CarouselProps> = {}) =>
  render(
    <Carousel label="New arrivals" {...props}>
      {names.map((name) => (
        <CarouselSlide key={name}>
          <a href={`#${name}`}>{name}</a>
        </CarouselSlide>
      ))}
    </Carousel>,
  )

const slides = () => screen.getAllByRole("group")

describe("Carousel", () => {
  it("follows the APG carousel semantics", () => {
    renderCarousel()
    const region = screen.getByRole("region", { name: "New arrivals" })
    expect(region).toHaveAttribute("aria-roledescription", "carousel")
    expect(slides()).toHaveLength(4)
    expect(slides()[2]).toHaveAccessibleName("3 of 4")
    expect(slides()[2]).toHaveAttribute("aria-roledescription", "slide")
  })

  it("disables previous and next at the ends of a snap rail", () => {
    renderCarousel()
    // jsdom lays nothing out, so the rail is both at its start and its end.
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled()
  })

  it("keeps both buttons live when looping", () => {
    renderCarousel({ loop: true })
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Next slide" })).toBeEnabled()
  })

  it("deals a stack: only the top card is exposed, the rest are inert", async () => {
    const user = userEvent.setup()
    const onIndexChange = jest.fn()
    renderCarousel({ variant: "stack", onIndexChange })
    const visible = () => screen.getAllByRole("group")
    expect(visible()).toHaveLength(1)
    expect(visible()[0]).toHaveTextContent("Overshirt")

    await user.click(screen.getByRole("button", { name: "Next slide" }))
    expect(onIndexChange).toHaveBeenLastCalledWith(1)
    expect(visible()[0]).toHaveTextContent("Merino crew")
    expect(screen.getByRole("status")).toHaveTextContent("Slide 2 of 4")

    const hidden = document.querySelector('[data-carousel-index="0"]') as HTMLElement
    expect(hidden).toHaveAttribute("aria-hidden", "true")
    expect(hidden.inert).toBe(true)
    expect(hidden).toHaveAttribute("data-shuffle", "out-a")
  })

  it("moves with the arrow keys, Home and End", async () => {
    const user = userEvent.setup()
    renderCarousel({ variant: "stack", indicator: "dots" })
    screen.getByRole("link", { name: "Overshirt" }).focus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Go to slide 2 of 4" })).toHaveAttribute(
      "aria-current",
      "true",
    )
    await user.keyboard("{End}")
    expect(screen.getByRole("button", { name: "Go to slide 4 of 4" })).toHaveAttribute(
      "aria-current",
      "true",
    )
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "Go to slide 1 of 4" })).toHaveAttribute(
      "aria-current",
      "true",
    )
  })

  it("jumps from a dot and supports controlled use", async () => {
    const user = userEvent.setup()
    const onIndexChange = jest.fn()
    const { rerender } = render(
      <Carousel variant="coverflow" index={0} onIndexChange={onIndexChange}>
        {names.map((name) => (
          <CarouselSlide key={name}>{name}</CarouselSlide>
        ))}
      </Carousel>,
    )
    await user.click(screen.getByRole("button", { name: "Go to slide 3 of 4" }))
    expect(onIndexChange).toHaveBeenCalledWith(2)
    rerender(
      <Carousel variant="coverflow" index={2} onIndexChange={onIndexChange}>
        {names.map((name) => (
          <CarouselSlide key={name}>{name}</CarouselSlide>
        ))}
      </Carousel>,
    )
    expect(screen.getByRole("button", { name: "Go to slide 3 of 4" })).toHaveAttribute(
      "aria-current",
      "true",
    )
    expect(slides()[2]).toHaveAttribute("data-active")
  })

  describe("autoplay", () => {
    beforeEach(() => {
      jest.useFakeTimers()
      stubGlobal(
        "IntersectionObserver",
        class {
          constructor(private readonly callback: IntersectionObserverCallback) {}
          observe(target: Element) {
            this.callback(
              [{ isIntersecting: true, target } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            )
          }
          unobserve() {}
          disconnect() {}
        },
      )
    })
    afterEach(() => {
      jest.useRealTimers()
      unstubAllGlobals()
    })

    it("advances on a timer, silences the live region and can be paused", () => {
      const onIndexChange = jest.fn()
      renderCarousel({ variant: "stack", autoplay: 3000, onIndexChange })
      expect(screen.getByRole("status", { hidden: true })).toHaveAttribute(
        "aria-live",
        "off",
      )
      act(() => jest.advanceTimersByTime(3000))
      expect(onIndexChange).toHaveBeenLastCalledWith(1)

      fireEvent.click(screen.getByRole("button", { name: "Pause slide rotation" }))
      expect(
        screen.getByRole("button", { name: "Start slide rotation" }),
      ).toBeInTheDocument()
      act(() => jest.advanceTimersByTime(9000))
      expect(onIndexChange).toHaveBeenCalledTimes(1)
    })

    it("pauses while hovered", () => {
      const onIndexChange = jest.fn()
      renderCarousel({ variant: "stack", autoplay: 2000, onIndexChange })
      fireEvent.pointerEnter(screen.getByRole("region"), { pointerType: "mouse" })
      act(() => jest.advanceTimersByTime(6000))
      expect(onIndexChange).not.toHaveBeenCalled()
    })

    it("never starts under reduced motion", () => {
      const onIndexChange = jest.fn()
      render(
        <KitgridProvider reducedMotion="always">
          <Carousel variant="stack" autoplay={2000} onIndexChange={onIndexChange}>
            {names.map((name) => (
              <CarouselSlide key={name}>{name}</CarouselSlide>
            ))}
          </Carousel>
        </KitgridProvider>,
      )
      act(() => jest.advanceTimersByTime(6000))
      expect(onIndexChange).not.toHaveBeenCalled()
      expect(
        screen.getByRole("button", { name: "Start slide rotation" }),
      ).toBeInTheDocument()
    })
  })
})
