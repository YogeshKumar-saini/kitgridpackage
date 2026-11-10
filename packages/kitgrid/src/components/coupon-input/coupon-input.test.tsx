import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import {
  type CouponInputApplied,
  type CouponInputResult,
  CouponInput,
} from "./coupon-input.js"

const deferred = () => {
  let resolve!: (value: CouponInputResult) => void
  const promise = new Promise<CouponInputResult>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const field = () => screen.getByRole("textbox", { name: "Discount code" })
const applyButton = () => screen.getByRole("button", { name: "Apply" })

describe("CouponInput", () => {
  it("disables Apply until a code is typed", async () => {
    render(<CouponInput onApply={async () => ({ ok: true })} />)
    expect(applyButton()).toBeDisabled()
    await userEvent.type(field(), "   ")
    expect(applyButton()).toBeDisabled()
    await userEvent.type(field(), "x")
    expect(applyButton()).toBeEnabled()
  })

  it("sends a trimmed, uppercased code and shows a busy button while applying", async () => {
    const pending = deferred()
    const onApply = jest.fn(() => pending.promise)
    const { container } = render(<CouponInput onApply={onApply} />)
    await userEvent.type(field(), "  welcome10 ")
    await userEvent.click(applyButton())
    expect(onApply).toHaveBeenCalledWith("WELCOME10")
    expect(container.firstElementChild).toHaveAttribute("data-state", "applying")
    expect(applyButton()).toHaveAttribute("aria-busy", "true")
    expect(field()).toHaveAttribute("readonly")
    pending.resolve({ ok: true, message: "You saved $12.00" })
    expect(await screen.findByText("WELCOME10")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute("data-state", "applied")
  })

  it("shows the applied code as a removable tag with savings and announces it", async () => {
    const onRemove = jest.fn()
    render(
      <CouponInput
        onApply={async () => ({ ok: true, message: "You saved $12.00" })}
        onRemove={onRemove}
      />,
    )
    await userEvent.type(field(), "save12{Enter}")
    expect(await screen.findByText("SAVE12")).toBeInTheDocument()
    expect(
      screen.getByText("You saved $12.00", { selector: ".kg-coupon-input__savings" }),
    )
    expect(screen.getByRole("status")).toHaveTextContent("You saved $12.00")
    expect(field()).toHaveValue("")
    await userEvent.click(screen.getByRole("button", { name: "Remove code SAVE12" }))
    expect(onRemove).toHaveBeenCalledWith("SAVE12")
    await waitFor(() => expect(screen.queryByText("SAVE12")).toBeNull())
    expect(screen.getByRole("status")).toHaveTextContent("Code SAVE12 removed")
    expect(field()).toHaveFocus()
  })

  it("reports invalid codes, links the error and keeps focus in the field", async () => {
    render(
      <CouponInput
        onApply={async () => ({ ok: false, message: "This code has expired." })}
      />,
    )
    await userEvent.type(field(), "OLD{Enter}")
    const error = await screen.findByText("This code has expired.", { selector: "p" })
    expect(field()).toHaveAttribute("aria-invalid", "true")
    expect(field()).toHaveAttribute("aria-describedby", error.id)
    expect(field()).toHaveFocus()
    expect(screen.getByRole("status")).toHaveTextContent("This code has expired.")
    await userEvent.type(field(), "X")
    expect(field()).not.toHaveAttribute("aria-invalid")
  })

  it("falls back to default messages for bare failures and thrown errors", async () => {
    const onApply = jest
      .fn<(code: string) => Promise<CouponInputResult>>()
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error("network"))
    render(<CouponInput onApply={onApply} />)
    await userEvent.type(field(), "A{Enter}")
    expect(
      await screen.findByText("This code isn't valid.", { selector: "p" }),
    ).toBeInTheDocument()
    await userEvent.type(field(), "B{Enter}")
    expect(
      await screen.findByText("We couldn't apply that code. Please try again.", {
        selector: "p",
      }),
    ).toBeInTheDocument()
  })

  it("does not submit a surrounding form on Enter", async () => {
    const onSubmit = jest.fn((event: SubmitEvent) => event.preventDefault())
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <CouponInput onApply={async () => ({ ok: true })} />
      </form>,
    )
    await userEvent.type(field(), "CODE{Enter}")
    await screen.findByText("CODE")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("supports a controlled applied code", async () => {
    const Controlled = () => {
      const [applied, setApplied] = useState<CouponInputApplied | null>({
        code: "VIP",
        message: "−20%",
      })
      return (
        <CouponInput
          applied={applied}
          onAppliedChange={setApplied}
          onApply={async () => ({ ok: true })}
        />
      )
    }
    render(<Controlled />)
    expect(screen.getByText("VIP")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Remove code VIP" }))
    await waitFor(() => expect(screen.queryByText("VIP")).toBeNull())
  })
})
