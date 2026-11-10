import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Field } from "../field/field.js"
import { estimatePasswordStrength, PasswordField } from "./password-field.js"

describe("estimatePasswordStrength", () => {
  it("rates length first, then variety", () => {
    expect(estimatePasswordStrength("abc")).toBe(0)
    expect(estimatePasswordStrength("abcdefgh")).toBe(1)
    expect(estimatePasswordStrength("Abcdefg1")).toBe(2)
    expect(estimatePasswordStrength("Abcdefgh1234")).toBe(3)
    expect(estimatePasswordStrength("Abcdefgh1234!xyz")).toBe(4)
  })
})

describe("PasswordField", () => {
  it("hides the text until the toggle is pressed", async () => {
    render(
      <Field label="Password">
        <PasswordField defaultValue="hunter22" />
      </Field>,
    )
    const input = screen.getByLabelText("Password")
    expect(input).toHaveAttribute("type", "password")
    const toggle = screen.getByRole("button", { name: "Show password" })
    expect(toggle).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(toggle)
    expect(input).toHaveAttribute("type", "text")
    expect(toggle).toHaveAttribute("aria-pressed", "true")
  })

  it("announces strength and describes the input with it", async () => {
    render(<PasswordField aria-label="Password" meter />)
    const input = screen.getByLabelText("Password")
    await userEvent.type(input, "Abcdefgh1234")
    expect(screen.getByText("Good")).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription("Good")
  })

  it("ticks off rules as they are met", async () => {
    render(
      <PasswordField
        aria-label="Password"
        rules={[
          { label: "8 characters", test: (v) => v.length >= 8 },
          { label: "A number", test: (v) => /\d/.test(v) },
        ]}
      />,
    )
    await userEvent.type(screen.getByLabelText("Password"), "abc1")
    const items = screen.getAllByRole("listitem")
    expect(items[0]).not.toHaveAttribute("data-met")
    expect(items[1]).toHaveAttribute("data-met")
    expect(items[1]).toHaveTextContent("A number, met")
  })
})
