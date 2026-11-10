import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { KitgridProvider } from "../../provider/kitgrid-provider.js"
import {
  MorphDialog,
  MorphDialogClose,
  MorphDialogContent,
  MorphDialogImage,
  MorphDialogTitle,
  MorphDialogTrigger,
} from "./morph-dialog.js"

const Product = (props: { open?: boolean; onOpenChange?: (open: boolean) => void }) => (
  <MorphDialog {...props}>
    <MorphDialogTrigger>
      <MorphDialogImage src="/overshirt.jpg" alt="Linen overshirt on a hanger" />
      <MorphDialogTitle>Washed Linen Overshirt</MorphDialogTitle>
      <span>$98</span>
    </MorphDialogTrigger>
    <MorphDialogContent>
      <MorphDialogImage src="/overshirt.jpg" alt="Linen overshirt on a hanger" />
      <MorphDialogTitle>Washed Linen Overshirt</MorphDialogTitle>
      <button type="button">Add to bag</button>
      <MorphDialogClose />
    </MorphDialogContent>
  </MorphDialog>
)

type StartViewTransition = (update: () => void) => { finished: Promise<void> }

afterEach(() => {
  delete (document as { startViewTransition?: StartViewTransition }).startViewTransition
})

describe("MorphDialog", () => {
  it("renders a neutral placeholder in place of an image without a src", () => {
    const { container } = render(
      <MorphDialog>
        <MorphDialogTrigger>
          <MorphDialogImage alt="Field jacket" />
          <MorphDialogTitle>Field Jacket</MorphDialogTitle>
        </MorphDialogTrigger>
      </MorphDialog>,
    )
    expect(container.querySelector("img")).toBeNull()
    const placeholder = container.querySelector(".kg-morph-dialog__image")
    expect(placeholder).toHaveAttribute("data-placeholder")
    expect(placeholder).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByRole("button", { name: "Field Jacket" })).toBeInTheDocument()
  })

  it("opens a modal dialog named by its title from the card", async () => {
    const user = userEvent.setup()
    render(<Product />)
    const trigger = screen.getByRole("button", { name: /Washed Linen Overshirt/ })
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("dialog")).toBeNull()

    await user.click(trigger)
    const dialog = screen.getByRole("dialog", { name: "Washed Linen Overshirt" })
    expect(dialog).toHaveAttribute("open")
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(trigger).toHaveAttribute("aria-controls", dialog.id)
    expect(screen.getByRole("button", { name: "Add to bag" })).toHaveFocus()
  })

  it("keeps the card image decorative and the dialog image described", async () => {
    const user = userEvent.setup()
    const { container } = render(<Product />)
    const cardImage = container.querySelector(".kg-morph-dialog__trigger img")
    expect(cardImage).toHaveAttribute("alt", "")
    await user.click(screen.getByRole("button", { name: /Overshirt/ }))
    expect(
      screen.getByRole("img", { name: "Linen overshirt on a hanger" }),
    ).toBeInTheDocument()
  })

  it("closes from the close button and returns focus to the card", async () => {
    const user = userEvent.setup()
    render(<Product />)
    const trigger = screen.getByRole("button", { name: /Overshirt/ })
    await user.click(trigger)
    await user.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(trigger).toHaveFocus()
  })

  it("closes on Escape", async () => {
    const user = userEvent.setup()
    render(<Product />)
    await user.click(screen.getByRole("button", { name: /Overshirt/ }))
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("can be controlled", async () => {
    const user = userEvent.setup()
    const changes: boolean[] = []
    const Controlled = () => {
      const [open, setOpen] = useState(false)
      return (
        <Product
          open={open}
          onOpenChange={(next) => {
            changes.push(next)
            setOpen(next)
          }}
        />
      )
    }
    render(<Controlled />)
    await user.click(screen.getByRole("button", { name: /Overshirt/ }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(changes).toEqual([true])
  })

  it("morphs through a view transition, moving shared names from card to dialog", async () => {
    const user = userEvent.setup()
    const seen: Record<string, string | undefined> = {}
    const card = () =>
      document.querySelector<HTMLElement>(".kg-morph-dialog__trigger")
    const cardImage = () => card()?.querySelector<HTMLElement>("img")
    const startViewTransition = jest.fn<StartViewTransition>((update) => {
      seen.cardBefore = card()?.style.getPropertyValue("--_vt-surface")
      seen.imageBefore = cardImage()?.style.getPropertyValue("--_vt-image")
      update()
      const dialog = document.querySelector<HTMLElement>("dialog")
      seen.cardAfter = card()?.style.getPropertyValue("--_vt-surface")
      seen.dialogAfter = dialog?.style.getPropertyValue("--_vt-surface")
      seen.imageAfter = dialog
        ?.querySelector<HTMLElement>("img")
        ?.style.getPropertyValue("--_vt-image")
      return { finished: Promise.resolve() }
    })
    ;(document as { startViewTransition?: StartViewTransition }).startViewTransition =
      startViewTransition
    render(<Product />)
    const trigger = screen.getByRole("button", { name: /Overshirt/ })
    expect(trigger).toHaveAttribute("data-motion", "view-transition")
    // Idle cards carry no names, so neighbours are never captured into someone else's morph.
    expect(trigger.style.getPropertyValue("--_vt-surface")).toBe("")

    await user.click(trigger)
    expect(startViewTransition).toHaveBeenCalledTimes(1)
    expect(seen.cardBefore).toMatch(/^kg-morph-/)
    expect(seen.imageBefore).toMatch(/^kg-morph-.*-image$/)
    expect(seen.cardAfter).toBe("")
    expect(seen.dialogAfter).toBe(seen.cardBefore)
    expect(seen.imageAfter).toBe(seen.imageBefore)
    await waitFor(() =>
      expect(screen.getByRole("dialog").style.getPropertyValue("--_vt-surface")).toBe(
        "",
      ),
    )
  })

  it("crossfades instead of morphing under reduced motion", async () => {
    const user = userEvent.setup()
    render(
      <KitgridProvider reducedMotion="always">
        <Product />
      </KitgridProvider>,
    )
    const trigger = screen.getByRole("button", { name: /Overshirt/ })
    expect(trigger).toHaveAttribute("data-motion", "fade")
    await user.click(trigger)
    expect(screen.getByRole("dialog")).toHaveAttribute("data-motion", "fade")
  })
})
