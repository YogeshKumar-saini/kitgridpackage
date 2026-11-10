/**
 * A step on the spacing scale (multiples of `--kg-space`, so density scales it) or any CSS
 * length such as `"2rem"` or `"5vw"`.
 */
export type BoxSpace = number | string

/** Resolves a scale step or a length to a CSS value. */
export const space = (value: BoxSpace | undefined): string | undefined => {
  if (value === undefined) return undefined
  if (typeof value === "number") return value === 0 ? "0" : `calc(var(--kg-space) * ${value})`
  return value
}

/** Builds a style object of private custom properties, skipping the unset ones. */
export const vars = (
  entries: Record<string, string | number | undefined>,
): Record<string, string | number> => {
  const out: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(entries)) if (value !== undefined) out[key] = value
  return out
}

export type BoxAlign = "start" | "center" | "end" | "stretch" | "baseline"
export type BoxJustify = "start" | "center" | "end" | "between" | "around" | "evenly"

const JUSTIFY: Record<BoxJustify, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
}

const ALIGN: Record<BoxAlign, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
}

export const justifyValue = (value: BoxJustify | undefined) =>
  value ? JUSTIFY[value] : undefined

export const alignValue = (value: BoxAlign | undefined) => (value ? ALIGN[value] : undefined)
