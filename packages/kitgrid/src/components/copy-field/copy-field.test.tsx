import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CopyField } from "./copy-field.js"

describe("CopyField", () => {
  it("copies the value, announces it and calls onCopy", async () => {
    const user = userEvent.setup()
    const writeText = jest.spyOn(navigator.clipboard, "writeText")
    const onCopy = jest.fn()
    render(<CopyField label="Project ID" value="prj_8f2k1q" onCopy={onCopy} />)
    expect(screen.getByText("prj_8f2k1q")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Copy Project ID" }))
    expect(writeText).toHaveBeenCalledWith("prj_8f2k1q")
    expect(onCopy).toHaveBeenCalledWith("prj_8f2k1q")
    expect(screen.getByRole("status")).toHaveTextContent("Copied")
  })

  it("shows a prompt for commands without copying it", async () => {
    const user = userEvent.setup()
    const writeText = jest.spyOn(navigator.clipboard, "writeText")
    render(<CopyField variant="command" aria-label="install command" value="npm i kitgrid" />)
    await user.click(screen.getByRole("button", { name: "Copy install command" }))
    expect(writeText).toHaveBeenCalledWith("npm i kitgrid")
  })
})
