import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { createRef, useState } from "react"
import { Field } from "../field/field.js"
import { Switch } from "./switch.js"

describe("Switch", () => {
  it("is a native checkbox exposed with the switch role", () => {
    const ref = createRef<HTMLInputElement>()
    render(<Switch ref={ref} label="Wi-Fi" description="Join known networks." />)
    const control = screen.getByRole("switch", { name: "Wi-Fi" })
    expect(ref.current).toBe(control)
    expect(control).toHaveAttribute("type", "checkbox")
    expect(control).toHaveAccessibleDescription("Join known networks.")
  })

  it("toggles with click and Space and reports the new state", async () => {
    const onCheckedChange = jest.fn()
    render(<Switch label="Dark mode" onCheckedChange={onCheckedChange} />)
    const control = screen.getByRole("switch")
    await userEvent.click(control)
    expect(control).toBeChecked()
    await userEvent.keyboard(" ")
    expect(control).not.toBeChecked()
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]])
  })

  it("follows a controlled checked prop", async () => {
    const Controlled = () => {
      const [on, setOn] = useState(true)
      return <Switch label="Alerts" checked={on} onCheckedChange={setOn} />
    }
    render(<Controlled />)
    const control = screen.getByRole("switch")
    expect(control).toBeChecked()
    await userEvent.click(screen.getByText("Alerts"))
    expect(control).not.toBeChecked()
  })

  it("keeps thumb icons out of the accessibility tree", () => {
    const { container } = render(
      <Switch label="Sound" onIcon={<svg data-testid="on" />} offIcon={<svg />} />,
    )
    expect(container.querySelector(".kg-switch__track")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    expect(screen.getByRole("switch")).toHaveAccessibleName("Sound")
  })

  it("is named and disabled by a Field", () => {
    render(
      <Field label="Two-factor authentication" disabled>
        <Switch />
      </Field>,
    )
    const control = screen.getByRole("switch", { name: "Two-factor authentication" })
    expect(control).toBeDisabled()
  })

  it("places the label first when asked", () => {
    const { container } = render(<Switch label="Notifications" labelPosition="start" />)
    expect(container.firstElementChild).toHaveAttribute("data-label-position", "start")
  })
})
