/** Elements a text effect can render as through its `as` prop. */
export type TextEffectElement =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "div"
  | "strong"
  | "em"
  | "blockquote"
  | "figcaption"
  | "label"

export interface TextToken {
  type: "word" | "space"
  value: string
  /** Grapheme clusters, so emoji, flags and combining marks are never torn apart. */
  chars: string[]
}

let segmenter: Intl.Segmenter | null | undefined

export const graphemes = (value: string): string[] => {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null
  }
  return segmenter
    ? Array.from(segmenter.segment(value), (part) => part.segment)
    : Array.from(value)
}

// Whitespace runs stay verbatim text nodes so the browser collapses and wraps them as usual.
// No-break spaces are not separators: they belong to the word they glue together.
const SEPARATOR = /([^\S\u00a0]+)/

export const tokenize = (text: string): TextToken[] =>
  text
    .split(SEPARATOR)
    .filter((value) => value !== "")
    .map((value): TextToken =>
      SEPARATOR.test(value) && value.trim() === ""
        ? { type: "space", value, chars: [] }
        : { type: "word", value, chars: graphemes(value) },
    )
