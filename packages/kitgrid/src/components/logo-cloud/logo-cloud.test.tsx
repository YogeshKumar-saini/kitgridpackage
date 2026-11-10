import { render, screen } from "@testing-library/react"
import { LogoCloud } from "./logo-cloud.js"

describe("LogoCloud", () => {
  it("names every mark, whatever its source", () => {
    render(
      <LogoCloud
        title="Trusted by"
        logos={[
          { name: "Northwind", src: "/northwind.svg" },
          { name: "Halcyon", logo: <svg /> },
          { name: "Fieldnote", href: "https://example.com" },
        ]}
      />,
    )
    expect(screen.getByRole("img", { name: "Northwind" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Halcyon" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Fieldnote" })).toHaveAttribute(
      "href",
      "https://example.com",
    )
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
  })
})
