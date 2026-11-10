export type CodeBlockTokenType =
  | "plain"
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "function"
  | "punctuation"
  | "operator"
  | "tag"
  | "attr"
  | "constant"

export interface CodeBlockToken {
  text: string
  type?: CodeBlockTokenType
}

const KEYWORDS = new Set(
  (
    "abstract as async await break case catch class const continue debugger def default del " +
    "delete do elif else enum export extends final finally fn for from func function go if impl " +
    "implements import in instanceof interface is lambda let match mod module mut namespace new " +
    "not of or and package private protected pub public raise return select self static struct " +
    "super switch this throw trait try type typeof use var void where while with yield"
  ).split(" "),
)
const CONSTANTS = new Set("true false null undefined None True False nil NaN Infinity".split(" "))

/**
 * A small, language-agnostic lexer good enough for JS, TS, JSON, Python, Go, Rust, shell and
 * markup samples. It is a readable default, not a grammar: pass `tokens` for exact output.
 */
const RULES: [CodeBlockTokenType, RegExp][] = [
  ["comment", /^(?:\/\/[^\n]*|#(?![{[])[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/],
  ["string", /^(?:"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)/],
  ["tag", /^<\/?[A-Za-z][\w.-]*/],
  ["number", /^(?:0x[\da-fA-F]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?)\b/],
  ["attr", /^[A-Za-z_:][\w:-]*(?==["{])/],
  ["function", /^[A-Za-z_$][\w$]*(?=\s*\()/],
  ["plain", /^[A-Za-z_$][\w$]*/],
  ["operator", /^(?:=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|[+\-*/%=<>!&|^~?:])/],
  ["punctuation", /^[{}[\]();,.]/],
  ["plain", /^\s+/],
  ["plain", /^./],
]

export const tokenizeCode = (code: string): CodeBlockToken[][] => {
  const lines: CodeBlockToken[][] = [[]]
  let rest = code
  const push = (text: string, type: CodeBlockTokenType) => {
    const parts = text.split("\n")
    parts.forEach((part, index) => {
      if (index > 0) lines.push([])
      if (!part) return
      const line = lines[lines.length - 1] as CodeBlockToken[]
      const last = line[line.length - 1]
      if (last && (last.type ?? "plain") === type) last.text += part
      else line.push({ text: part, type })
    })
  }
  while (rest.length) {
    let matched = false
    for (const [type, pattern] of RULES) {
      const found = pattern.exec(rest)
      if (!found) continue
      const text = found[0]
      let resolved = type
      if (type === "plain" && /^[A-Za-z_$]/.test(text)) {
        if (KEYWORDS.has(text)) resolved = "keyword"
        else if (CONSTANTS.has(text)) resolved = "constant"
      }
      push(text, resolved)
      rest = rest.slice(text.length)
      matched = true
      break
    }
    if (!matched) {
      push(rest[0] as string, "plain")
      rest = rest.slice(1)
    }
  }
  return lines
}

/** Expands `[3, [6, 8]]` into the set {3, 6, 7, 8}. */
export const lineSet = (lines: (number | [number, number])[] | undefined): Set<number> => {
  const set = new Set<number>()
  for (const entry of lines ?? []) {
    if (typeof entry === "number") set.add(entry)
    else for (let n = Math.min(...entry); n <= Math.max(...entry); n++) set.add(n)
  }
  return set
}
