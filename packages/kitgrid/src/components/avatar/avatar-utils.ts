/** First letter of the first and last word, so "Ada King Lovelace" becomes "AL". */
export const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]
  if (!first) return ""
  const last = words.length > 1 ? words[words.length - 1] : undefined
  const initial = (word: string | undefined) =>
    word ? (Array.from(word)[0] ?? "") : ""
  return (initial(first) + initial(last)).toLocaleUpperCase()
}

/** FNV-1a, so the same name gets the same hue on the server, the client and every visit. */
export const hueFromString = (value: string): number => {
  let hash = 0x811c9dc5
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 360
}
