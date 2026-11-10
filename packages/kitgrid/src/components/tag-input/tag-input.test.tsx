import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { TagInput } from "./tag-input.js"

describe("TagInput", () => {
  it("adds tags with Enter and the comma delimiter, ignoring duplicates", async () => {
    const onValueChange = jest.fn()
    render(<TagInput aria-label="Skills" onValueChange={onValueChange} />)
    const input = screen.getByRole("textbox", { name: "Skills" })
    await userEvent.type(input, "Figma{Enter}React,figma,")
    expect(onValueChange).toHaveBeenLastCalledWith(["Figma", "React"])
    expect(screen.getByRole("button", { name: "Remove Figma" })).toBeInTheDocument()
    expect(input).toHaveValue("")
  })

  it("marks the last tag on Backspace and removes it on the second press", async () => {
    render(<TagInput aria-label="Skills" defaultValue={["Figma", "React"]} />)
    const input = screen.getByRole("textbox")
    input.focus()
    await userEvent.keyboard("{Backspace}")
    expect(screen.getByText("React").closest("[data-pending]")).not.toBeNull()
    await userEvent.keyboard("{Backspace}")
    expect(screen.queryByText("React")).not.toBeInTheDocument()
  })

  it("walks chips with the arrow keys and deletes the focused chip", async () => {
    const onValueChange = jest.fn()
    render(
      <TagInput
        aria-label="Skills"
        defaultValue={["Figma", "React", "Rust"]}
        onValueChange={onValueChange}
      />,
    )
    screen.getByRole("textbox").focus()
    await userEvent.keyboard("{ArrowLeft}")
    expect(screen.getByRole("button", { name: "Remove Rust" })).toHaveFocus()
    await userEvent.keyboard("{ArrowLeft}{Delete}")
    expect(onValueChange).toHaveBeenLastCalledWith(["Figma", "Rust"])
  })

  it("splits pasted lists and respects max", () => {
    const onValueChange = jest.fn()
    render(<TagInput aria-label="Skills" max={2} onValueChange={onValueChange} />)
    fireEvent.paste(screen.getByRole("textbox"), {
      clipboardData: { getData: () => "Go, Swift\nKotlin" },
    })
    expect(onValueChange).toHaveBeenLastCalledWith(["Go", "Swift"])
    expect(screen.getByRole("textbox")).toHaveAttribute("readonly")
  })

  it("refuses tags that fail validation", async () => {
    render(
      <TagInput aria-label="Emails" validate={(tag) => tag.includes("@")} />,
    )
    const input = screen.getByRole("textbox")
    await userEvent.type(input, "nope{Enter}")
    expect(screen.queryByRole("button", { name: "Remove nope" })).not.toBeInTheDocument()
    expect(input).toHaveValue("nope")
    await userEvent.clear(input)
    await userEvent.type(input, "ana@site.io{Enter}")
    expect(screen.getByText("ana@site.io")).toBeInTheDocument()
  })
})
