import { render, screen } from "@testing-library/react"
import { Barcode } from "./barcode.js"
import { CODE128_PATTERNS, code128Widths, encodeCode128 } from "./code128.js"

describe("Code 128", () => {
  it("has 107 distinct patterns of 11 modules (stop: 13)", () => {
    expect(CODE128_PATTERNS).toHaveLength(107)
    expect(new Set(CODE128_PATTERNS).size).toBe(107)
    CODE128_PATTERNS.forEach((pattern, index) => {
      const sum = Array.from(pattern, Number).reduce((a, b) => a + b, 0)
      expect(sum).toBe(index === 106 ? 13 : 11)
    })
  })

  it("encodes set B with the weighted checksum", () => {
    // Start B, P J J 1 2 3 C, checksum, stop.
    expect(encodeCode128("PJJ123C")).toEqual([104, 48, 42, 42, 17, 18, 19, 35, 55, 106])
  })

  it("packs digit runs into set C", () => {
    expect(encodeCode128("123456")).toEqual([105, 12, 34, 56, expect.any(Number), 106])
    const mixed = encodeCode128("SKU-1234567")
    expect(mixed[0]).toBe(104)
    expect(mixed).toContain(99)
  })

  it("rejects characters outside printable ASCII", () => {
    expect(() => encodeCode128("café")).toThrow(RangeError)
  })

  it("alternates bars and spaces from the patterns", () => {
    const widths = code128Widths([104])
    expect(widths).toEqual([2, 1, 1, 2, 1, 4])
  })
})

describe("Barcode", () => {
  it("renders a named SVG with a visible value", () => {
    render(<Barcode value="ORD-48213" />)
    expect(screen.getByRole("img", { name: "Barcode: ORD-48213" }).tagName).toBe("svg")
    expect(screen.getByText("ORD-48213")).toHaveAttribute("aria-hidden", "true")
  })

  it("falls back to text for invalid input", () => {
    const { container } = render(<Barcode value="naïve" />)
    expect(container.firstElementChild).toHaveAttribute("data-invalid", "true")
    expect(container.querySelector("svg")).toBeNull()
  })
})
