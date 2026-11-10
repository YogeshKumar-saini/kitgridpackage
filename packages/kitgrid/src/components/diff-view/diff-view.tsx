"use client"

import { Fragment, forwardRef, type HTMLAttributes, type ReactNode, useMemo, useState } from "react"
import { cx } from "../../utils/cx.js"
import { type DiffViewLine, diffLines, inlineChange } from "./diff.js"

export type DiffViewMode = "unified" | "split"

export interface DiffViewLabels {
  added?: string
  removed?: string
  /** Text of the button that reveals hidden unchanged lines. */
  expand?: (count: number) => string
}

export interface DiffViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  before: string
  after: string
  mode?: DiffViewMode
  /** Unchanged lines kept around each change. `Infinity` shows everything. */
  context?: number
  /** Header text, such as a file path. */
  title?: ReactNode
  /** Accessible name of the diff table. */
  caption?: string
  /** Highlights the changed span inside a modified line. */
  inline?: boolean
  labels?: DiffViewLabels
}

type Pair = { left?: DiffViewLine; right?: DiffViewLine }

type Block =
  | { kind: "lines"; lines: DiffViewLine[] }
  | { kind: "gap"; id: number; lines: DiffViewLine[] }

/** Folds long unchanged stretches into expandable gaps. */
const toBlocks = (lines: DiffViewLine[], context: number): Block[] => {
  if (!Number.isFinite(context)) return [{ kind: "lines", lines }]
  const keep = new Array<boolean>(lines.length).fill(false)
  lines.forEach((line, index) => {
    if (line.type === "equal") return
    for (let j = Math.max(0, index - context); j <= Math.min(lines.length - 1, index + context); j++)
      keep[j] = true
  })
  const blocks: Block[] = []
  let gapId = 0
  let index = 0
  while (index < lines.length) {
    const visible = keep[index] as boolean
    const run: DiffViewLine[] = []
    while (index < lines.length && keep[index] === visible) run.push(lines[index++] as DiffViewLine)
    if (visible || run.length < 2) blocks.push({ kind: "lines", lines: run })
    else blocks.push({ kind: "gap", id: gapId++, lines: run })
  }
  return blocks
}

/** Pairs consecutive removals with additions so split view lines them up. */
const toPairs = (lines: DiffViewLine[]): Pair[] => {
  const pairs: Pair[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index] as DiffViewLine
    if (line.type === "equal") {
      pairs.push({ left: line, right: line })
      index++
      continue
    }
    const removed: DiffViewLine[] = []
    const added: DiffViewLine[] = []
    while (lines[index]?.type === "remove") removed.push(lines[index++] as DiffViewLine)
    while (lines[index]?.type === "add") added.push(lines[index++] as DiffViewLine)
    for (let j = 0; j < Math.max(removed.length, added.length); j++) {
      const pair: Pair = {}
      if (removed[j]) pair.left = removed[j]
      if (added[j]) pair.right = added[j]
      pairs.push(pair)
    }
  }
  return pairs
}

type CellType = DiffViewLine["type"] | "empty" | undefined

/* Night paper with success/danger tints; changed lines also carry a +/− marker and a spoken word. */
const ROW_FILL: Record<string, string> = {
  equal: "",
  add: "bg-[color-mix(in_oklab,var(--kg-success)_16%,transparent)]",
  remove: "bg-[color-mix(in_oklab,var(--kg-danger)_16%,transparent)]",
  empty: "bg-kg-surface-sunken",
}
const NUM_FILL: Record<string, string> = {
  equal: "bg-kg-surface-sunken",
  add: "bg-[color-mix(in_oklab,var(--kg-success)_26%,var(--kg-surface-sunken))]",
  remove: "bg-[color-mix(in_oklab,var(--kg-danger)_24%,var(--kg-surface-sunken))]",
  empty: "bg-kg-surface-sunken",
}
const SIGN_INK: Record<string, string> = {
  equal: "text-kg-fg-faint",
  add: "font-bold text-[color-mix(in_oklab,var(--kg-success)_85%,var(--kg-fg))]",
  remove: "font-bold text-[color-mix(in_oklab,var(--kg-danger)_85%,var(--kg-fg))]",
  empty: "",
}

/** A line-level diff of two strings, unified or side by side, computed in the browser. */
export const DiffView = forwardRef<HTMLDivElement, DiffViewProps>(
  (
    {
      before,
      after,
      mode = "unified",
      context = 3,
      title,
      caption = "Changes",
      inline = true,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const lines = useMemo(() => diffLines(before, after), [before, after])
    const blocks = useMemo(() => toBlocks(lines, context), [lines, context])
    const [opened, setOpened] = useState<Set<number>>(() => new Set())
    const words = {
      added: "added",
      removed: "removed",
      expand: (count: number) => `${count} unchanged lines`,
      ...labels,
    }
    const additions = lines.filter((line) => line.type === "add").length
    const removals = lines.filter((line) => line.type === "remove").length

    /** Partner line for inline highlighting: the n-th removal pairs with the n-th addition. */
    const partners = useMemo(() => {
      const map = new Map<DiffViewLine, DiffViewLine>()
      for (const pair of toPairs(lines)) {
        if (pair.left && pair.right && pair.left !== pair.right) {
          map.set(pair.left, pair.right)
          map.set(pair.right, pair.left)
        }
      }
      return map
    }, [lines])

    const text = (line: DiffViewLine | undefined) => {
      if (!line) return null
      const partner = inline ? partners.get(line) : undefined
      if (!partner) return line.text || " "
      const parts =
        line.type === "remove"
          ? inlineChange(line.text, partner.text).from
          : inlineChange(partner.text, line.text).to
      return (
        <>
          {parts[0]}
          {parts[1] && <span
              className={cx(
                "kg-diff-view__word rounded-[2px]",
                line.type === "remove"
                  ? "bg-[color-mix(in_oklab,var(--kg-danger)_34%,transparent)] line-through decoration-[color-mix(in_oklab,var(--kg-danger)_70%,var(--kg-fg))]"
                  : "bg-[color-mix(in_oklab,var(--kg-success)_34%,transparent)]",
              )}
            >
              {parts[1]}
            </span>}
          {parts[2]}
        </>
      )
    }

    const sign = (line: DiffViewLine | undefined) =>
      !line || line.type === "equal" ? (
        <span aria-hidden="true"> </span>
      ) : (
        <>
          <span aria-hidden="true">{line.type === "add" ? "+" : "\u2212"}</span>
          <span className="kg-diff-view__sr sr-only">
            {line.type === "add" ? words.added : words.removed}
          </span>
        </>
      )

    const columns = mode === "split" ? 6 : 4
    const split = mode === "split"
    const num = (type: CellType, right?: boolean) =>
      cx(
        "kg-diff-view__num w-12 px-2 text-end align-top text-kg-fg-faint select-none",
        NUM_FILL[type ?? "equal"],
        right && "border-s border-kg-border",
      )
    const signCell = (type: CellType) =>
      cx(
        "kg-diff-view__sign w-6 ps-2 align-top select-none",
        ROW_FILL[type ?? "equal"],
        SIGN_INK[type ?? "equal"],
      )
    const code = (type: CellType) =>
      cx(
        "kg-diff-view__code pe-4",
        split ? "[overflow-wrap:anywhere] whitespace-pre-wrap" : "whitespace-pre",
        ROW_FILL[type ?? "equal"],
      )

    const renderLines = (chunk: DiffViewLine[]) =>
      mode === "split"
        ? toPairs(chunk).map((pair, index) => (
            <tr key={index} className="kg-diff-view__row">
              <td className={num(pair.left?.type)} data-type={pair.left?.type} aria-hidden="true">
                {pair.left?.oldNumber}
              </td>
              <td className={signCell(pair.left?.type ?? "empty")} data-type={pair.left?.type ?? "empty"}>
                {sign(pair.left)}
              </td>
              <td className={code(pair.left?.type ?? "empty")} data-type={pair.left?.type ?? "empty"}>
                {text(pair.left)}
              </td>
              <td className={num(pair.right?.type, true)} data-type={pair.right?.type} data-side="right" aria-hidden="true">
                {pair.right?.newNumber}
              </td>
              <td className={signCell(pair.right?.type ?? "empty")} data-type={pair.right?.type ?? "empty"}>
                {sign(pair.right)}
              </td>
              <td className={code(pair.right?.type ?? "empty")} data-type={pair.right?.type ?? "empty"}>
                {text(pair.right)}
              </td>
            </tr>
          ))
        : chunk.map((line, index) => (
            <tr key={index} className="kg-diff-view__row" data-type={line.type}>
              <td className={num(line.type)} data-type={line.type} aria-hidden="true">
                {line.oldNumber}
              </td>
              <td className={num(line.type)} data-type={line.type} aria-hidden="true">
                {line.newNumber}
              </td>
              <td className={signCell(line.type)} data-type={line.type}>
                {sign(line)}
              </td>
              <td className={code(line.type)} data-type={line.type}>
                {text(line)}
              </td>
            </tr>
          ))

    return (
      <div
        ref={ref}
        className={cx(
          "kg-diff-view grid min-w-0 overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-bg shadow-kg-sm",
          className,
        )}
        data-mode={mode}
        {...props}
      >
        {title != null && (
          <div
            data-theme="dark"
            className="kg-diff-view__header flex items-center gap-2 border-b-2 border-kg-border bg-kg-surface px-4 py-2.5 text-kg-xs text-kg-fg"
          >
            <span className="kg-diff-view__title min-w-0 flex-1 overflow-hidden font-kg-mono font-medium text-ellipsis whitespace-nowrap">
              {title}
            </span>
            <span
              className="kg-diff-view__stat font-kg-mono font-semibold text-[color-mix(in_oklab,var(--kg-success)_80%,var(--kg-fg))]"
              data-type="add"
            >
              +{additions}
            </span>
            <span
              className="kg-diff-view__stat font-kg-mono font-semibold text-[color-mix(in_oklab,var(--kg-danger)_80%,var(--kg-fg))]"
              data-type="remove"
            >
              {"\u2212"}
              {removals}
            </span>
          </div>
        )}
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard reachable. */}
        <div
          data-theme="dark"
          className="kg-diff-view__scroll overflow-auto bg-kg-bg text-kg-fg [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring"
          tabIndex={0}
        >
          <table
            className={cx(
              "kg-diff-view__table w-full border-collapse font-kg-mono text-kg-xs leading-[1.7]",
              split && "table-fixed",
            )}
          >
            <caption className="kg-diff-view__sr sr-only">{caption}</caption>
            <tbody>
              {blocks.map((block, index) =>
                block.kind === "lines" || opened.has(block.id) ? (
                  <Fragment key={index}>{renderLines(block.lines)}</Fragment>
                ) : (
                  <tr key={index} className="kg-diff-view__gap">
                    <td colSpan={columns} className="bg-kg-surface-sunken p-0">
                      <button
                        type="button"
                        className="kg-diff-view__expand flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-1 text-start text-kg-fg-muted [font:inherit] hover:bg-kg-muted hover:text-kg-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring [&_svg]:size-3.5"
                        onClick={() =>
                          setOpened((current) => new Set(current).add(block.id))
                        }
                      >
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <path
                            d="M5 6l3-3 3 3M5 10l3 3 3-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {words.expand(block.lines.length)}
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  },
)
DiffView.displayName = "DiffView"
