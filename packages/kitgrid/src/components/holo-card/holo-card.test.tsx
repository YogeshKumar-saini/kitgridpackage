import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { HoloCard } from "./holo-card.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

const frames = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms))

beforeEach(() => {
  stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  )
  stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id))
})

afterEach(() => unstubAllGlobals())

const body = (card: HTMLElement) =>
  card.querySelector<HTMLElement>(".kg-holo-card__body") as HTMLElement

describe("HoloCard", () => {
  it("renders content, artwork and decorative foil layers", () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(
      <HoloCard
        ref={ref}
        data-testid="card"
        image="/tier.jpg"
        imageAlt="Gold tier card"
      >
        <h3>Gold member</h3>
      </HoloCard>,
    )
    expect(ref.current).toBe(screen.getByTestId("card"))
    expect(screen.getByRole("heading", { name: "Gold member" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Gold tier card" })).toHaveAttribute(
      "src",
      "/tier.jpg",
    )
    for (const part of ["foil", "sparkle", "glare", "rim"]) {
      expect(container.querySelector(`.kg-holo-card__${part}`)).toHaveAttribute(
        "aria-hidden",
        "true",
      )
    }
  })

  it("sets the foil ink and can drop the glare and glitter", () => {
    const { container } = render(
      <HoloCard
        data-testid="card"
        foil="gold"
        glare={false}
        sparkle={false}
        intensity={3}
      >
        Card
      </HoloCard>,
    )
    const card = screen.getByTestId("card")
    expect(card).toHaveAttribute("data-foil", "gold")
    expect(card.style.getPropertyValue("--_intensity")).toBe("1")
    expect(container.querySelector(".kg-holo-card__glare")).toBeNull()
    expect(container.querySelector(".kg-holo-card__sparkle")).toBeNull()
  })

  it("tilts toward a mouse and shifts the foil with it, then settles on leave", async () => {
    render(<HoloCard data-testid="card">Card</HoloCard>)
    const card = screen.getByTestId("card")
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 10, clientY: 10 })
    await frames()
    expect(card).toHaveAttribute("data-active")
    expect(body(card).style.transform).toContain("rotateX")
    expect(card.style.getPropertyValue("--_lift")).not.toBe("")
    fireEvent.pointerLeave(card)
    expect(card).not.toHaveAttribute("data-active")
  })

  it("ignores touch so the page can scroll", async () => {
    render(<HoloCard data-testid="card">Card</HoloCard>)
    const card = screen.getByTestId("card")
    fireEvent.pointerMove(card, { pointerType: "touch", clientX: 10, clientY: 10 })
    await frames()
    expect(body(card).style.transform).toBe("")
  })

  it("turns to a showcase pose when a keyboard user focuses inside it", async () => {
    render(
      <HoloCard data-testid="card">
        <a href="/redeem">Redeem</a>
      </HoloCard>,
    )
    screen.getByRole("link", { name: "Redeem" }).focus()
    await frames()
    expect(screen.getByTestId("card")).toHaveAttribute("data-active")
  })

  it("holds a static sheen under reduced motion", async () => {
    render(
      <KitgridProvider reducedMotion="always">
        <HoloCard data-testid="card">Card</HoloCard>
      </KitgridProvider>,
    )
    const card = screen.getByTestId("card")
    expect(card).toHaveAttribute("data-static")
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 10, clientY: 10 })
    await frames()
    expect(body(card).style.transform).toBe("")
  })

  it("asks for motion permission on the first tap when the platform requires it", async () => {
    const requestPermission = jest.fn(() => Promise.resolve("granted" as const))
    const listen = jest.spyOn(window, "addEventListener")
    stubGlobal(
      "DeviceOrientationEvent",
      Object.assign(function DeviceOrientationEvent() {}, { requestPermission }),
    )
    render(
      <HoloCard data-testid="card" deviceMotion>
        Card
      </HoloCard>,
    )
    expect(requestPermission).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId("card"))
    fireEvent.click(screen.getByTestId("card"))
    expect(requestPermission).toHaveBeenCalledTimes(1)
    await frames(0)
    expect(listen).toHaveBeenCalledWith("deviceorientation", expect.any(Function))
    listen.mockRestore()
  })

  it("mirrors data-depth into a CSS variable for parallax layers", () => {
    render(
      <HoloCard>
        <span data-depth="30">Platinum</span>
      </HoloCard>,
    )
    expect(screen.getByText("Platinum").style.getPropertyValue("--_depth")).toBe("30")
  })
})
