export interface ColorPickerHsva {
  /** 0 to 360 */
  h: number
  /** 0 to 1 */
  s: number
  /** 0 to 1 */
  v: number
  /** 0 to 1 */
  a: number
}

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

const HEX = /^#?([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i

export const parseHex = (input: string): Rgba | null => {
  const match = HEX.exec(input.trim())
  if (!match?.[1]) return null
  let hex = match[1]
  if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("")
  const n = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16)
  return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? n(6) / 255 : 1 }
}

const to2 = (n: number) =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, "0")

export const toHex = ({ r, g, b, a }: Rgba, withAlpha: boolean): string =>
  `#${to2(r)}${to2(g)}${to2(b)}${withAlpha && a < 1 ? to2(a * 255) : ""}`

export const rgbToHsv = ({ r, g, b, a }: Rgba): ColorPickerHsva => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max, a }
}

export const hsvToRgb = ({ h, s, v, a }: ColorPickerHsva): Rgba => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255, a }
}

export const hsvToHex = (hsva: ColorPickerHsva, withAlpha: boolean): string =>
  toHex(hsvToRgb(hsva), withAlpha)

export const hexToHsv = (hex: string): ColorPickerHsva | null => {
  const rgba = parseHex(hex)
  return rgba ? rgbToHsv(rgba) : null
}

/** Relative luminance, for choosing a legible mark over a swatch. */
export const luminance = (hex: string): number => {
  const rgba = parseHex(hex)
  if (!rgba) return 0
  const lin = (c: number) => {
    const n = c / 255
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(rgba.r) + 0.7152 * lin(rgba.g) + 0.0722 * lin(rgba.b)
}
