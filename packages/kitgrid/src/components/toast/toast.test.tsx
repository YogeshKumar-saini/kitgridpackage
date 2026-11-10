import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Toaster } from "./toast.js"
import { toast } from "./toast-store.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

// The store is module-wide; with no Toaster mounted, dismissing clears it at once.
beforeEach(() => {
  toast.dismiss()
})

afterEach(() => {
  jest.useRealTimers()
})

describe("Toaster", () => {
  it("renders a labelled notifications landmark and announces politely", () => {
    render(<Toaster />)
    expect(screen.getByRole("region", { name: "Notifications" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Alt+T",
    )
    let id = ""
    act(() => {
      id = toast("Saved to wishlist", { description: "Linen shirt, size M" })
    })
    expect(id).toMatch(/kg-toast/)
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Saved to wishlist")
    expect(status).toHaveTextContent("Linen shirt, size M")
    expect(status).toHaveAttribute("aria-atomic", "true")
  })

  it("uses role=alert for errors and marks tones", () => {
    render(<Toaster />)
    act(() => {
      toast.error("Payment declined")
      toast.success("Order placed")
    })
    expect(screen.getByRole("alert")).toHaveTextContent("Payment declined")
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "success")
  })

  it("closes itself after its duration, pausing while hovered", () => {
    jest.useFakeTimers()
    const onAutoClose = jest.fn()
    render(<Toaster duration={3000} />)
    act(() => {
      toast("Copied", { onAutoClose })
    })
    const list = screen.getByRole("list")
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    fireEvent.pointerEnter(list)
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(screen.getByRole("status")).toBeInTheDocument()
    fireEvent.pointerLeave(list)
    act(() => {
      jest.advanceTimersByTime(999)
    })
    expect(screen.getByRole("status")).toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(onAutoClose).toHaveBeenCalledTimes(1)
  })

  it("dismisses by id and reports it", () => {
    const onDismiss = jest.fn()
    render(<Toaster />)
    let id = ""
    act(() => {
      id = toast("Item removed", { onDismiss })
      toast("Another")
    })
    act(() => toast.dismiss(id))
    expect(onDismiss).toHaveBeenCalledWith(expect.objectContaining({ id }))
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveTextContent("Another")
  })

  it("runs the action and closes, unless the action prevents it", async () => {
    const undo = jest.fn()
    render(<Toaster />)
    act(() => {
      toast("Moved to trash", { action: { label: "Undo", onClick: undo } })
    })
    await userEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(undo).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("follows a promise from loading to success, updating in place", async () => {
    render(<Toaster />)
    let resolve: (value: string) => void = () => {}
    const task = new Promise<string>((done) => {
      resolve = done
    })
    act(() => {
      toast.promise(task, {
        loading: "Uploading…",
        success: (name) => `${name} uploaded`,
        error: "Upload failed",
      })
    })
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "loading")
    await act(async () => {
      resolve("photo.jpg")
      await task
    })
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("photo.jpg uploaded")
    expect(status).toHaveAttribute("data-tone", "success")
    expect(screen.getAllByRole("status")).toHaveLength(1)
  })

  it("updates a toast by id", () => {
    render(<Toaster />)
    act(() => {
      const id = toast.loading("Syncing")
      toast.update(id, { tone: "info", title: "Synced 3 items" })
    })
    expect(screen.getByRole("status")).toHaveTextContent("Synced 3 items")
  })

  it("focuses the newest toast with the hotkey and dismisses it with Escape", async () => {
    render(<Toaster closeButton />)
    act(() => {
      toast("First")
      toast("Second")
    })
    await userEvent.keyboard("{Alt>}t{/Alt}")
    expect(document.activeElement).toHaveTextContent("Second")
    await userEvent.keyboard("{Escape}")
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveTextContent("First")
    await userEvent.click(screen.getByRole("button", { name: "Close notification" }))
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("keeps toasts beyond max hidden and their timers paused", () => {
    jest.useFakeTimers()
    render(<Toaster max={1} duration={1000} />)
    act(() => {
      toast("Older")
      toast("Newer")
    })
    const [newer, older] = screen.getAllByRole("status")
    expect(newer).toHaveTextContent("Newer")
    expect(older).toHaveAttribute("data-overflow")
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(screen.getByRole("status")).toHaveTextContent("Older")
    expect(screen.getByRole("status")).not.toHaveAttribute("data-overflow")
  })
})
