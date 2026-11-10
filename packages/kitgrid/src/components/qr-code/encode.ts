export type QrCodeErrorLevel = "L" | "M" | "Q" | "H"

/** Error-correction codewords per block, indexed by version (index 0 unused). ISO/IEC 18004 Table 9. */
const ECC_PER_BLOCK: Record<QrCodeErrorLevel, number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
}

/** Number of error-correction blocks, indexed by version. */
const NUM_BLOCKS: Record<QrCodeErrorLevel, number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
}

const FORMAT_BITS: Record<QrCodeErrorLevel, number> = { L: 1, M: 0, Q: 3, H: 2 }

const rawModules = (version: number) => {
  let result = (16 * version + 128) * version + 64
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2
    result -= (25 * align - 10) * align - 55
    if (version >= 7) result -= 36
  }
  return result
}

const dataCodewords = (version: number, level: QrCodeErrorLevel) =>
  Math.floor(rawModules(version) / 8) -
  (ECC_PER_BLOCK[level][version] as number) * (NUM_BLOCKS[level][version] as number)

const gfMultiply = (x: number, y: number) => {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z & 0xff
}

const rsDivisor = (degree: number) => {
  const result = new Array<number>(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j] as number, root)
      if (j + 1 < degree) result[j] = (result[j] as number) ^ (result[j + 1] as number)
    }
    root = gfMultiply(root, 0x02)
  }
  return result
}

const rsRemainder = (data: number[], divisor: number[]) => {
  const result = new Array<number>(divisor.length).fill(0)
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number)
    result.push(0)
    divisor.forEach((coef, i) => {
      result[i] = (result[i] as number) ^ gfMultiply(coef, factor)
    })
  }
  return result
}

const alignmentPositions = (version: number) => {
  if (version === 1) return []
  const count = Math.floor(version / 7) + 2
  const size = version * 4 + 17
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2
  const result = [6]
  for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos)
  return result
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
]

export interface QrCodeMatrix {
  size: number
  version: number
  mask: number
  /** Row-major: `modules[y][x]` is true for a dark module. */
  modules: boolean[][]
}

/**
 * Encodes text as a QR Code symbol in byte mode (UTF-8), picking the smallest version (1-40)
 * that fits and the mask with the lowest penalty score.
 */
export const encodeQr = (
  text: string,
  level: QrCodeErrorLevel = "M",
  /** Forces a mask pattern (0-7) instead of choosing by penalty. */
  forceMask?: number,
): QrCodeMatrix => {
  const bytes = Array.from(new TextEncoder().encode(text))
  let version = 1
  for (; version <= 40; version++) {
    const countBits = version <= 9 ? 8 : 16
    if (4 + countBits + bytes.length * 8 <= dataCodewords(version, level) * 8) break
  }
  if (version > 40) throw new RangeError("QrCode: data too long")

  // Bit stream: mode, length, payload, terminator, byte padding, pad codewords.
  const bits: number[] = []
  const put = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1)
  }
  put(0b0100, 4)
  put(bytes.length, version <= 9 ? 8 : 16)
  for (const byte of bytes) put(byte, 8)
  const capacity = dataCodewords(version, level) * 8
  put(0, Math.min(4, capacity - bits.length))
  put(0, (8 - (bits.length % 8)) % 8)
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) put(pad, 8)
  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] as number)
    data.push(byte)
  }

  // Split into blocks, append Reed-Solomon codewords, interleave.
  const blockCount = NUM_BLOCKS[level][version] as number
  const eccLength = ECC_PER_BLOCK[level][version] as number
  const raw = Math.floor(rawModules(version) / 8)
  const shortBlocks = blockCount - (raw % blockCount)
  const shortLength = Math.floor(raw / blockCount)
  const divisor = rsDivisor(eccLength)
  const blocks: number[][] = []
  for (let i = 0, k = 0; i < blockCount; i++) {
    const chunk = data.slice(k, k + shortLength - eccLength + (i < shortBlocks ? 0 : 1))
    k += chunk.length
    const ecc = rsRemainder(chunk, divisor)
    if (i < shortBlocks) chunk.push(0)
    blocks.push(chunk.concat(ecc))
  }
  const codewords: number[] = []
  for (let i = 0; i < (blocks[0] as number[]).length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLength - eccLength || j >= shortBlocks) codewords.push(block[i] as number)
    })
  }

  const size = version * 4 + 17
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const fn = (x: number, y: number, dark: boolean) => {
    ;(modules[y] as boolean[])[x] = dark
    ;(reserved[y] as boolean[])[x] = true
  }

  for (let i = 0; i < size; i++) {
    fn(6, i, i % 2 === 0)
    fn(i, 6, i % 2 === 0)
  }
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ] as const) {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || y < 0 || x >= size || y >= size) continue
        const d = Math.max(Math.abs(dx), Math.abs(dy))
        fn(x, y, d !== 2 && d !== 4)
      }
  }
  const align = alignmentPositions(version)
  align.forEach((ay, i) =>
    align.forEach((ax, j) => {
      const corner =
        (i === 0 && j === 0) ||
        (i === 0 && j === align.length - 1) ||
        (i === align.length - 1 && j === 0)
      if (corner) return
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          fn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }),
  )

  const drawFormat = (mask: number) => {
    const value = (FORMAT_BITS[level] << 3) | mask
    let rem = value
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const format = ((value << 10) | rem) ^ 0x5412
    const bit = (i: number) => ((format >>> i) & 1) === 1
    for (let i = 0; i <= 5; i++) fn(8, i, bit(i))
    fn(8, 7, bit(6))
    fn(8, 8, bit(7))
    fn(7, 8, bit(8))
    for (let i = 9; i < 15; i++) fn(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) fn(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) fn(8, size - 15 + i, bit(i))
    fn(8, size - 8, true)
  }
  drawFormat(0)

  if (version >= 7) {
    let rem = version
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const info = (version << 12) | rem
    for (let i = 0; i < 18; i++) {
      const dark = ((info >>> i) & 1) === 1
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      fn(a, b, dark)
      fn(b, a, dark)
    }
  }

  // Zigzag placement of codeword bits, two columns at a time, skipping the vertical timing line.
  let index = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!(reserved[y] as boolean[])[x] && index < codewords.length * 8) {
          ;(modules[y] as boolean[])[x] =
            (((codewords[index >>> 3] as number) >>> (7 - (index & 7))) & 1) === 1
          index++
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    const test = MASKS[mask] as (x: number, y: number) => boolean
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (!(reserved[y] as boolean[])[x] && test(x, y))
          (modules[y] as boolean[])[x] = !(modules[y] as boolean[])[x]
  }

  const penalty = () => {
    let score = 0
    const at = (x: number, y: number) => (modules[y] as boolean[])[x] as boolean
    const lines = (horizontal: boolean) => {
      for (let a = 0; a < size; a++) {
        let run = 1
        const seq: boolean[] = []
        for (let b = 0; b < size; b++) {
          const value = horizontal ? at(b, a) : at(a, b)
          seq.push(value)
          if (b > 0) {
            const prev = horizontal ? at(b - 1, a) : at(a, b - 1)
            if (value === prev) run++
            else {
              if (run >= 5) score += 3 + run - 5
              run = 1
            }
          }
        }
        if (run >= 5) score += 3 + run - 5
        // Finder-like 1:1:3:1:1 with four light modules on either side (light padding off-symbol).
        const padded = [false, false, false, false, ...seq, false, false, false, false]
        for (let i = 0; i + 11 <= padded.length; i++) {
          const w = padded.slice(i, i + 11).map((v) => (v ? 1 : 0)).join("")
          if (w === "10111010000" || w === "00001011101") score += 40
        }
      }
    }
    lines(true)
    lines(false)
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const c = at(x, y)
        if (c === at(x + 1, y) && c === at(x, y + 1) && c === at(x + 1, y + 1)) score += 3
      }
    let dark = 0
    for (const row of modules) for (const cell of row) if (cell) dark++
    const total = size * size
    score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10
    return score
  }

  let best = 0
  let bestScore = Number.POSITIVE_INFINITY
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask)
    drawFormat(mask)
    const score = penalty()
    if (score < bestScore) {
      bestScore = score
      best = mask
    }
    applyMask(mask)
  }
  if (forceMask !== undefined) best = forceMask
  applyMask(best)
  drawFormat(best)

  return { size, version, mask: best, modules }
}
