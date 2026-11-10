import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SkipLink } from "./skip-link.js"

describe("SkipLink", () => {
  it("is the first tab stop and moves focus to the target without changing the hash", async () => {
    render(
      <>
        <SkipLink target="#content" />
        <nav>
          <a href="#a">Overview</a>
        </nav>
        <main id="content">Report</main>
      </>,
    )
    await userEvent.tab()
    const link = screen.getByRole("link", { name: "Skip to content" })
    expect(link).toHaveFocus()
    expect(link).toHaveAttribute("href", "#content")
    const before = window.location.hash
    await userEvent.keyboard("{Enter}")
    const main = screen.getByRole("main")
    expect(main).toHaveFocus()
    expect(main).toHaveAttribute("tabindex", "-1")
    expect(window.location.hash).toBe(before)
  })
})
