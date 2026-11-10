import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "./bottom-sheet.js"

const Example = ({ onSnapChange }: { onSnapChange?: (index: number) => void }) => (
  <BottomSheet>
    <BottomSheetTrigger>Filters</BottomSheetTrigger>
    <BottomSheetContent snapPoints={[0.3, 0.6, 0.9]} onSnapChange={onSnapChange}>
      <BottomSheetHeader>
        <BottomSheetTitle>Filters</BottomSheetTitle>
      </BottomSheetHeader>
      <BottomSheetBody>
        <input aria-label="Max price" />
      </BottomSheetBody>
    </BottomSheetContent>
  </BottomSheet>
)

describe("BottomSheet", () => {
  it("opens as a titled dialog, focusing content rather than the handle", async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole("button", { name: "Filters" }))
    const sheet = screen.getByRole("dialog", { name: "Filters" })
    expect(sheet).toHaveAttribute("data-snap", "0")
    expect(screen.getByRole("textbox", { name: "Max price" })).toHaveFocus()
  })

  it("steps between snap points from the handle with arrows and clicks", async () => {
    const onSnapChange = jest.fn()
    render(<Example onSnapChange={onSnapChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Filters" }))
    const handle = screen.getByRole("button", { name: "Resize sheet" })
    handle.focus()
    await userEvent.keyboard("{ArrowUp}")
    expect(screen.getByRole("dialog")).toHaveAttribute("data-snap", "1")
    await userEvent.keyboard("{ArrowUp}{ArrowUp}")
    expect(screen.getByRole("dialog")).toHaveAttribute("data-snap", "2")
    await userEvent.keyboard("{ArrowDown}")
    expect(onSnapChange).toHaveBeenLastCalledWith(1)
    await userEvent.click(handle)
    expect(screen.getByRole("dialog")).toHaveAttribute("data-snap", "2")
  })
})
