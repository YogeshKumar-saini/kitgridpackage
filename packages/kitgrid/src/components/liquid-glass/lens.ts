import { canUseDOM } from "../../utils/env.js"

/*
 * The refraction engine behind LiquidGlass. Inside a thin bevel along the edge the backdrop is
 * pulled inward the way a curved glass rim bends light (Snell's law), split into red, green and
 * blue for chromatic aberration. The pull is baked into a displacement map drawn on a canvas for
 * the lens's exact size and corner radius, then run through an SVG filter that the element
 * references from `backdrop-filter`. Only Chromium renders SVG filters there.
 */

const SVG_NS = "http://www.w3.org/2000/svg"
// Maps are smooth gradients, so a reduced resolution is indistinguishable and far cheaper.
const MAX_MAP_PIXELS = 90_000
const IOR = 1.5

export interface LensShape {
  width: number
  height: number
  radius: number
  /** Width of the curved rim, in px. */
  bevel: number
}

export interface LensOptics {
  /** Pull at the very rim, in px. */
  refraction: number
  /** 0 to 1: how far apart the red and blue channels land. */
  dispersion: number
}

let support: boolean | undefined

/** True only where an SVG filter inside `backdrop-filter` actually renders (Chromium). */
export const supportsRefraction = (): boolean => {
  if (support !== undefined) return support
  if (!canUseDOM || typeof CSS === "undefined" || typeof CSS.supports !== "function") {
    support = false
    return support
  }
  const nav = navigator as Navigator & {
    userAgentData?: { brands?: { brand: string }[] }
  }
  const brands = nav.userAgentData?.brands
  // Safari parses `url()` in backdrop-filter but paints nothing, so parsing alone proves little.
  const chromium = brands
    ? brands.some(({ brand }) => brand === "Chromium")
    : /Chrome\/|Edg\//.test(nav.userAgent) &&
      !/Firefox\/|FxiOS|CriOS|EdgiOS/.test(nav.userAgent)
  support = chromium && CSS.supports("backdrop-filter", "url(#kg) blur(1px)")
  return support
}

/** Signed distance inside a rounded rectangle and the outward normal there. */
const edge = (x: number, y: number, w: number, h: number, r: number) => {
  const cx = x - w / 2
  const cy = y - h / 2
  const qx = Math.abs(cx) - (w / 2 - r)
  const qy = Math.abs(cy) - (h / 2 - r)
  let distance: number
  let nx = 0
  let ny = 0
  if (qx > 0 && qy > 0) {
    const length = Math.hypot(qx, qy) || 1
    distance = r - length
    nx = qx / length
    ny = qy / length
  } else if (qx > qy) {
    distance = r - qx
    nx = 1
  } else {
    distance = r - qy
    ny = 1
  }
  return { distance, nx: Math.sign(cx) * nx, ny: Math.sign(cy) * ny }
}

// A squircle-ish profile: steep at the rim, flattening toward the face, like a pressed droplet.
const bend = (t: number) => {
  const incidence = Math.asin(Math.min(1, (1 - t) ** 2))
  return Math.tan(incidence - Math.asin(Math.sin(incidence) / IOR))
}
const PEAK = bend(0) || 1

const cache = new Map<string, string>()
let canvas: HTMLCanvasElement | undefined

/** Encodes the inward pull per pixel in R (x) and G (y) around 128, where 128 is flat glass. */
export const drawDisplacementMap = ({
  width,
  height,
  radius,
  bevel,
}: LensShape): string => {
  const scale = Math.min(1, Math.sqrt(MAX_MAP_PIXELS / Math.max(1, width * height)))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const thickness = Math.max(1, Math.min(bevel, width / 2, height / 2))
  const key = `${w}:${h}:${Math.round(radius)}:${Math.round(thickness)}`
  const hit = cache.get(key)
  if (hit) return hit

  canvas ??= document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const context = canvas.getContext("2d")
  if (!context) return ""
  const image = context.createImageData(w, h)
  new Uint32Array(image.data.buffer).fill(0xff808080)
  // Only the rim bends, so the interior rows and columns are skipped entirely.
  const band = Math.ceil((thickness + radius) * scale)
  const visit = (x: number, y: number) => {
    const { distance, nx, ny } = edge(
      (x + 0.5) / scale,
      (y + 0.5) / scale,
      width,
      height,
      radius,
    )
    if (distance < 0 || distance >= thickness) return
    const pull = bend(distance / thickness) / PEAK
    const i = (y * w + x) * 4
    image.data[i] = 128 - nx * pull * 127
    image.data[i + 1] = 128 - ny * pull * 127
  }
  for (let y = 0; y < h; y++) {
    if (y < band || y >= h - band) {
      for (let x = 0; x < w; x++) visit(x, y)
    } else {
      for (let x = 0; x < Math.min(band, w); x++) visit(x, y)
      for (let x = Math.max(w - band, band); x < w; x++) visit(x, y)
    }
  }
  context.putImageData(image, 0, 0)
  const url = canvas.toDataURL()
  if (cache.size >= 32) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, url)
  return url
}

// Red bends least and blue most, as in real glass.
const CHANNELS = [
  ["1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", -1],
  ["0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", 0],
  ["0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0", 1],
] as const

export const filterMarkup = (
  map: string,
  { width, height }: Pick<LensShape, "width" | "height">,
  { refraction, dispersion }: LensOptics,
): string => {
  // The map stores ±0.5 around neutral, so the filter scale is twice the pull at the rim.
  const scale = 2 * refraction
  const image = `<feImage href="${map}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/>`
  const displace = (amount: number, result: string) =>
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${amount.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="${result}"/>`
  // Each colour band costs a full extra pass, so a lens without dispersion takes one.
  if (dispersion <= 0) return image + displace(scale, "out")
  return (
    image +
    CHANNELS.map(
      ([matrix, sign], i) =>
        displace(scale * (1 + sign * 0.22 * dispersion), `d${i}`) +
        `<feColorMatrix in="d${i}" type="matrix" values="${matrix}" result="c${i}"/>`,
    ).join("") +
    `<feComposite in="c0" in2="c1" operator="arithmetic" k2="1" k3="1" result="rg"/>` +
    `<feComposite in="rg" in2="c2" operator="arithmetic" k2="1" k3="1"/>`
  )
}

let host: SVGSVGElement | undefined

const getHost = (): SVGSVGElement => {
  if (host?.isConnected) return host
  host = document.createElementNS(SVG_NS, "svg")
  host.setAttribute("aria-hidden", "true")
  host.setAttribute("width", "0")
  host.setAttribute("height", "0")
  host.setAttribute("data-kg-lens-host", "")
  host.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;pointer-events:none"
  document.body.appendChild(host)
  return host
}

/** A filter element owned by one lens; call `remove` when the lens unmounts. */
export const createLensFilter = (id: string): SVGFilterElement => {
  const filter = document.createElementNS(SVG_NS, "filter")
  filter.id = id
  filter.setAttribute("filterUnits", "userSpaceOnUse")
  filter.setAttribute("primitiveUnits", "userSpaceOnUse")
  filter.setAttribute("color-interpolation-filters", "sRGB")
  filter.setAttribute("x", "0")
  filter.setAttribute("y", "0")
  getHost().appendChild(filter)
  return filter
}
