import { render } from "@testing-library/react"
import { Terminal } from "./terminal.js"

const lines = [
  { kind: "input" as const, text: "npm i kitgrid" },
  { text: "added 1 package in 2s" },
  { kind: "success" as const, text: "done" },
]

describe("Terminal", () => {
  it("exposes the full transcript and hides the animated copy", () => {
    const { container } = render(<Terminal lines={lines} title="zsh" />)
    expect(container.querySelector(".kg-terminal__sr")?.textContent).toBe(
      "$ npm i kitgrid\nadded 1 package in 2s\ndone",
    )
    expect(container.querySelector(".kg-terminal__body")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("schedules typing per character on input lines", () => {
    const { container } = render(<Terminal lines={lines} typingSpeed={10} />)
    const first = container.querySelector(".kg-terminal__line") as HTMLElement
    expect(first.style.getPropertyValue("--_steps")).toBe("13")
    expect(first.style.getPropertyValue("--_dur")).toBe("130ms")
    const lastLine = container.querySelectorAll(".kg-terminal__line")[2] as HTMLElement
    expect(lastLine).toHaveAttribute("data-last", "true")
  })

  it("renders statically when animation is off", () => {
    const { container } = render(<Terminal lines={lines} animate={false} prompt=">" />)
    expect(container.firstElementChild).toHaveAttribute("data-state", "static")
    expect(container.querySelector(".kg-terminal__prompt")).toHaveTextContent(">")
  })
})
