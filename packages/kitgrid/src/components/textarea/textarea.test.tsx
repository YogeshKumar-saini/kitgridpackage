import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { createRef } from "react"
import { Field } from "../field/field.js"
import { Textarea } from "./textarea.js"

describe("Textarea", () => {
  it("forwards the ref and native props to the textarea", () => {
    const ref = createRef<HTMLTextAreaElement>()
    render(<Textarea ref={ref} aria-label="Notes" minRows={4} placeholder="Write…" />)
    const textarea = screen.getByRole("textbox", { name: "Notes" })
    expect(ref.current).toBe(textarea)
    expect(textarea).toHaveAttribute("rows", "4")
    expect(textarea).toHaveAttribute("placeholder", "Write…")
  })

  it("is wired by a surrounding Field", () => {
    render(
      <Field label="Bio" error="Too short">
        <Textarea />
      </Field>,
    )
    const textarea = screen.getByRole("textbox", { name: "Bio" })
    expect(textarea).toHaveAttribute("aria-invalid", "true")
    expect(textarea).toHaveAccessibleDescription("Too short")
  })

  it("counts characters and announces only near the limit", async () => {
    const { container } = render(<Textarea aria-label="Review" maxLength={20} />)
    const live = container.querySelector("[aria-live]")
    const textarea = screen.getByRole("textbox")
    await userEvent.type(textarea, "Great")
    expect(screen.getByText("5/20")).toBeInTheDocument()
    expect(live).toHaveTextContent("")
    await userEvent.type(textarea, " fit, love it")
    expect(screen.getByText("18/20")).toBeInTheDocument()
    expect(live).toHaveTextContent("2 characters remaining")
  })

  it("counts a controlled value and uses a custom label", () => {
    const { container } = render(
      <Textarea
        aria-label="Review"
        value="abcdefghi"
        onChange={() => {}}
        maxLength={10}
        countLabel={(remaining) => `${remaining} left`}
      />,
    )
    expect(screen.getByText("9/10")).toBeInTheDocument()
    expect(container.querySelector("[aria-live]")).toHaveTextContent("1 left")
  })

  it("can hide the count", () => {
    render(<Textarea aria-label="Review" maxLength={10} showCount={false} />)
    expect(screen.queryByText("0/10")).not.toBeInTheDocument()
  })
})
