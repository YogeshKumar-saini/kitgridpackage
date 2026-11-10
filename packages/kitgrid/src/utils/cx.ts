export type ClassValue = string | number | false | null | undefined | ClassValue[]

export const cx = (...values: ClassValue[]): string => {
  let out = ""
  for (const value of values) {
    if (!value) continue
    const part = Array.isArray(value) ? cx(...value) : String(value)
    if (part) out = out ? `${out} ${part}` : part
  }
  return out
}
