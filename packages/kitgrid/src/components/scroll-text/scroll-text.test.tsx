import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { ScrollText } from "./scroll-text.js"

const text = "Every word fills in as you read"

describe("ScrollText", () => {
  it("is one paragraph for assistive tech, with the word spans hidden", () => {
    const { container } = render(<ScrollText>{text}</ScrollText>)
    const paragraph = container.querySelector("p") as HTMLElement
    expect(paragraph).toHaveClass("kg-scroll-text")
    expect(screen.getByText(text)).toHaveClass("kg-visually-hidden")
    expect(container.querySelector(".kg-scroll-text__text")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("indexes each word against the total for its slice of the scroll", () => {
    const { container } = render(<ScrollText dim={0.25}>{text}</ScrollText>)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--_n")).toBe("7")
    expect(root.style.getPropertyValue("--_dim")).toBe("0.25")
    const words = container.querySelectorAll<HTMLElement>(".kg-scroll-text__word")
    expect(words).toHaveLength(7)
    expect(words[6]?.style.getPropertyValue("--_i")).toBe("6")
  })

  it("writes a clamped progress value when scroll timelines are unavailable", () => {
    const { container } = render(<ScrollText range={[0, 100]}>{text}</ScrollText>)
    const progress = Number(
      (container.firstElementChild as HTMLElement).style.getPropertyValue(
        "--_progress",
      ),
    )
    expect(progress).toBeGreaterThanOrEqual(0)
    expect(progress).toBeLessThanOrEqual(1)
  })

  it("leaves every word at full strength under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <ScrollText>{text}</ScrollText>
      </KitgridProvider>,
    )
    const root = container.querySelector(".kg-scroll-text") as HTMLElement
    expect(root.style.getPropertyValue("--_progress")).toBe("")
  })

  it("renders as another element", () => {
    render(<ScrollText as="h2">Big statement</ScrollText>)
    expect(screen.getByRole("heading", { name: "Big statement" })).toBeInTheDocument()
  })
})
