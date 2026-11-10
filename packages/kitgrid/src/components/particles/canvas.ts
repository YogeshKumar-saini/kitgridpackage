export interface CanvasRgb {
  r: number
  g: number
  b: number
  /** 0–1. Applied through globalAlpha so faint colors keep their hue. */
  a: number
}

let probe: CanvasRenderingContext2D | null | undefined

/**
 * Resolves any CSS color, custom properties and color-mix() included, against `host`. The
 * computed value goes through a 1×1 canvas, which normalises every color space the browser
 * understands into sRGB bytes.
 */
export const resolveCanvasColor = (
  host: HTMLElement,
  value: string,
): CanvasRgb | null => {
  const previous = host.style.color
  host.style.color = value
  const computed = getComputedStyle(host).color
  host.style.color = previous
  if (!computed) return null

  if (probe === undefined) {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    probe = canvas.getContext("2d", { willReadFrequently: true })
  }
  if (!probe) return null
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = "#000"
  probe.fillStyle = computed
  probe.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0, a = 0] = probe.getImageData(0, 0, 1, 1).data
  return { r, g, b, a: a / 255 }
}

// Pointer-tracking hooks rewrite these on every frame; they never change a color.
const POINTER_VARS = /--kg-pointer-[a-z]+:[^;]*;?/g
const stripPointer = (style: string | null) =>
  (style ?? "").replace(POINTER_VARS, "").trim()

/**
 * Calls `onChange` whenever anything that can retheme `node` changes: `class`, `data-theme` or
 * inline custom properties on any ancestor, or the OS color scheme. Returns a cleanup.
 */
export const observeTheme = (node: HTMLElement, onChange: () => void): (() => void) => {
  const observer = new MutationObserver((records) => {
    const relevant = records.some(
      (record) =>
        record.attributeName !== "style" ||
        stripPointer(record.oldValue) !==
          stripPointer((record.target as HTMLElement).getAttribute("style")),
    )
    if (relevant) onChange()
  })
  for (let el: HTMLElement | null = node; el; el = el.parentElement) {
    observer.observe(el, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["class", "style", "data-theme"],
    })
  }
  const scheme = window.matchMedia?.("(prefers-color-scheme: dark)")
  scheme?.addEventListener?.("change", onChange)
  return () => {
    observer.disconnect()
    scheme?.removeEventListener?.("change", onChange)
  }
}
