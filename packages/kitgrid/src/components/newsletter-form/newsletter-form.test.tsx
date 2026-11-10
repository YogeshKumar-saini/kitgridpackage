import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { NewsletterForm } from "./newsletter-form.js"

const field = () => screen.getByRole("textbox", { name: "Email address" })

describe("NewsletterForm", () => {
  it("rejects malformed addresses without calling onSubscribe", async () => {
    const onSubscribe = jest.fn(async () => {})
    render(<NewsletterForm onSubscribe={onSubscribe} />)
    await userEvent.type(field(), "maya@{Enter}")
    expect(onSubscribe).not.toHaveBeenCalled()
    expect(field()).toHaveAttribute("aria-invalid", "true")
    expect(field()).toHaveAccessibleDescription("Enter a valid email address.")
    expect(field()).toHaveFocus()
  })

  it("subscribes a trimmed address and announces success", async () => {
    const onSubscribe = jest.fn(async () => {})
    render(<NewsletterForm onSubscribe={onSubscribe} />)
    await userEvent.type(field(), " maya@nook.studio ")
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }))
    expect(onSubscribe).toHaveBeenCalledWith("maya@nook.studio")
    expect(await screen.findByRole("status")).toHaveTextContent("You're on the list.")
  })

  it("shows the error message when subscribing fails", async () => {
    render(<NewsletterForm onSubscribe={() => Promise.reject(new Error("x"))} />)
    await userEvent.type(field(), "maya@nook.studio{Enter}")
    expect(await screen.findByText("Something went wrong. Try again.")).toBeInTheDocument()
  })
})
