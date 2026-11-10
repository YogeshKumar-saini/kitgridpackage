export type MarkdownBlock =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; depth: number; text: string }
  | { kind: "ul" | "ol"; items: string[]; start: number }
  | { kind: "code"; lang: string; text: string }
  | { kind: "quote"; lines: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "hr" }

export type MarkdownInline =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong" | "em" | "del"; children: MarkdownInline[] }
  | { kind: "link"; href: string | undefined; children: MarkdownInline[] }

const FENCE = /^\s*(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/
const BULLET = /^\s*[-*+•]\s+(.*)$/
const NUMBERED = /^\s*(\d{1,9})[.)]\s+(.*)$/
const QUOTE = /^\s*>\s?(.*)$/
const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim())

/** Line-based and forgiving: an unclosed fence or list mid-stream still renders sensibly. */
export const parseBlocks = (source: string): MarkdownBlock[] => {
  const out: MarkdownBlock[] = []
  const lines = source.replace(/\r\n?/g, "\n").split("\n")
  let open = false

  for (let at = 0; at < lines.length; at++) {
    const line = lines[at] ?? ""
    const last = out[out.length - 1]

    const fence = FENCE.exec(line)
    if (fence) {
      const marker = fence[1] ?? "```"
      const body: string[] = []
      at++
      while (at < lines.length && !(lines[at] ?? "").trim().startsWith(marker)) {
        body.push(lines[at] ?? "")
        at++
      }
      out.push({ kind: "code", lang: fence[2] ?? "", text: body.join("\n") })
      open = false
      continue
    }

    if (!line.trim()) {
      open = false
      continue
    }

    if (line.includes("|") && TABLE_RULE.test(lines[at + 1] ?? "")) {
      const rows: string[][] = []
      at += 2
      while (at < lines.length && (lines[at] ?? "").includes("|")) {
        rows.push(cells(lines[at] ?? ""))
        at++
      }
      at--
      out.push({ kind: "table", head: cells(line), rows })
      open = false
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      out.push({ kind: "h", depth: heading[1]?.length ?? 1, text: heading[2] ?? "" })
      open = false
      continue
    }

    if (RULE.test(line)) {
      out.push({ kind: "hr" })
      open = false
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = NUMBERED.exec(line)
    if (bullet || numbered) {
      const kind = bullet ? "ul" : "ol"
      const text = (bullet ? bullet[1] : numbered?.[2]) ?? ""
      if (open && last?.kind === kind) last.items.push(text)
      else out.push({ kind, items: [text], start: Number(numbered?.[1] ?? 1) })
      open = true
      continue
    }

    const quote = QUOTE.exec(line)
    if (quote) {
      if (open && last?.kind === "quote") last.lines.push(quote[1] ?? "")
      else out.push({ kind: "quote", lines: [quote[1] ?? ""] })
      open = true
      continue
    }

    if (open && (last?.kind === "ul" || last?.kind === "ol") && /^\s+\S/.test(line)) {
      const items = last.items
      items[items.length - 1] = `${items[items.length - 1] ?? ""} ${line.trim()}`
      continue
    }

    if (open && (last?.kind === "p" || last?.kind === "quote")) last.lines.push(line)
    else out.push({ kind: "p", lines: [line] })
    open = true
  }
  return out
}

const INLINE = new RegExp(
  [
    "`([^`\\n]+)`",
    "!\\[([^\\]\\n]*)\\]\\([^)\\s]*\\)",
    "\\[([^\\]\\n]+)\\]\\(([^)\\s]+)\\)",
    "\\*\\*(?=\\S)([^\\n]+?)(?<=\\S)\\*\\*",
    "__(?=\\S)([^\\n]+?)(?<=\\S)__",
    "~~(?=\\S)([^\\n]+?)(?<=\\S)~~",
    "\\*(?=[^\\s*])([^\\n]+?)(?<=[^\\s*])\\*",
    "(?<![\\w])_(?=\\S)([^\\n]+?)(?<=\\S)_(?![\\w])",
    "(https?:\\/\\/[^\\s<]+[^\\s<.,:;!?\"')\\]])",
  ].join("|"),
  "g",
)

/** Only web, mail and phone links survive; `javascript:` and friends render as plain text. */
export const safeHref = (url: string): string | undefined => {
  const value = url.trim()
  if (/^[a-z][a-z\d+.-]*:/i.test(value))
    return /^(https?|mailto|tel):/i.test(value) ? value : undefined
  return value
}

export const parseInline = (text: string): MarkdownInline[] => {
  const out: MarkdownInline[] = []
  let cursor = 0
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0
    if (index > cursor) out.push({ kind: "text", text: text.slice(cursor, index) })
    cursor = index + match[0].length
    const [, code, alt, label, href, strong, strongAlt, del, em, emAlt, url] = match
    if (code !== undefined) out.push({ kind: "code", text: code })
    else if (alt !== undefined) out.push({ kind: "text", text: alt })
    else if (label !== undefined)
      out.push({
        kind: "link",
        href: safeHref(href ?? ""),
        children: parseInline(label),
      })
    else if (strong !== undefined || strongAlt !== undefined)
      out.push({ kind: "strong", children: parseInline(strong ?? strongAlt ?? "") })
    else if (del !== undefined) out.push({ kind: "del", children: parseInline(del) })
    else if (em !== undefined || emAlt !== undefined)
      out.push({ kind: "em", children: parseInline(em ?? emAlt ?? "") })
    else if (url !== undefined)
      out.push({ kind: "link", href: url, children: [{ kind: "text", text: url }] })
  }
  if (cursor < text.length) out.push({ kind: "text", text: text.slice(cursor) })
  return out
}
