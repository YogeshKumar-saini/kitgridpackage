export type ChartTone = "accent" | "success" | "warning" | "danger" | "info" | "neutral"

export interface ChartTokens {
  fg: string
  fgMuted: string
  fgFaint: string
  surface: string
  border: string
  grid: string
  accent: string
  success: string
  warning: string
  danger: string
  info: string
  /** Series colors in order: the accent first, then graphite and accent tints. */
  palette: readonly string[]
  font: string
  fontMono: string
  /** Resolves any CSS color, `var()` included, in the chart's own scope. */
  resolve: (color: string) => string
}

// Each value is a `var()` with an Orbit default, so charts render sensibly even without the
// stylesheet. `--kg-chart-*` lets a theme or scope repaint charts without touching the accent.
const RECIPE = {
  fg: "var(--kg-fg, #1b1d22)",
  fgMuted: "var(--kg-fg-muted, #5b5f69)",
  fgFaint: "var(--kg-fg-faint, #81858f)",
  surface: "var(--kg-chart-surface, var(--kg-surface, #fcfcfd))",
  border: "var(--kg-border, #dfe1e5)",
  grid: "var(--kg-chart-grid, color-mix(in oklab, var(--kg-border, #dfe1e5) 75%, transparent))",
  accent: "var(--kg-accent, #f28a2e)",
  success: "var(--kg-success, #2f8a50)",
  warning: "var(--kg-warning, #d79a1f)",
  danger: "var(--kg-danger, #c8392f)",
  info: "var(--kg-info, #2f73b5)",
} as const

const PALETTE = [
  "var(--kg-accent, #f28a2e)",
  "color-mix(in oklab, var(--kg-fg, #1b1d22) 58%, var(--kg-bg, #f8f9fa))",
  "color-mix(in oklab, var(--kg-accent, #f28a2e) 50%, var(--_kg-chart-tint, var(--kg-bg, #f8f9fa)))",
  "color-mix(in oklab, var(--kg-fg, #1b1d22) var(--_kg-chart-quiet, 28%), var(--kg-bg, #f8f9fa))",
  "color-mix(in oklab, var(--kg-accent, #f28a2e), var(--kg-fg, #1b1d22) 45%)",
  "color-mix(in oklab, var(--kg-fg, #1b1d22) 82%, var(--kg-bg, #f8f9fa))",
].map((fallback, index) => `var(--kg-chart-${index + 1}, ${fallback})`)

type Key = keyof typeof RECIPE

/** Orbit light theme, used on the server, in tests and wherever styles cannot be read. */
export const fallbackChartTokens: ChartTokens = {
  fg: "#1b1d22",
  fgMuted: "#5b5f69",
  fgFaint: "#81858f",
  surface: "#fcfcfd",
  border: "#dfe1e5",
  grid: "rgba(223, 225, 229, 0.75)",
  accent: "#f28a2e",
  success: "#2f8a50",
  warning: "#d79a1f",
  danger: "#c8392f",
  info: "#2f73b5",
  palette: ["#f28a2e", "#7d808a", "#f6c08f", "#c3c5cb", "#91562a", "#3d4048"],
  font: "ui-sans-serif, system-ui, sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  resolve: (color) => color,
}

const SENTINEL = "#010203"
let context: CanvasRenderingContext2D | null | undefined

// Computed styles keep the authored color space (oklch, color-mix) and ECharts' own parser
// turns those black, so one pixel is rasterised to get plain rgb().
const toRgb = (value: string): string => {
  if (!value || /^(#|rgba?\()/i.test(value)) return value
  if (context === undefined) {
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 1
      canvas.height = 1
      context = canvas.getContext("2d", { willReadFrequently: true })
    } catch {
      context = null
    }
  }
  if (!context) return value
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = SENTINEL
  context.fillStyle = value
  if (context.fillStyle === SENTINEL) return value
  context.fillRect(0, 0, 1, 1)
  const [red = 0, green = 0, blue = 0, alpha = 255] = context.getImageData(
    0,
    0,
    1,
    1,
  ).data
  return alpha === 255
    ? `rgb(${red}, ${green}, ${blue})`
    : `rgba(${red}, ${green}, ${blue}, ${(alpha / 255).toFixed(3)})`
}

// One probe per color, appended together, so the whole theme costs a single style recalc.
const resolveAll = (scope: HTMLElement, colors: readonly string[]): string[] => {
  const probes = colors.map((color) => {
    const probe = document.createElement("span")
    probe.style.display = "none"
    probe.style.color = color
    return probe
  })
  scope.append(...probes)
  // An engine that cannot resolve custom properties hands back the var() itself.
  const resolved = probes.map((probe) => {
    const computed = getComputedStyle(probe).color
    return computed.includes("var(") ? "" : toRgb(computed)
  })
  for (const probe of probes) probe.remove()
  return resolved
}

/** The live theme at `scope`, resolved to concrete colors: canvas cannot paint `var()`. */
export const readChartTokens = (scope: HTMLElement): ChartTokens => {
  const keys = Object.keys(RECIPE) as Key[]
  const values = resolveAll(scope, [...keys.map((key) => RECIPE[key]), ...PALETTE])
  const pick = (index: number, fallback: string) => values[index] || fallback

  const tokens = { ...fallbackChartTokens }
  keys.forEach((key, index) => {
    tokens[key] = pick(index, fallbackChartTokens[key])
  })
  tokens.palette = PALETTE.map((_, index) =>
    pick(keys.length + index, fallbackChartTokens.palette[index] ?? tokens.accent),
  )

  const styles = getComputedStyle(scope)
  tokens.font = styles.fontFamily || fallbackChartTokens.font
  tokens.fontMono =
    styles.getPropertyValue("--kg-font-mono").trim() || fallbackChartTokens.fontMono
  tokens.resolve = (color) => resolveAll(scope, [color])[0] || color
  return tokens
}

/** A comparable fingerprint, so a mutation that changes no color does not replay the chart. */
export const tokenSignature = (tokens: ChartTokens): string =>
  [
    ...(Object.keys(RECIPE) as Key[]).map((key) => tokens[key]),
    ...tokens.palette,
    tokens.font,
    tokens.fontMono,
  ].join("|")

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const FUNCTIONAL = /^rgba?\(([^)]+)\)$/i

/** Re-alphas a hex or rgb() color; anything else is returned untouched. */
export const withAlpha = (color: string, alpha: number): string => {
  const value = color.trim()
  const hex = HEX.exec(value)?.[1]
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex
    const channel = (at: number) => Number.parseInt(full.slice(at * 2, at * 2 + 2), 16)
    return `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${alpha})`
  }
  const channels = FUNCTIONAL.exec(value)?.[1]
    ?.split(/[\s,/]+/)
    .filter(Boolean)
  if (channels && channels.length >= 3)
    return `rgba(${channels.slice(0, 3).join(", ")}, ${alpha})`
  return value
}

const TONES: Record<ChartTone, (tokens: ChartTokens) => string> = {
  accent: (t) => t.accent,
  success: (t) => t.success,
  warning: (t) => t.warning,
  danger: (t) => t.danger,
  info: (t) => t.info,
  neutral: (t) => t.fgFaint,
}

const isTone = (value: string): value is ChartTone => value in TONES

/** A tone name, any CSS color, or the palette entry for `index` when neither is given. */
export const colorOf = (
  tokens: ChartTokens,
  color: ChartTone | string | undefined,
  index = 0,
): string => {
  if (color) return isTone(color) ? TONES[color](tokens) : tokens.resolve(color)
  return tokens.palette[index % tokens.palette.length] ?? tokens.accent
}
