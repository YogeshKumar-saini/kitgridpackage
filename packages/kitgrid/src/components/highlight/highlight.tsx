import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type HighlightVariant = "soft" | "underline" | "solid"

export interface HighlightProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The text to search in. */
  children: string
  /** One term or several. Empty terms are ignored. */
  query: string | string[]
  caseSensitive?: boolean
  /** Match whole words only. */
  wholeWord?: boolean
  variant?: HighlightVariant
}

export interface HighlightRange {
  text: string
  match: boolean
}

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const highlightRanges = (
  text: string,
  query: string | string[],
  { caseSensitive = false, wholeWord = false } = {},
): HighlightRange[] => {
  const terms = (Array.isArray(query) ? query : [query])
    .map((term) => term.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escape)
  if (terms.length === 0 || !text) return [{ text, match: false }]
  const source = wholeWord ? `\\b(?:${terms.join("|")})\\b` : `(?:${terms.join("|")})`
  const pattern = new RegExp(source, caseSensitive ? "g" : "gi")
  const parts: HighlightRange[] = []
  let last = 0
  for (const found of text.matchAll(pattern)) {
    const start = found.index ?? 0
    if (found[0].length === 0) continue
    if (start > last) parts.push({ text: text.slice(last, start), match: false })
    parts.push({ text: found[0], match: true })
    last = start + found[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false })
  return parts
}

const markVariants = variants({
  base: "kg-highlight__mark [box-decoration-break:clone] forced-colors:bg-[Mark] forced-colors:text-[MarkText]",
  variants: {
    variant: {
      soft: "-mx-[0.04em] rounded-kg-xs bg-kg-paper-sage px-[0.12em] text-kg-fg",
      underline: "bg-transparent text-inherit underline decoration-kg-ink decoration-[0.16em] underline-offset-[0.14em] [text-decoration-skip-ink:none]",
      solid: "-mx-[0.04em] rounded-kg-xs bg-kg-accent px-[0.12em] font-semibold text-kg-accent-fg",
    },
  },
  defaults: { variant: "soft" },
})

/** Marks every occurrence of a search term with `<mark>`, longest terms first. */
export const Highlight = forwardRef<HTMLSpanElement, HighlightProps>(
  (
    { children, query, caseSensitive, wholeWord, variant = "soft", className, ...props },
    ref,
  ) => {
    const parts = highlightRanges(children, query, {
      caseSensitive: caseSensitive ?? false,
      wholeWord: wholeWord ?? false,
    })
    const nodes: ReactNode[] = parts.map((part, index) =>
      part.match ? (
        <mark key={index} className={markVariants({ variant })}>
          {part.text}
        </mark>
      ) : (
        part.text
      ),
    )
    return (
      <span
        ref={ref}
        className={cx("kg-highlight", className)}
        data-variant={variant}
        {...props}
      >
        {nodes}
      </span>
    )
  },
)
Highlight.displayName = "Highlight"
