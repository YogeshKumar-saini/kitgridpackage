import { render, screen } from "@testing-library/react"
import { Input } from "../input/input.js"
import { Field, useField } from "./field.js"

describe("Field", () => {
  it("labels and describes the control it wraps", () => {
    render(
      <Field label="Email" description="We never share it.">
        <Input />
      </Field>,
    )
    const input = screen.getByRole("textbox", { name: "Email" })
    expect(input).toHaveAccessibleDescription("We never share it.")
    expect(input).not.toHaveAttribute("aria-invalid")
  })

  it("marks the control invalid and points to the error message", () => {
    render(
      <Field label="Email" error="Enter a valid email address.">
        <Input />
      </Field>,
    )
    const input = screen.getByRole("textbox", { name: "Email" })
    const error = screen.getByText("Enter a valid email address.")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAttribute("aria-errormessage", error.id)
    expect(input).toHaveAccessibleDescription("Enter a valid email address.")
  })

  it("keeps the last message visible but hidden from AT while it collapses", () => {
    const { rerender, container } = render(
      <Field label="Name" error="Required">
        <Input />
      </Field>,
    )
    rerender(
      <Field label="Name">
        <Input />
      </Field>,
    )
    const region = container.querySelector(".kg-field__error-region")
    expect(region).toHaveAttribute("data-state", "closed")
    expect(screen.getByText("Required")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-errormessage")
  })

  it("passes required and disabled down to the control", () => {
    render(
      <Field label="Code" required disabled>
        <Input />
      </Field>,
    )
    const input = screen.getByRole("textbox", { name: /Code/ })
    expect(input).toBeRequired()
    expect(input).toBeDisabled()
  })

  it("exposes its wiring to custom controls through useField", () => {
    const Custom = () => {
      const field = useField()
      return (
        <div data-testid="custom" data-id={field?.id} data-invalid={field?.invalid} />
      )
    }
    render(
      <Field label="Custom" controlId="custom-control" invalid>
        <Custom />
      </Field>,
    )
    const node = screen.getByTestId("custom")
    expect(node).toHaveAttribute("data-id", "custom-control")
    expect(node).toHaveAttribute("data-invalid", "true")
    expect(screen.getByText("Custom")).toHaveAttribute("for", "custom-control")
  })

  it("returns null from useField outside a Field", () => {
    let value: unknown = "unset"
    const Probe = () => {
      value = useField()
      return null
    }
    render(<Probe />)
    expect(value).toBeNull()
  })
})
