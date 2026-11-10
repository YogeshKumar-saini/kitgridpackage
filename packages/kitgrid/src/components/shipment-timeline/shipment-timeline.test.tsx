import { render, screen } from "@testing-library/react"
import { ShipmentTimeline } from "./shipment-timeline.js"

describe("ShipmentTimeline", () => {
  it("lists events newest first and labels the latest", () => {
    const { container } = render(
      <ShipmentTimeline
        carrier="UPS"
        trackingNumber="1Z 999 AA1"
        trackingHref="https://example.com/track"
        events={[
          { id: "b", title: "Out for delivery", location: "Austin, TX", time: "08:12", dateTime: "2026-10-24T08:12" },
          { id: "a", title: "Departed facility", location: "Dallas, TX" },
        ]}
      />,
    )
    const list = screen.getByRole("list", { name: "Shipment history" })
    expect(list.children).toHaveLength(2)
    expect(list.children[0]).toHaveTextContent("Latest: Out for delivery")
    expect(container.querySelector("time")).toHaveAttribute("datetime", "2026-10-24T08:12")
    expect(screen.getByRole("link", { name: "1Z 999 AA1" })).toBeInTheDocument()
  })
})
