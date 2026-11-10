import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { FontPicker, type FontPickerOption } from "./font-picker.js"

const options: FontPickerOption[] = [
  { value: "geist", label: "Geist", family: "Geist, sans-serif", note: "Neutral" },
  { value: "serif", label: "Source Serif", family: "Georgia, serif", note: "Bookish" },
]

describe("FontPicker", () => {
  it("previews each face and follows a controlled value", async () => {
    const Controlled = () => {
      const [font, setFont] = useState("geist")
      return (
        <>
          <FontPicker options={options} value={font} onValueChange={setFont} />
          <output>{font}</output>
        </>
      )
    }
    render(<Controlled />)
    expect(screen.getByRole("radiogroup", { name: "Typeface" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Geist/ })).toBeChecked()
    expect(screen.getByText("Source Serif")).toHaveStyle({
      fontFamily: "Georgia, serif",
    })
    await userEvent.click(screen.getByRole("radio", { name: /Source Serif/ }))
    expect(screen.getByRole("status")).toHaveTextContent("serif")
  })
})
