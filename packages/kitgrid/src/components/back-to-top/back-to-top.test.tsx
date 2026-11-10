import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { BackToTop } from "./back-to-top.js"

beforeEach(() => {
  window.scrollTo = jest.fn() as unknown as typeof window.scrollTo
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 })
})

const scrollWindow = async (y: number) => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y })
  await act(async () => {
    fireEvent.scroll(window)
    await new Promise((resolve) => requestAnimationFrame(resolve))
  })
}

describe("BackToTop", () => {
  it("stays hidden and out of the tab order until past the threshold", async () => {
    render(<BackToTop threshold={200} />)
    const button = document.querySelector<HTMLButtonElement>(".kg-back-to-top")!
    expect(button).toHaveAttribute("aria-hidden", "true")
    expect(button).toHaveAttribute("data-state", "hidden")
    expect(button).toHaveAttribute("tabindex", "-1")
    await scrollWindow(600)
    expect(button).toHaveAttribute("data-state", "visible")
    expect(button).not.toHaveAttribute("tabindex")
  })

  it("scrolls to the top on click", async () => {
    render(<BackToTop threshold={10} />)
    await scrollWindow(900)
    await userEvent.click(screen.getByRole("button", { name: "Back to top" }))
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })
})
