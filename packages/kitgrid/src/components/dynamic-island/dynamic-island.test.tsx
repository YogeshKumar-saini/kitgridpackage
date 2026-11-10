import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import {
  DynamicIsland,
  DynamicIslandActivity,
  DynamicIslandRing,
  useDynamicIsland,
} from "./dynamic-island.js"

const views = {
  idle: <span>2 in bag</span>,
  added: <DynamicIslandActivity title="Added to bag" description="Court sneaker" />,
}

describe("DynamicIsland", () => {
  it("renders the current view at its size", () => {
    const { container } = render(
      <DynamicIsland state="added" views={views} sizes={{ added: "wide" }} />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass("kg-dynamic-island")
    expect(root).toHaveAttribute("data-size", "wide")
    expect(screen.getByText("Added to bag")).toBeInTheDocument()
  })

  it("keeps the outgoing view hidden and inert while the new one is announced", async () => {
    const { rerender, container } = render(<DynamicIsland state="idle" views={views} />)
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("")

    rerender(<DynamicIsland state="added" views={views} sizes={{ added: "wide" }} />)
    const leaving = container.querySelector('[data-phase="exit"]') as HTMLElement
    expect(leaving).toHaveTextContent("2 in bag")
    expect(leaving).toHaveAttribute("aria-hidden", "true")
    expect(leaving.inert).toBe(true)
    expect(container.querySelector("[data-current]")).toHaveAttribute(
      "data-phase",
      "enter",
    )
    expect(status).toHaveTextContent("Added to bag Court sneaker")

    // jsdom has no AnimationEvent, so this exercises the fallback that retires exiting views.
    await waitFor(
      () => expect(container.querySelector('[data-phase="exit"]')).toBeNull(),
      {
        timeout: 2000,
      },
    )
  })

  it("dismisses on Escape from inside", async () => {
    const user = userEvent.setup()
    const onDismiss = jest.fn()
    render(
      <DynamicIsland
        state="added"
        views={{ added: <button type="button">View bag</button> }}
        onDismiss={onDismiss}
      />,
    )
    screen.getByRole("button", { name: "View bag" }).focus()
    await user.keyboard("{Escape}")
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it("reports hover and focus holds", () => {
    const onHoldChange = jest.fn()
    const { container } = render(
      <DynamicIsland
        state="added"
        views={{ added: <button type="button">View bag</button> }}
        onHoldChange={onHoldChange}
      />,
    )
    const root = container.firstElementChild as HTMLElement
    fireEvent.pointerEnter(root, { pointerType: "mouse" })
    expect(onHoldChange).toHaveBeenLastCalledWith(true)
    fireEvent.pointerLeave(root)
    expect(onHoldChange).toHaveBeenLastCalledWith(false)
    fireEvent.focus(screen.getByRole("button"))
    expect(onHoldChange).toHaveBeenLastCalledWith(true)
  })
})

describe("DynamicIslandRing", () => {
  it("is a progressbar when labelled and decorative otherwise", () => {
    const { rerender } = render(
      <DynamicIslandRing value={0.4} label="Payment progress" />,
    )
    expect(
      screen.getByRole("progressbar", { name: "Payment progress" }),
    ).toHaveAttribute("aria-valuenow", "40")
    rerender(<DynamicIslandRing value={2} />)
    expect(screen.queryByRole("progressbar")).toBeNull()
  })
})

const Harness = ({
  onReady,
}: {
  onReady?: (island: ReturnType<typeof useDynamicIsland>) => void
}) => {
  const island = useDynamicIsland({ idle: <span>Bag</span>, duration: 1000 })
  const [count, setCount] = useState(0)
  onReady?.(island)
  return (
    <>
      <DynamicIsland {...island.props} />
      <button
        type="button"
        onClick={() => {
          setCount(count + 1)
          island.show(<span>Added {count + 1}</span>, { id: "bag" })
        }}
      >
        Add
      </button>
      <button type="button" onClick={() => island.show(<span>Shipped</span>)}>
        Ship
      </button>
    </>
  )
}

describe("useDynamicIsland", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it("shows events, updates them in place by id and returns to idle on its own", () => {
    let controller: ReturnType<typeof useDynamicIsland> | undefined
    const { container } = render(
      <Harness onReady={(island) => (controller = island)} />,
    )
    expect(screen.getByText("Bag")).toBeInTheDocument()

    const current = () => container.querySelector("[data-current]")
    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(current()).toHaveTextContent("Added 1")
    expect(controller?.active).toBe("bag")
    const root = container.querySelector(".kg-dynamic-island") as HTMLElement
    expect(root).toHaveAttribute("data-size", "wide")

    act(() => jest.advanceTimersByTime(600))
    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    // Same id: the content updates without a cross-fade and the timer restarts.
    expect(current()).toHaveTextContent("Added 2")
    expect(container.querySelectorAll('[data-phase="exit"] span')).toHaveLength(1)
    act(() => jest.advanceTimersByTime(600))
    expect(controller?.active).toBe("bag")

    act(() => jest.advanceTimersByTime(500))
    expect(controller?.active).toBeNull()
    expect(container.querySelector("[data-current]")).toHaveTextContent("Bag")
  })

  it("dismisses only the event it names", () => {
    let controller: ReturnType<typeof useDynamicIsland> | undefined
    const { container } = render(
      <Harness onReady={(island) => (controller = island)} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Ship" }))
    act(() => controller?.dismiss("bag"))
    expect(container.querySelector("[data-current]")).toHaveTextContent("Shipped")
    act(() => controller?.dismiss())
    expect(controller?.active).toBeNull()
  })

  it("waits while the island is held", () => {
    let controller: ReturnType<typeof useDynamicIsland> | undefined
    const { container } = render(
      <Harness onReady={(island) => (controller = island)} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Ship" }))
    const root = container.querySelector(".kg-dynamic-island") as HTMLElement
    fireEvent.pointerEnter(root, { pointerType: "mouse" })
    act(() => jest.advanceTimersByTime(5000))
    expect(controller?.active).not.toBeNull()
    fireEvent.pointerLeave(root)
    act(() => jest.advanceTimersByTime(1000))
    expect(controller?.active).toBeNull()
  })
})
