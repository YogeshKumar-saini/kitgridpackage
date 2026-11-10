import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { SignaturePad } from "./signature-pad.js"

beforeAll(() => {
  const noop = () => {}
  const ctx = {
    beginPath: noop,
    arc: noop,
    fill: noop,
    moveTo: noop,
    quadraticCurveTo: noop,
    stroke: noop,
    setTransform: noop,
  }
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as HTMLCanvasElement["getContext"]
  HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AAAA"
})

const sign = (canvas: HTMLElement, from = 10) => {
  fireEvent.pointerDown(canvas, { button: 0, clientX: from, clientY: 20, pointerId: 1 })
  fireEvent.pointerMove(canvas, { clientX: from + 20, clientY: 30, pointerId: 1 })
  fireEvent.pointerUp(canvas, { pointerId: 1 })
}

describe("SignaturePad", () => {
  it("starts empty with its actions disabled", () => {
    render(<SignaturePad />)
    expect(screen.getByRole("img", { name: "Signature, empty" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled()
  })

  it("reports a PNG after each stroke", () => {
    const onValueChange = jest.fn()
    render(<SignaturePad onValueChange={onValueChange} />)
    sign(screen.getByRole("img"))
    expect(onValueChange).toHaveBeenLastCalledWith("data:image/png;base64,AAAA")
    expect(screen.getByRole("img", { name: "Signature, signed" })).toBeInTheDocument()
  })

  it("undoes stroke by stroke and clears", async () => {
    const onValueChange = jest.fn()
    render(<SignaturePad onValueChange={onValueChange} />)
    const canvas = screen.getByRole("img")
    sign(canvas)
    sign(canvas, 60)
    await userEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(onValueChange).toHaveBeenLastCalledWith("data:image/png;base64,AAAA")
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(onValueChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled()
  })

  it("ignores the pointer while disabled", () => {
    const onValueChange = jest.fn()
    render(<SignaturePad disabled onValueChange={onValueChange} />)
    sign(screen.getByRole("img"))
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
