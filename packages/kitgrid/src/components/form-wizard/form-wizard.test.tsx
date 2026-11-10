import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { FormWizard, FormWizardStep, useFormWizard } from "./form-wizard.js"

const Checkout = ({ onComplete = jest.fn() }: { onComplete?: () => void }) => {
  const [email, setEmail] = useState("")
  return (
    <FormWizard onComplete={onComplete}>
      <FormWizardStep
        title="Contact"
        validate={() => (email.includes("@") ? true : "Enter an email address.")}
      >
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
      </FormWizardStep>
      <FormWizardStep title="Shipping" validate={async () => true}>
        <p>Address fields</p>
      </FormWizardStep>
      <FormWizardStep title="Review">
        <p>Summary</p>
      </FormWizardStep>
    </FormWizard>
  )
}

describe("FormWizard", () => {
  it("marks the current step and shows its progress", () => {
    render(<Checkout />)
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Contact")
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument()
  })

  it("blocks on a failed validation and shows the message", async () => {
    render(<Checkout />)
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an email address.")
    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument()
  })

  it("advances, focuses the new heading, goes back and finishes", async () => {
    const onComplete = jest.fn()
    render(<Checkout onComplete={onComplete} />)
    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "ana@site.io{Enter}")
    expect(await screen.findByRole("heading", { name: "Shipping" })).toHaveFocus()
    await userEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByRole("heading", { name: "Contact" })).toHaveFocus()
    await userEvent.click(screen.getByRole("button", { name: "Continue" }))
    await userEvent.click(await screen.findByRole("button", { name: "Continue" }))
    expect(await screen.findByRole("heading", { name: "Review" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Finish" }))
    expect(onComplete).toHaveBeenCalled()
  })

  it("lets visited steps be revisited from the rail only", async () => {
    render(<Checkout />)
    expect(screen.getByRole("button", { name: /Shipping/ })).toBeDisabled()
    await userEvent.type(screen.getByRole("textbox"), "ana@site.io{Enter}")
    await screen.findByRole("heading", { name: "Shipping" })
    await userEvent.click(screen.getByRole("button", { name: /Contact, done/ }))
    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument()
  })

  it("exposes navigation through useFormWizard", async () => {
    const Skip = () => {
      const wizard = useFormWizard()
      return (
        <button type="button" onClick={() => wizard.goTo(1)}>
          Skip ahead
        </button>
      )
    }
    render(
      <FormWizard>
        <FormWizardStep title="One">
          <Skip />
        </FormWizardStep>
        <FormWizardStep title="Two">Done</FormWizardStep>
      </FormWizard>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Skip ahead" }))
    expect(screen.getByRole("heading", { name: "Two" })).toBeInTheDocument()
  })
})
