import {
  createElement,
  Fragment,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"
import { type MarkdownInline, parseBlocks, parseInline } from "./parse.js"

export interface MarkdownTextProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** The markdown source. Safe to pass model output: nothing is injected as HTML. */
  children: string
  /** The heading level a single `#` maps to, so answers slot under the page's own headings. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Where absolute links open. */
  linkTarget?: "_blank" | "_self"
}

/* Every element is built here, so each carries its own utilities; no element selectors needed. */
const md = {
  root: "kg-markdown-text flex min-w-0 flex-col gap-2.5 text-kg-base leading-[1.65] text-kg-fg [overflow-wrap:anywhere]",
  p: "m-0 text-pretty",
  h: "m-0 mt-1 text-kg-md leading-[1.35] font-[650] tracking-[-0.01em]",
  hSmall: "m-0 mt-1 text-kg-base leading-[1.35] font-[650] tracking-[-0.01em]",
  strong: "font-[650]",
  a: "rounded-kg-xs font-semibold text-kg-accent-strong underline decoration-2 decoration-kg-paper-sage underline-offset-[0.2em] transition-[text-decoration-color] duration-(--kg-duration-fast) ease-kg-out hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  code: "rounded-kg-xs bg-kg-paper-sage/60 px-[0.35em] py-[0.1em] font-kg-mono text-[0.88em]",
  pre: "relative m-0 overflow-x-auto rounded-kg-lg border-2 border-kg-ink bg-kg-surface-sunken px-3.5 py-3 font-kg-mono text-kg-sm leading-[1.6] text-kg-fg [tab-size:2] data-language:before:mb-1.5 data-language:before:block data-language:before:text-kg-xs data-language:before:lowercase data-language:before:text-kg-fg-faint data-language:before:content-[attr(data-language)]",
  preCode: "[font:inherit] whitespace-pre",
  list: "m-0 flex flex-col gap-1 ps-5",
  ul: "marker:text-kg-fg",
  ol: "marker:tabular-nums marker:text-kg-fg-faint",
  li: "ps-0.5",
  quote: "m-0 border-s-2 border-kg-ink ps-3 text-kg-fg-muted",
  hr: "m-0 my-1 h-0.5 w-full border-0 bg-kg-border",
  table: "kg-markdown-text__table overflow-x-auto rounded-kg-lg border-2 border-kg-ink",
  th: "border-b-2 border-kg-ink bg-kg-surface-sunken px-3 py-1.5 text-start font-semibold whitespace-nowrap text-kg-fg-muted data-numeric:text-end",
  td: "border-b border-kg-border px-3 py-1.5 text-kg-fg-muted [tr:last-child>&]:border-b-0 data-numeric:text-end data-numeric:font-kg-mono data-numeric:whitespace-nowrap data-numeric:tabular-nums data-numeric:text-kg-fg",
}

const NUMERIC = /^[−+\-$€£¥₹]?[\d,.]+\s*(%|[kKMB]|L|Cr|pp|×|x)?$/

const renderInline = (nodes: MarkdownInline[], target: string): ReactNode[] =>
  nodes.map((node, index) => {
    switch (node.kind) {
      case "text":
        return <Fragment key={index}>{node.text}</Fragment>
      case "code":
        return <code key={index} className={md.code}>{node.text}</code>
      case "strong":
        return <strong key={index} className={md.strong}>{renderInline(node.children, target)}</strong>
      case "em":
        return <em key={index}>{renderInline(node.children, target)}</em>
      case "del":
        return <del key={index}>{renderInline(node.children, target)}</del>
      case "link": {
        const children = renderInline(node.children, target)
        if (!node.href) return <Fragment key={index}>{children}</Fragment>
        const external = /^https?:/i.test(node.href)
        return (
          <a
            key={index}
            className={md.a}
            href={node.href}
            target={external ? target : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            {children}
          </a>
        )
      }
    }
  })

/**
 * A tiny, safe markdown renderer for assistant answers: paragraphs, headings, emphasis, inline
 * and fenced code, lists, quotes, tables and links. It builds React elements from a small
 * parser, never HTML strings, and survives half-streamed input. Server-component safe.
 */
export const MarkdownText = forwardRef<HTMLDivElement, MarkdownTextProps>(
  ({ children, headingLevel = 3, linkTarget = "_blank", className, ...props }, ref) => {
    const level = (depth: number) => Math.min(headingLevel + depth - 1, 6)
    const inline = (text: string) => renderInline(parseInline(text), linkTarget)
    const lines = (rows: string[]) =>
      rows.map((row, at) => (
        <Fragment key={at}>
          {at > 0 && <br />}
          {inline(row)}
        </Fragment>
      ))

    return (
      <div ref={ref} className={cx(md.root, className)} {...props}>
        {parseBlocks(children).map((block, index) => {
          switch (block.kind) {
            case "p":
              return <p key={index} className={md.p}>{lines(block.lines)}</p>
            case "h":
              return createElement(
                `h${level(block.depth)}`,
                { key: index, className: level(block.depth) >= 4 ? md.hSmall : md.h },
                inline(block.text),
              )
            case "hr":
              return <hr key={index} className={md.hr} />
            case "quote":
              return (
                <blockquote key={index} className={md.quote}>
                  <p className={md.p}>{lines(block.lines)}</p>
                </blockquote>
              )
            case "code":
              return (
                <pre key={index} className={md.pre} data-language={block.lang || undefined}>
                  <code className={md.preCode}>{block.text}</code>
                </pre>
              )
            case "ul":
            case "ol": {
              const items = block.items.map((item, at) => (
                <li key={at} className={md.li}>{inline(item)}</li>
              ))
              return block.kind === "ul" ? (
                <ul key={index} className={cx(md.list, md.ul)}>{items}</ul>
              ) : (
                <ol key={index} className={cx(md.list, md.ol)} start={block.start === 1 ? undefined : block.start}>
                  {items}
                </ol>
              )
            }
            case "table": {
              const numeric = (cell: string | undefined) =>
                NUMERIC.test((cell ?? "").replace(/\*\*/g, ""))
              const numericColumn = block.head.map(
                (_, column) =>
                  block.rows.length > 0 &&
                  block.rows.every((row) => numeric(row[column])),
              )
              return (
                <div key={index} className={md.table}>
                  <table className="w-full border-collapse text-kg-sm">
                    <thead>
                      <tr>
                        {block.head.map((cell, at) => (
                          <th
                            key={at}
                            className={md.th}
                            scope="col"
                            data-numeric={numericColumn[at] || undefined}
                          >
                            {inline(cell)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, at) => (
                        <tr key={at}>
                          {row.map((cell, column) => (
                            <td key={column} className={md.td} data-numeric={numeric(cell) || undefined}>
                              {inline(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          }
        })}
      </div>
    )
  },
)

MarkdownText.displayName = "MarkdownText"
