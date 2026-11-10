import { act, fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog.js"

const Example = ({ onDelete = () => {} }: { onDelete?: () => void }) => (
  <AlertDialog>
    <AlertDialogTrigger>Delete project</AlertDialogTrigger>
    <AlertDialogContent tone="danger">
      <AlertDialogTitle>Delete project?</AlertDialogTitle>
      <AlertDialogDescription>This removes 14 files.</AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="danger" onClick={onDelete}>
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

describe("AlertDialog", () => {
  it("opens as a labelled alertdialog with focus on Cancel", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }))
    const dialog = screen.getByRole("alertdialog", { name: "Delete project?" })
    expect(dialog).toHaveAccessibleDescription("This removes 14 files.")
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus()
  })

  it("runs the action and closes", async () => {
    const onDelete = jest.fn()
    render(<Example onDelete={onDelete} />)
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("ignores backdrop clicks but closes on Escape", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }))
    const dialog = screen.getByRole("alertdialog")
    fireEvent.pointerDown(dialog, { clientX: -10, clientY: -10 })
    fireEvent.click(dialog, { clientX: -10, clientY: -10 })
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    act(() => {
      dialog.dispatchEvent(new Event("cancel", { cancelable: true }))
    })
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })
})
