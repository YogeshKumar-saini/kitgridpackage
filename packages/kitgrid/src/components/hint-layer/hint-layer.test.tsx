import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useRef } from "react"
import { Coachmark } from "./coachmark.js"
import { HintLayer } from "./hint-layer.js"

// jsdom applies the UA rule hiding [popover] but has no showPopover(), so Layer stays hidden.
beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("HintLayer", () => {
  it("shows a styled hint for data-hint and title hosts, keeping the text as a description", () => {
    render(
      <>
        <HintLayer replaceTitles />
        <button type="button" data-hint={"Net sales\nAfter returns"}>
          Sales
        </button>
        <button type="button" title="Gross margin">
          Margin
        </button>
      </>,
    )
    const sales = screen.getByRole("button", { name: "Sales" })
    fireEvent.pointerOver(sales, { clientX: 10, clientY: 10, pointerType: "mouse" })
    const hint = document.querySelector(".kg-hint-layer")
    expect(hint).toHaveTextContent("Net sales")
    expect(hint?.querySelector("strong")).toHaveTextContent("Net sales")
    expect(sales).toHaveAttribute("aria-description", "Net sales\nAfter returns")
    fireEvent.pointerOut(sales, { relatedTarget: document.body })
    expect(document.querySelector(".kg-hint-layer")).toBeNull()

    const margin = screen.getByRole("button", { name: "Margin" })
    fireEvent.pointerOver(margin, { clientX: 10, clientY: 10, pointerType: "mouse" })
    expect(margin).not.toHaveAttribute("title")
    expect(margin).toHaveAttribute("aria-description", "Gross margin")
    expect(document.querySelector(".kg-hint-layer")).toHaveTextContent("Gross margin")
    fireEvent.keyDown(document, { key: "Escape" })
    expect(document.querySelector(".kg-hint-layer")).toBeNull()
  })
})

const Tour = ({ onFinish }: { onFinish?: () => void }) => {
  const search = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={search} type="button">
        Search
      </button>
      <button type="button" id="filters">
        Filters
      </button>
      <Coachmark
        defaultOpen
        onFinish={onFinish}
        steps={[
          {
            target: search,
            title: "Find anything",
            content: "Press Ctrl K from any page.",
          },
          { target: "#filters", title: "Narrow the view", side: "left" },
        ]}
      />
    </>
  )
}

describe("Coachmark", () => {
  it("walks through anchored steps, marks the target and finishes", async () => {
    const onFinish = jest.fn()
    render(<Tour onFinish={onFinish} />)
    const tip = screen.getByRole("dialog", { name: "Find anything" })
    expect(tip).toHaveAccessibleDescription("Press Ctrl K from any page.")
    expect(tip).toHaveTextContent("1 of 2")
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute(
      "data-kg-coachmark-target",
    )
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus()

    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByRole("dialog", { name: "Narrow the view" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Filters" })).toHaveAttribute(
      "data-kg-coachmark-target",
    )
    expect(screen.getByRole("button", { name: "Search" })).not.toHaveAttribute(
      "data-kg-coachmark-target",
    )

    await userEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByRole("dialog", { name: "Find anything" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    await act(async () => {
      screen.getByRole("button", { name: "Done" }).click()
    })
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("ends on Escape or Skip", async () => {
    render(<Tour />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" })
    })
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
