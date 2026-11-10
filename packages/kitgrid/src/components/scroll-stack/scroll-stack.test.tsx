import { render, screen } from "@testing-library/react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import { ScrollStack, ScrollStackItem } from "./scroll-stack.js"
import { stubGlobal, unstubAllGlobals } from "../../../test/globals.js"

const deck = (props: Partial<Parameters<typeof ScrollStack>[0]> = {}) => (
  <ScrollStack data-testid="stack" {...props}>
    <ScrollStackItem>Design</ScrollStackItem>
    <ScrollStackItem>Build</ScrollStackItem>
    <ScrollStackItem>Ship</ScrollStackItem>
  </ScrollStack>
)

describe("ScrollStack", () => {
  it("renders a list of cards with their place in the deck", () => {
    render(deck())
    const items = screen.getAllByRole("listitem")
    expect(screen.getByRole("list")).toBe(screen.getByTestId("stack"))
    expect(items).toHaveLength(3)
    expect(items.map((item) => item.style.getPropertyValue("--_i"))).toEqual([
      "0",
      "1",
      "2",
    ])
    expect(items.map((item) => item.style.getPropertyValue("--_rank"))).toEqual([
      "2",
      "1",
      "0",
    ])
  })

  it("links each card to the timeline of the card that buries it", () => {
    const { container } = render(deck())
    const markers = Array.from(
      container.querySelectorAll<HTMLElement>(".kg-scroll-stack__marker"),
    )
    const items = screen.getAllByRole("listitem")
    expect(markers).toHaveLength(3)
    for (const marker of markers) expect(marker).toHaveAttribute("aria-hidden", "true")
    expect(items[0]?.style.getPropertyValue("--_next")).toBe(
      markers[1]?.style.getPropertyValue("--_name"),
    )
    expect(items[2]?.style.getPropertyValue("--_next")).toBe("none")
    expect(
      screen.getByTestId("stack").style.getPropertyValue("--_scope").split(", "),
    ).toHaveLength(3)
  })

  it("accepts layout options as custom properties", () => {
    render(deck({ top: "12vh", peek: 20, gap: 80, scaleStep: 0.08, dim: false }))
    const stack = screen.getByTestId("stack")
    expect(stack.style.getPropertyValue("--_top")).toBe("12vh")
    expect(stack.style.getPropertyValue("--_peek")).toBe("20px")
    expect(stack.style.getPropertyValue("--_gap")).toBe("80px")
    expect(stack).not.toHaveAttribute("data-dim")
  })

  it("lets CSS drive the stack where scroll-driven animations exist", () => {
    stubGlobal("CSS", { supports: () => true })
    render(deck())
    expect(screen.getByTestId("stack")).toHaveAttribute("data-driver", "css")
    unstubAllGlobals()
  })

  it("falls back to a script driver that writes progress from scroll position", () => {
    stubGlobal("CSS", { supports: () => false })
    render(deck())
    const stack = screen.getByTestId("stack")
    expect(stack).toHaveAttribute("data-driver", "script")
    for (const item of screen.getAllByRole("listitem"))
      expect(item.style.getPropertyValue("--kg-stack-progress")).not.toBe("")
    unstubAllGlobals()
  })

  it("becomes a plain list under reduced motion", () => {
    render(<KitgridProvider reducedMotion="always">{deck()}</KitgridProvider>)
    expect(screen.getByTestId("stack")).toHaveAttribute("data-reduced")
    for (const item of screen.getAllByRole("listitem"))
      expect(item.style.getPropertyValue("--kg-stack-progress")).toBe("")
  })

  it("refuses items outside a stack", () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<ScrollStackItem>Lost</ScrollStackItem>)).toThrow(/ScrollStack/)
    jest.restoreAllMocks()
  })
})
