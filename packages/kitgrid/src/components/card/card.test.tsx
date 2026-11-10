import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { Card, CardDescription, CardHeader, CardMedia, CardTitle } from "./card.js"

describe("Card", () => {
  it("renders a level-3 heading by default and honours `as`", () => {
    render(
      <>
        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>3 items</CardDescription>
          </CardHeader>
        </Card>
        <CardTitle as="h2">Shipping</CardTitle>
      </>,
    )
    expect(
      screen.getByRole("heading", { level: 3, name: "Order summary" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 2, name: "Shipping" }),
    ).toBeInTheDocument()
  })

  it("turns the whole surface into the child link with asChild", () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Card asChild interactive variant="outline" ref={ref}>
        <a href="/p/1">
          <CardTitle>Linen shirt</CardTitle>
        </a>
      </Card>,
    )
    const link = screen.getByRole("link", { name: "Linen shirt" })
    expect(link).toHaveClass("kg-card")
    expect(link).toHaveAttribute("data-interactive")
    expect(link).toHaveAttribute("data-variant", "outline")
    expect(ref.current).toBe(link)
  })

  it.each(["outline", "ghost", "inset"] as const)(
    "exposes the %s variant as a data attribute",
    (variant) => {
      const { container } = render(<Card variant={variant}>Body</Card>)
      expect(container.firstElementChild).toHaveAttribute("data-variant", variant)
    },
  )

  it("applies the aspect ratio and zoom flag to media", () => {
    const { container } = render(
      <CardMedia ratio="4 / 5" zoom={false}>
        <img src="/a.jpg" alt="Shirt" />
      </CardMedia>,
    )
    const media = container.firstElementChild as HTMLElement
    expect(media.style.aspectRatio).toBe("4 / 5")
    expect(media).not.toHaveAttribute("data-zoom")
  })
})
