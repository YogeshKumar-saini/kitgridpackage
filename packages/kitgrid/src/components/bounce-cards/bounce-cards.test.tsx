import { fireEvent, render } from "@testing-library/react"
import { BounceCards } from "./bounce-cards.js"

const cards = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(".kg-bounce-cards__card"))

describe("BounceCards", () => {
  it("fans the cards symmetrically", () => {
    const { container } = render(
      <BounceCards spread={10}>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </BounceCards>,
    )
    const [a, b, c] = cards(container)
    expect(a?.style.getPropertyValue("--_rot")).toBe("-10deg")
    expect(b?.style.getPropertyValue("--_rot")).toBe("0deg")
    expect(c?.style.getPropertyValue("--_rot")).toBe("10deg")
  })

  it("lifts the hovered card and pushes its neighbours away", () => {
    const { container } = render(
      <BounceCards offset={100} push={50}>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </BounceCards>,
    )
    fireEvent.pointerEnter(cards(container)[1] as Element)
    const [a, b, c] = cards(container)
    expect(b).toHaveAttribute("data-lifted")
    expect(a?.style.getPropertyValue("--_x")).toBe("-150px")
    expect(c?.style.getPropertyValue("--_x")).toBe("150px")
    fireEvent.pointerLeave(container.firstElementChild as Element)
    expect(cards(container)[1]).not.toHaveAttribute("data-lifted")
  })
})
