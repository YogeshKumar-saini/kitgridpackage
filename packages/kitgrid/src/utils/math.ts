export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t

/** Maps `value` from one range onto another without clamping. */
export const remap = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number => outMin + ((value - inMin) / (inMax - inMin || 1)) * (outMax - outMin)

export const roundToStep = (value: number, step: number, origin = 0): number => {
  const decimals = (String(step).split(".")[1] ?? "").length
  return Number((Math.round((value - origin) / step) * step + origin).toFixed(decimals))
}
