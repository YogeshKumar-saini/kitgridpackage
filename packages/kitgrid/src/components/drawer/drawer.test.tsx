import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer.js"
import type { DrawerSide } from "./drawer.js"

const Cart = ({
  side = "right",
  onOpenChange,
}: {
  side?: DrawerSide
  onOpenChange?: (open: boolean) => void
}) => (
  <Drawer onOpenChange={onOpenChange}>
    <DrawerTrigger>Open cart</DrawerTrigger>
    <DrawerContent side={side}>
      <DrawerHeader>
        <DrawerTitle>Your cart</DrawerTitle>
        <DrawerDescription>2 items</DrawerDescription>
      </DrawerHeader>
      <DrawerBody>
        <p>Linen shirt</p>
      </DrawerBody>
      <DrawerFooter>
        <DrawerClose>Keep shopping</DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
)

const pointer = { pointerId: 1, button: 0, isPrimary: true }

const drag = (
  node: HTMLElement,
  axis: "clientX" | "clientY",
  from: number,
  to: number,
) => {
  fireEvent.pointerDown(node, { ...pointer, [axis]: from })
  fireEvent.pointerMove(node, { ...pointer, [axis]: (from + to) / 2 })
  fireEvent.pointerMove(node, { ...pointer, [axis]: to })
  fireEvent.pointerUp(node, { ...pointer, [axis]: to })
}

describe("Drawer", () => {
  it("opens as a labelled modal dialog on the requested side", async () => {
    render(<Cart side="left" />)
    await userEvent.click(screen.getByRole("button", { name: "Open cart" }))
    const drawer = screen.getByRole("dialog", { name: "Your cart" })
    expect(drawer).toHaveAccessibleDescription("2 items")
    expect(drawer).toHaveAttribute("data-side", "left")
    expect(drawer.querySelector(".kg-drawer__handle")).toBeNull()
  })

  it("shows a grab handle on bottom sheets", async () => {
    render(<Cart side="bottom" />)
    await userEvent.click(screen.getByRole("button", { name: "Open cart" }))
    expect(
      screen.getByRole("dialog").querySelector(".kg-drawer__handle"),
    ).not.toBeNull()
  })

  it("closes from DrawerClose and returns focus to the trigger", async () => {
    render(<Cart />)
    const trigger = screen.getByRole("button", { name: "Open cart" })
    await userEvent.click(trigger)
    expect(screen.getByRole("button", { name: "Keep shopping" })).toHaveFocus()
    await userEvent.click(screen.getByRole("button", { name: "Keep shopping" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it("closes on Escape via the cancel event", async () => {
    const onOpenChange = jest.fn()
    render(<Cart onOpenChange={onOpenChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Open cart" }))
    act(() => {
      screen
        .getByRole("dialog")
        .dispatchEvent(new Event("cancel", { cancelable: true }))
    })
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  describe("drag to dismiss", () => {
    let restore: () => void
    beforeEach(() => {
      // Frozen event timestamps keep velocity at zero, so only distance decides.
      // jsdom stamps events with the host realm's clock, which fake timers do not reach.
      const stamp = jest.spyOn(Event.prototype, "timeStamp", "get").mockReturnValue(1000)
      const width = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        "offsetWidth",
      )
      const height = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        "offsetHeight",
      )
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        get: () => 400,
      })
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        get: () => 400,
      })
      restore = () => {
        stamp.mockRestore()
        if (width) Object.defineProperty(HTMLElement.prototype, "offsetWidth", width)
        if (height) Object.defineProperty(HTMLElement.prototype, "offsetHeight", height)
      }
    })
    afterEach(() => {
      restore()
    })

    it("closes when dragged far enough toward the closing edge", async () => {
      render(<Cart />)
      await userEvent.click(screen.getByRole("button", { name: "Open cart" }))
      const drawer = screen.getByRole("dialog")
      drag(drawer, "clientX", 100, 300)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("snaps back after a short drag or a drag the wrong way", async () => {
      render(<Cart side="bottom" />)
      await userEvent.click(screen.getByRole("button", { name: "Open cart" }))
      const drawer = screen.getByRole("dialog")
      drag(drawer, "clientY", 100, 140)
      expect(drawer).toBeInTheDocument()
      expect(drawer.style.translate).toBe("")
      fireEvent.pointerDown(drawer, { ...pointer, clientY: 300 })
      fireEvent.pointerMove(drawer, { ...pointer, clientY: 100 })
      // Pulling past the open position is resisted, never 1:1.
      const shift = Number.parseFloat(drawer.style.translate.split(" ")[1] ?? "0")
      expect(shift).toBeLessThan(0)
      expect(shift).toBeGreaterThan(-200)
      fireEvent.pointerUp(drawer, { ...pointer, clientY: 100 })
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    it("ignores drags that start on interactive content", async () => {
      render(<Cart />)
      await userEvent.click(screen.getByRole("button", { name: "Open cart" }))
      drag(screen.getByRole("button", { name: "Keep shopping" }), "clientX", 100, 380)
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })
})
