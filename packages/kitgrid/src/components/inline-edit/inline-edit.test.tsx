import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { InlineEdit } from "./inline-edit.js"

describe("InlineEdit", () => {
  it("names the display button with the label and the value", () => {
    render(<InlineEdit label="Project name" defaultValue="Northwind" />)
    expect(
      screen.getByRole("button", { name: "Edit Project name: Northwind" }),
    ).toBeInTheDocument()
  })

  it("saves with Enter and returns focus to the text", async () => {
    const onValueChange = jest.fn()
    render(<InlineEdit label="Project name" defaultValue="Northwind" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("button"))
    const input = screen.getByRole("textbox", { name: "Project name" })
    expect(input).toHaveFocus()
    await userEvent.clear(input)
    await userEvent.type(input, "Harbor{Enter}")
    expect(onValueChange).toHaveBeenCalledWith("Harbor")
    expect(screen.getByRole("button")).toHaveFocus()
    expect(screen.getByRole("button")).toHaveTextContent("Harbor")
  })

  it("cancels with Escape", async () => {
    const onValueChange = jest.fn()
    render(<InlineEdit label="Title" defaultValue="Draft" onValueChange={onValueChange} />)
    screen.getByRole("button").focus()
    await userEvent.keyboard("{Enter}")
    await userEvent.keyboard("Final{Escape}")
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole("button")).toHaveTextContent("Draft")
  })

  it("refuses an empty value when required", async () => {
    const onValueChange = jest.fn()
    render(<InlineEdit label="Title" defaultValue="Draft" required onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("button"))
    await userEvent.clear(screen.getByRole("textbox"))
    await userEvent.keyboard("{Enter}")
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole("button")).toHaveTextContent("Draft")
  })
})
