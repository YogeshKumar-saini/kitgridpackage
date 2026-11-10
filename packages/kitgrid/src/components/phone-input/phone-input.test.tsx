import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { formatPhone } from "./countries.js"
import { PhoneInput } from "./phone-input.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

describe("formatPhone", () => {
  it("lays digits into the pattern without trailing literals", () => {
    expect(formatPhone("415", "(###) ###-####")).toBe("(415")
    expect(formatPhone("4155550123", "(###) ###-####")).toBe("(415) 555-0123")
  })
})

describe("PhoneInput", () => {
  it("formats as you type and reports E.164", async () => {
    const onValueChange = jest.fn()
    render(<PhoneInput aria-label="Phone" onValueChange={onValueChange} />)
    const input = screen.getByRole("textbox", { name: "Phone" })
    await userEvent.type(input, "4155550123")
    expect(input).toHaveValue("(415) 555-0123")
    expect(onValueChange).toHaveBeenLastCalledWith("+14155550123")
  })

  it("switches country from the searchable code picker", async () => {
    const onCountryChange = jest.fn()
    render(<PhoneInput aria-label="Phone" onCountryChange={onCountryChange} />)
    await userEvent.click(screen.getByRole("button", { name: /^Country code/ }))
    await userEvent.keyboard("japan{Enter}")
    expect(onCountryChange).toHaveBeenCalledWith("JP")
    expect(screen.getByRole("button", { name: /^Country code/ })).toHaveTextContent("+81")
  })

  it("detects the country from a pasted international number", () => {
    const onValueChange = jest.fn()
    render(<PhoneInput aria-label="Phone" onValueChange={onValueChange} />)
    fireEvent.paste(screen.getByRole("textbox"), {
      clipboardData: { getData: () => "+44 20 7946 0958" },
    })
    expect(onValueChange).toHaveBeenLastCalledWith("+442079460958")
    expect(screen.getByRole("button", { name: /^Country code/ })).toHaveTextContent("GB")
  })

  it("reads the country from an initial value", () => {
    render(<PhoneInput aria-label="Phone" defaultValue="+919876543210" />)
    expect(screen.getByRole("textbox")).toHaveValue("98765 43210")
  })
})
