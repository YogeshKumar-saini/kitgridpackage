import { render, screen } from "@testing-library/react"
import { encodeQr } from "./encode.js"
import { QrCode } from "./qr-code.js"

const finderAt = (modules: boolean[][], x0: number, y0: number) => {
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      const d = Math.max(Math.abs(x - 3), Math.abs(y - 3))
      if (modules[y0 + y]?.[x0 + x] !== (d !== 2)) return false
    }
  return true
}

describe("encodeQr", () => {
  it("picks the smallest version that fits", () => {
    expect(encodeQr("HELLO", "L").version).toBe(1)
    expect(encodeQr("https://kitgrid.dev", "M").version).toBe(2)
    expect(encodeQr("x".repeat(150), "H").version).toBe(12)
  })

  it("draws finder patterns, timing lines and the dark module", () => {
    const { size, modules } = encodeQr("kitgrid", "M")
    expect(size).toBe(21)
    expect(finderAt(modules, 0, 0)).toBe(true)
    expect(finderAt(modules, size - 7, 0)).toBe(true)
    expect(finderAt(modules, 0, size - 7)).toBe(true)
    for (let i = 8; i < size - 8; i++) expect(modules[6]?.[i]).toBe(i % 2 === 0)
    expect(modules[size - 8]?.[8]).toBe(true)
  })

  it("is deterministic and encodes UTF-8", () => {
    const a = encodeQr("漢字 ✓", "Q")
    const b = encodeQr("漢字 ✓", "Q")
    expect(a.modules).toEqual(b.modules)
  })

  it("rejects data beyond version 40", () => {
    expect(() => encodeQr("x".repeat(3000), "H")).toThrow(RangeError)
  })
})

describe("QrCode", () => {
  it("renders a named SVG image", () => {
    render(<QrCode value="https://kitgrid.dev" />)
    const svg = screen.getByRole("img", { name: "QR code: https://kitgrid.dev" })
    expect(svg).toHaveAttribute("data-version", "2")
    expect(svg.getAttribute("viewBox")).toBe("0 0 29 29")
  })

  it("uses H correction and clears a centre area for an icon", () => {
    const { container } = render(<QrCode value="hi" icon={<svg />} label="Pay" />)
    expect(container.querySelector("foreignObject")).not.toBeNull()
    expect(screen.getByRole("img", { name: "Pay" })).toBeInTheDocument()
  })
})
