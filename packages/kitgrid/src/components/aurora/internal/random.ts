/**
 * mulberry32: a tiny PRNG that yields the same sequence on the server and in the browser for a
 * given seed, so randomised backgrounds hydrate without markup mismatches.
 */
export const createRandom = (seed: number): (() => number) => {
  let state = Math.imul(Math.trunc(seed) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fixed precision keeps serialised styles short and identical across runtimes. */
export const round = (value: number, digits = 3): number => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
