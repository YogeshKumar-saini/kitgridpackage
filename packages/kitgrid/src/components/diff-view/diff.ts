export type DiffViewLineType = "equal" | "add" | "remove"

export interface DiffViewLine {
  type: DiffViewLineType
  text: string
  /** 1-based line in the old text; absent for additions. */
  oldNumber?: number
  /** 1-based line in the new text; absent for removals. */
  newNumber?: number
}

const splitLines = (text: string) => (text === "" ? [] : text.replace(/\n$/, "").split("\n"))

/**
 * Myers' O(ND) shortest edit script over lines. Keeps a copy of the frontier per step so the
 * path can be walked back; memory is O(D²), fine for review-sized inputs.
 */
export const diffLines = (before: string, after: string): DiffViewLine[] => {
  const a = splitLines(before)
  const b = splitLines(after)
  const n = a.length
  const m = b.length
  const max = n + m
  const offset = max + 1
  let v = new Int32Array(2 * max + 3)
  const trace: Int32Array[] = []

  outer: for (let d = 0; d <= max; d++) {
    trace.push(v.slice())
    const next = v.slice()
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && (v[offset + k - 1] as number) < (v[offset + k + 1] as number))
      let x = down ? (v[offset + k + 1] as number) : (v[offset + k - 1] as number) + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      next[offset + k] = x
      if (x >= n && y >= m) {
        trace.push(next)
        break outer
      }
    }
    v = next
  }

  const out: DiffViewLine[] = []
  let x = n
  let y = m
  for (let d = trace.length - 2; d >= 0; d--) {
    const frontier = trace[d] as Int32Array
    const k = x - y
    const down =
      k === -d || (k !== d && (frontier[offset + k - 1] as number) < (frontier[offset + k + 1] as number))
    const prevK = down ? k + 1 : k - 1
    const prevX = d === 0 ? 0 : (frontier[offset + prevK] as number)
    const prevY = d === 0 ? 0 : prevX - prevK
    while (x > prevX && y > prevY) {
      out.push({ type: "equal", text: a[x - 1] as string, oldNumber: x, newNumber: y })
      x--
      y--
    }
    if (d === 0) break
    if (down) {
      out.push({ type: "add", text: b[y - 1] as string, newNumber: y })
      y--
    } else {
      out.push({ type: "remove", text: a[x - 1] as string, oldNumber: x })
      x--
    }
  }
  return out.reverse()
}

/** Splits a changed pair into common prefix, changed middle and common suffix. */
export const inlineChange = (from: string, to: string) => {
  let start = 0
  const limit = Math.min(from.length, to.length)
  while (start < limit && from[start] === to[start]) start++
  let end = 0
  while (
    end < limit - start &&
    from[from.length - 1 - end] === to[to.length - 1 - end]
  )
    end++
  return {
    from: [from.slice(0, start), from.slice(start, from.length - end), from.slice(from.length - end)],
    to: [to.slice(0, start), to.slice(start, to.length - end), to.slice(to.length - end)],
  } as { from: [string, string, string]; to: [string, string, string] }
}
