"use client"

import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode, useMemo } from "react"
import { useCopy } from "../../utils/copy-text.js"
import { cx } from "../../utils/cx.js"
import { type CodeBlockToken, lineSet, tokenizeCode } from "./tokenize.js"

export interface CodeBlockLabels {
  copy?: string
  copied?: string
}

export interface CodeBlockProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  code: string
  /** Shown in the header, e.g. `tsx`. Also set as `data-language`. */
  language?: string
  /** File name or title in the header. */
  title?: ReactNode
  /** Pre-tokenized lines from any highlighter. Overrides the built-in lexer. */
  tokens?: CodeBlockToken[][]
  /** `auto` runs the small built-in lexer; `none` renders plain text. */
  highlight?: "auto" | "none"
  lineNumbers?: boolean
  /** Line numbers start here. */
  startLine?: number
  /** Lines to emphasise, 1-based: `[2, [5, 7]]`. */
  highlightLines?: (number | [number, number])[]
  /** Wrap long lines instead of scrolling horizontally. */
  wrap?: boolean
  /** Scrolls the body past this height. Any CSS length. */
  maxHeight?: string
  /** Hides the copy button. */
  hideCopy?: boolean
  /** Hides the header bar entirely; the copy button then floats. */
  bare?: boolean
  labels?: CodeBlockLabels
  /** Extra content on the right of the header, before the copy button. */
  actions?: ReactNode
}

/*
 * Paper Layers: code sits on a fixed "night paper" sheet in both themes. The inner parts carry
 * data-theme="dark" so tokens resolve dark there while the frame keeps the page's ink edge.
 * --kg-code-* override syntax colours; --_radius, --_edge and --_shadow let a host drop the frame.
 */
const syntax = [
  "[&_[data-token=keyword]]:font-semibold [&_[data-token=keyword]]:text-[var(--kg-code-keyword,var(--kg-accent-strong))]",
  "[&_[data-token=string]]:text-[var(--kg-code-string,color-mix(in_oklab,var(--kg-success)_82%,var(--kg-fg)))]",
  "[&_[data-token=number]]:text-[var(--kg-code-number,color-mix(in_oklab,var(--kg-info)_85%,var(--kg-fg)))]",
  "[&_[data-token=function]]:text-[var(--kg-code-function,color-mix(in_oklab,var(--kg-info)_55%,var(--kg-fg)))]",
  "[&_[data-token=comment]]:italic [&_[data-token=comment]]:text-[var(--kg-code-comment,var(--kg-fg-faint))]",
  "[&_[data-token=tag]]:text-[var(--kg-code-tag,color-mix(in_oklab,var(--kg-danger)_75%,var(--kg-fg)))]",
  "[&_[data-token=attr]]:text-[var(--kg-code-attr,color-mix(in_oklab,var(--kg-warning)_70%,var(--kg-fg)))]",
  "[&_[data-token=constant]]:text-[var(--kg-code-constant,var(--kg-accent-display))]",
  "[&_[data-token=punctuation]]:text-[var(--kg-code-punctuation,var(--kg-fg-muted))] [&_[data-token=operator]]:text-[var(--kg-code-punctuation,var(--kg-fg-muted))]",
].join(" ")

const CopyGlyph = ({ done }: { done: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {done ? (
      <path d="M3.5 8.5l3 3 6-7" />
    ) : (
      <>
        <rect x="5.5" y="5.5" width="8" height="8" rx="1.8" />
        <path d="M10.5 3.2A1.8 1.8 0 0 0 8.8 2H4a2 2 0 0 0-2 2v4.8a1.8 1.8 0 0 0 1.2 1.7" />
      </>
    )}
  </svg>
)

/**
 * A code sample with copy, line numbers and highlighted lines. The scroll region is focusable
 * so keyboard users can scroll long lines.
 */
export const CodeBlock = forwardRef<HTMLElement, CodeBlockProps>(
  (
    {
      code,
      language,
      title,
      tokens,
      highlight = "auto",
      lineNumbers = false,
      startLine = 1,
      highlightLines,
      wrap = false,
      maxHeight,
      hideCopy = false,
      bare = false,
      labels,
      actions,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const { copied, copy } = useCopy()
    const words = { copy: "Copy code", copied: "Copied", ...labels }
    const trimmed = code.replace(/\n$/, "")
    const lines = useMemo(
      () =>
        tokens ??
        (highlight === "auto"
          ? tokenizeCode(trimmed)
          : trimmed.split("\n").map((text): CodeBlockToken[] => [{ text }])),
      [tokens, highlight, trimmed],
    )
    const marked = useMemo(() => lineSet(highlightLines), [highlightLines])
    const digits = String(startLine + lines.length - 1).length

    const copyButton = hideCopy ? null : (
      <button
        type="button"
        className={cx(
          "kg-code-block__copy inline-grid size-[1.875rem] cursor-pointer place-items-center rounded-kg-md border-2 p-0 text-kg-fg-muted transition-colors duration-(--kg-duration-fast) ease-kg-out",
          "hover:bg-kg-muted hover:text-kg-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring data-[state=copied]:text-kg-success",
          "[&_svg]:size-[0.9375rem] [&_svg]:transition-transform [&_svg]:duration-(--kg-duration-spring) [&_svg]:ease-(--kg-ease-bounce) data-[state=copied]:[&_svg]:scale-110 data-[state=copied]:[&_svg]:rotate-360",
          bare ? "border-kg-ink bg-kg-surface shadow-kg-xs" : "border-transparent bg-transparent",
        )}
        data-state={copied ? "copied" : "idle"}
        aria-label={copied ? words.copied : words.copy}
        onClick={() => void copy(trimmed)}
      >
        <CopyGlyph done={copied} />
      </button>
    )

    return (
      <figure
        ref={ref}
        className={cx(
          "kg-code-block relative m-0 grid min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-kg-ink bg-kg-bg [--_max-h:none] [border-radius:var(--_radius,var(--kg-radius-xl))] [border-width:var(--_edge,2px)] [box-shadow:var(--_shadow,var(--kg-shadow-sm))]",
          className,
        )}
        data-language={language}
        data-bare={bare || undefined}
        data-wrap={wrap || undefined}
        style={
          {
            ...(maxHeight ? { "--_max-h": maxHeight } : null),
            "--_digits": digits,
            "--_gutter": `calc(var(--kg-space) * 4 + ${digits}ch + 1.25rem)`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {!bare && (title != null || language || !hideCopy || actions) && (
          <figcaption
            data-theme="dark"
            className="kg-code-block__header flex min-h-10 items-center gap-2 border-b-2 border-kg-border bg-kg-surface py-1 ps-4 pe-1.5 text-kg-xs text-kg-fg-muted"
          >
            <span className="kg-code-block__title min-w-0 flex-1 overflow-hidden font-kg-mono font-medium text-ellipsis whitespace-nowrap text-kg-fg">
              {title}
            </span>
            {language && (
              <span className="kg-code-block__language rounded-full border border-kg-border px-1.5 py-px font-kg-mono text-[0.6875rem] tracking-[0.02em] text-kg-fg-muted">
                {language}
              </span>
            )}
            {actions}
            {copyButton}
          </figcaption>
        )}
        {bare && copyButton && (
          <div
            data-theme="dark"
            className="kg-code-block__float absolute end-2 top-2 z-1 opacity-0 transition-opacity duration-(--kg-duration-fast) ease-kg-out focus-within:opacity-100 [.kg-code-block:hover>&]:opacity-100 [@media(hover:none)]:opacity-100"
          >
            {copyButton}
          </div>
        )}
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard reachable. */}
        <pre
          data-theme="dark"
          className="kg-code-block__pre m-0 max-h-(--_max-h) overflow-auto bg-kg-bg py-3.5 font-kg-mono text-kg-sm leading-[1.65] text-kg-fg [scrollbar-width:thin] [tab-size:2] focus-visible:rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring"
          tabIndex={0}
        >
          <code
            className={cx(
              "kg-code-block__code block [font:inherit]",
              wrap ? "min-w-0 [overflow-wrap:anywhere] whitespace-pre-wrap" : "min-w-max",
              syntax,
            )}
          >
            {lines.map((line, index) => {
              const number = startLine + index
              return (
                <span
                  key={index}
                  className={cx(
                    "kg-code-block__line relative block pe-4",
                    lineNumbers ? "ps-(--_gutter)" : "ps-4",
                    marked.has(number) && "bg-kg-accent-soft shadow-[inset_3px_0_0_var(--kg-accent)]",
                  )}
                  data-highlighted={marked.has(number) || undefined}
                >
                  {lineNumbers && (
                    <span
                      className={cx(
                        "kg-code-block__number absolute start-4 w-[calc(var(--_digits)*1ch)] text-end select-none",
                        marked.has(number) ? "text-kg-accent-strong" : "text-kg-fg-faint",
                      )}
                      aria-hidden="true"
                    >
                      {number}
                    </span>
                  )}
                  <span className="kg-code-block__content">
                    {line.length === 0
                      ? "\n"
                      : line.map((token, tokenIndex) =>
                          token.type && token.type !== "plain" ? (
                            <span key={tokenIndex} data-token={token.type}>
                              {token.text}
                            </span>
                          ) : (
                            token.text
                          ),
                        )}
                  </span>
                  {index < lines.length - 1 && line.length > 0 ? "\n" : null}
                </span>
              )
            })}
          </code>
        </pre>
        <span className="kg-code-block__status sr-only" role="status">
          {copied ? words.copied : ""}
        </span>
      </figure>
    )
  },
)
CodeBlock.displayName = "CodeBlock"
