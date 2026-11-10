import { render } from "@testing-library/react"
import { TruncateText } from "./truncate-text.js"

describe("TruncateText", () => {
  it("keeps the full string in the DOM and in the title", () => {
    const { container } = render(<TruncateText>quarterly-report-final.pdf</TruncateText>)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveTextContent("quarterly-report-final.pdf")
    expect(root).toHaveAttribute("title", "quarterly-report-final.pdf")
    expect(root.querySelector(".kg-truncate-text__tail")).toBeNull()
  })

  it("splits off a fixed tail in middle mode", () => {
    const { container } = render(
      <TruncateText position="middle" tail={4}>
        0x71C7656EC7ab88b098defB751B7401B5f6d8976F
      </TruncateText>,
    )
    expect(container.querySelector(".kg-truncate-text__tail")).toHaveTextContent("976F")
    expect(container.firstElementChild).toHaveTextContent(
      "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    )
  })

  it("does not split strings shorter than the tail", () => {
    const { container } = render(
      <TruncateText position="middle" tail={8}>
        short
      </TruncateText>,
    )
    expect(container.querySelector(".kg-truncate-text__tail")).toBeNull()
  })
})
