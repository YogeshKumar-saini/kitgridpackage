import { render, waitFor } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { NumberTicker } from "./number-ticker.js"

const label = (container: HTMLElement) =>
  container.querySelector(".kg-number-ticker__label")?.textContent
const shown = (container: HTMLElement) =>
  container.querySelector(".kg-number-ticker__count")?.textContent

const reelDigit = (reel: Element) => {
  const match = /translateY\((-?[\d.]+)%\)/.exec((reel as HTMLElement).style.transform)
  return Math.round((-Number(match?.[1] ?? 0) * 11) / 100) || 0
}

describe("NumberTicker", () => {
  it("exposes only the final formatted value to assistive tech", () => {
    const { container } = render(
      <NumberTicker value={1499} format={{ style: "currency", currency: "USD" }} />,
    )
    expect(label(container)).toBe("$1,499.00")
    expect(container.querySelector(".kg-number-ticker__value")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("waits at the start value until it scrolls into view", () => {
    const { container } = render(<NumberTicker value={250} from={10} />)
    expect(shown(container)).toBe("10")
    expect(label(container)).toBe("250")
  })

  it("counts to the value once triggered", async () => {
    const { container } = render(
      <NumberTicker value={100} trigger="mount" duration={60} />,
    )
    await waitFor(() => expect(shown(container)).toBe("100"))
  })

  it("lands on the final value immediately under reduced motion", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <NumberTicker
          value={0.425}
          format={{ style: "percent", maximumFractionDigits: 1 }}
        />
      </KitgridProvider>,
    )
    expect(shown(container)).toBe("42.5%")
  })

  it("respects locale and decimals", () => {
    const { container } = render(
      <NumberTicker value={1234.5} locale="de-DE" decimals={2} />,
    )
    expect(label(container)).toBe("1.234,50")
  })

  it("rolls a wheel per digit and keeps symbols and separators static", () => {
    const { container } = render(
      <KitgridProvider reducedMotion="always">
        <NumberTicker
          variant="roll"
          value={12345}
          format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
        />
      </KitgridProvider>,
    )
    const wheels = container.querySelectorAll(".kg-number-ticker__digit")
    expect([...wheels].map((wheel) => wheel.getAttribute("data-place"))).toEqual([
      "i4",
      "i3",
      "i2",
      "i1",
      "i0",
    ])
    const reels = container.querySelectorAll(".kg-number-ticker__reel")
    expect([...reels].map(reelDigit)).toEqual([1, 2, 3, 4, 5])
    expect(
      [...container.querySelectorAll(".kg-number-ticker__symbol")].map(
        (n) => n.textContent,
      ),
    ).toEqual(["$", ","])
  })

  it("parks every wheel on the start value before it is triggered", () => {
    const { container } = render(<NumberTicker variant="roll" value={987} from={0} />)
    const reels = container.querySelectorAll(".kg-number-ticker__reel")
    expect([...reels].map(reelDigit)).toEqual([0, 0, 0])
    expect(label(container)).toBe("987")
  })

  it("rolls to the value once triggered", async () => {
    const { container } = render(
      <NumberTicker variant="roll" value={42} trigger="mount" duration={60} />,
    )
    const reels = container.querySelectorAll(".kg-number-ticker__reel")
    await waitFor(() => expect([...reels].map(reelDigit)).toEqual([4, 2]))
  })
})
