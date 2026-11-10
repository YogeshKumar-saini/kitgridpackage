import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "./responsive-dialog.js"

const mockWidth = (desktop: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: desktop,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

const Example = () => (
  <ResponsiveDialog>
    <ResponsiveDialogTrigger>Share</ResponsiveDialogTrigger>
    <ResponsiveDialogContent>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Share file</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>Anyone with the link can view.</ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
    </ResponsiveDialogContent>
  </ResponsiveDialog>
)

describe("ResponsiveDialog", () => {
  const original = window.matchMedia
  afterEach(() => {
    window.matchMedia = original
  })

  it("renders a centred dialog on wide screens", async () => {
    mockWidth(true)
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Share" }))
    const dialog = screen.getByRole("dialog", { name: "Share file" })
    expect(dialog).toHaveAttribute("data-surface", "dialog")
    expect(dialog).toHaveClass("kg-dialog")
    expect(dialog).toHaveAccessibleDescription("Anyone with the link can view.")
  })

  it("renders a bottom sheet on narrow screens with the same labelling", async () => {
    mockWidth(false)
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Share" }))
    const sheet = screen.getByRole("dialog", { name: "Share file" })
    expect(sheet).toHaveAttribute("data-surface", "sheet")
    expect(sheet).toHaveAttribute("data-side", "bottom")
  })
})
