export interface Typeahead {
  /** Appends a character and returns the accumulated search string. */
  push: (char: string) => string
  /** True while a search is in progress, so Space can count as a character. */
  active: () => boolean
  reset: () => void
}

/** Accumulates printable keys typed within `timeout` ms of each other into one search. */
export const createTypeahead = (timeout = 500): Typeahead => {
  let buffer = ""
  let timer: ReturnType<typeof setTimeout> | undefined
  const reset = () => {
    clearTimeout(timer)
    buffer = ""
  }
  return {
    push: (char) => {
      clearTimeout(timer)
      buffer += char.toLowerCase()
      timer = setTimeout(reset, timeout)
      return buffer
    },
    active: () => buffer.length > 0,
    reset,
  }
}

export const isTypeaheadKey = (event: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}): boolean =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

/**
 * Index of the next enabled label matching `search`, starting after `current` and wrapping.
 * Repeating one letter ("ccc") cycles through items starting with it, as native selects do.
 */
export const findTypeaheadMatch = (
  labels: readonly string[],
  search: string,
  current: number,
  isDisabled: (index: number) => boolean = () => false,
): number => {
  const count = labels.length
  if (count === 0 || !search) return -1
  const first = search[0] as string
  const repeated = [...search].every((char) => char === first)
  const query = repeated ? first : search
  // A longer query may still match the current item, so it is checked first.
  const start = repeated ? current + 1 : Math.max(current, 0)
  for (let step = 0; step < count; step++) {
    const index = (((start + step) % count) + count) % count
    if (isDisabled(index)) continue
    if ((labels[index] ?? "").trim().toLowerCase().startsWith(query)) return index
  }
  return -1
}
