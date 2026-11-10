import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { createRef, useState } from "react"
import { Input } from "./input.js"

describe("Input", () => {
  it("puts the class on the wrapper and props and ref on the native input", () => {
    const ref = createRef<HTMLInputElement>()
    const { container } = render(
      <Input
        ref={ref}
        className="custom"
        placeholder="Search"
        size="lg"
        aria-label="Search"
      />,
    )
    const input = screen.getByRole("textbox", { name: "Search" })
    expect(ref.current).toBe(input)
    expect(input).toHaveAttribute("placeholder", "Search")
    expect(container.firstElementChild).toHaveClass("kg-input", "custom")
    expect(container.firstElementChild).toHaveAttribute("data-size", "lg")
  })

  it("defaults to the outline variant and exposes others as a data attribute", () => {
    const { container, rerender } = render(<Input aria-label="Name" />)
    expect(container.firstElementChild).toHaveAttribute("data-variant", "outline")
    for (const variant of ["filled", "underline"] as const) {
      rerender(<Input aria-label="Name" variant={variant} />)
      expect(container.firstElementChild).toHaveAttribute("data-variant", variant)
    }
  })

  it("announces text adornments as part of the description", () => {
    render(<Input aria-label="Price" leading="$" trailing="USD" />)
    expect(screen.getByRole("textbox", { name: "Price" })).toHaveAccessibleDescription(
      "$ USD",
    )
  })

  it("reports invalid state", () => {
    render(<Input aria-label="Email" invalid />)
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true")
  })

  it("clears an uncontrolled value, fires onChange and onClear, and refocuses", async () => {
    const onClear = jest.fn()
    const onChange = jest.fn()
    render(
      <Input
        aria-label="Query"
        defaultValue="shoes"
        onClear={onClear}
        onChange={onChange}
      />,
    )
    const input = screen.getByRole("textbox")
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(input).toHaveValue("")
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(input).toHaveFocus()
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument()
  })

  it("clears a controlled value through onChange", async () => {
    const Controlled = () => {
      const [value, setValue] = useState("boots")
      return (
        <Input
          aria-label="Query"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onClear={() => {}}
          clearLabel="Clear search"
        />
      )
    }
    render(<Controlled />)
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect(screen.getByRole("textbox")).toHaveValue("")
  })

  it("shows the clear button only once there is a value", async () => {
    render(<Input aria-label="Query" onClear={() => {}} />)
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole("textbox"), "a")
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument()
  })

  it("hides the clear button when read-only or disabled", () => {
    const { rerender } = render(
      <Input aria-label="Query" defaultValue="x" readOnly onClear={() => {}} />,
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    rerender(<Input aria-label="Query" defaultValue="x" disabled onClear={() => {}} />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
