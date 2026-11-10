/** Bar/space widths for Code 128 symbols 0-105, then the stop pattern (106). */
const PATTERNS = (
  "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 " +
  "122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 " +
  "321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 " +
  "211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 " +
  "213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 " +
  "121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 " +
  "241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 " +
  "412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 " +
  "211214 211232 2331112"
).split(" ")

export const CODE128_PATTERNS: readonly string[] = PATTERNS

const START_B = 104
const START_C = 105
const CODE_B = 100
const CODE_C = 99
const STOP = 106

const isDigit = (c: string) => c >= "0" && c <= "9"

const digitRun = (text: string, from: number) => {
  let end = from
  while (end < text.length && isDigit(text[end] as string)) end++
  return end - from
}

/**
 * Encodes text as Code 128 symbol values, using set B for printable ASCII and switching to set C
 * for runs of digits where that is shorter. Includes start, checksum and stop.
 */
export const encodeCode128 = (text: string): number[] => {
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code < 32 || code > 126) throw new RangeError(`Barcode: "${char}" is not encodable`)
  }
  const values: number[] = []
  let mode: "B" | "C"
  let i = 0
  const leading = digitRun(text, 0)
  if (leading >= 4 && (leading === text.length || leading >= 6)) {
    mode = "C"
    values.push(START_C)
  } else {
    mode = "B"
    values.push(START_B)
  }
  while (i < text.length) {
    const run = digitRun(text, i)
    if (mode === "B" && (run >= 6 || (run >= 4 && i + run === text.length))) {
      // Odd runs leave one digit for set B first, so set C takes an even count.
      if (run % 2 === 1) {
        values.push((text.charCodeAt(i) as number) - 32)
        i++
      }
      values.push(CODE_C)
      mode = "C"
      continue
    }
    if (mode === "C") {
      if (run >= 2) {
        values.push(Number(text.slice(i, i + 2)))
        i += 2
        continue
      }
      values.push(CODE_B)
      mode = "B"
      continue
    }
    values.push((text.charCodeAt(i) as number) - 32)
    i++
  }
  const checksum =
    values.reduce((sum, value, index) => sum + value * (index === 0 ? 1 : index), 0) % 103
  values.push(checksum, STOP)
  return values
}

/** Expands symbol values into alternating bar/space module widths, starting with a bar. */
export const code128Widths = (values: number[]): number[] =>
  values.flatMap((value) => Array.from(PATTERNS[value] ?? "", Number))
