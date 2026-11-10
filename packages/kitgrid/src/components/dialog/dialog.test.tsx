import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useRef, useState } from "react"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog.js"

const Example = ({ dismissible = true }: { dismissible?: boolean }) => (
  <Dialog>
    <DialogTrigger>Edit profile</DialogTrigger>
    <DialogContent dismissible={dismissible}>
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>Changes are saved to your account.</DialogDescription>
      </DialogHeader>
      <DialogBody>
        <input aria-label="Name" />
      </DialogBody>
      <DialogFooter>
        <DialogClose>Cancel</DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

describe("Dialog", () => {
  it("opens from the trigger with its title and description wired up", async () => {
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Edit profile" })
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    await userEvent.click(trigger)
    const dialog = screen.getByRole("dialog", { name: "Edit profile" })
    expect(dialog).toHaveAccessibleDescription("Changes are saved to your account.")
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(trigger).toHaveAttribute("aria-controls", dialog.id)
  })

  it("moves focus to the first field, skipping the corner close button", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Edit profile" }))
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus()
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
  })

  it("returns focus to the trigger when closed", async () => {
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Edit profile" })
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it("closes on Escape through the cancel event, keeping the element for the exit animation", async () => {
    const onOpenChange = jest.fn()
    render(
      <Dialog defaultOpen onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Delete</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    const dialog = screen.getByRole("dialog", { name: "Delete" })
    const cancel = new Event("cancel", { cancelable: true })
    act(() => {
      dialog.dispatchEvent(cancel)
    })
    expect(cancel.defaultPrevented).toBe(true)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("closes on a backdrop click only when dismissible", async () => {
    const { unmount } = render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Edit profile" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.pointerDown(dialog, { clientX: 900, clientY: 900 })
    fireEvent.click(dialog, { clientX: 900, clientY: 900 })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    unmount()

    render(<Example dismissible={false} />)
    await userEvent.click(screen.getByRole("button", { name: "Edit profile" }))
    const locked = screen.getByRole("dialog")
    fireEvent.pointerDown(locked, { clientX: 900, clientY: 900 })
    fireEvent.click(locked, { clientX: 900, clientY: 900 })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("lets the parent own the open state", async () => {
    const Controlled = () => {
      const [open, setOpen] = useState(true)
      const [log, setLog] = useState<boolean[]>([])
      return (
        <>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setLog((entries) => [...entries, next])
              if (log.length > 0) setOpen(next)
            }}
          >
            <DialogContent closeButton={false}>
              <DialogTitle>Controlled</DialogTitle>
              <DialogClose>Done</DialogClose>
            </DialogContent>
          </Dialog>
          <output>{log.join(",")}</output>
        </>
      )
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("false")
    await userEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("focuses initialFocus on open and supports asChild triggers", async () => {
    const WithInitial = () => {
      const confirm = useRef<HTMLButtonElement>(null)
      return (
        <Dialog>
          <DialogTrigger asChild>
            <a href="#delete">Delete file</a>
          </DialogTrigger>
          <DialogContent initialFocus={confirm} role="alertdialog">
            <DialogTitle>Delete file?</DialogTitle>
            <DialogClose>Cancel</DialogClose>
            <button ref={confirm} type="button">
              Delete
            </button>
          </DialogContent>
        </Dialog>
      )
    }
    render(<WithInitial />)
    await userEvent.click(screen.getByRole("link", { name: "Delete file" }))
    expect(
      screen.getByRole("alertdialog", { name: "Delete file?" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus()
  })
})
