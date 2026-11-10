"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useId,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { DeltaArrow, type DeltaDirection } from "../delta/delta.js"

export type InsightListSeverity = "high" | "medium" | "low"
export type InsightListTone = "positive" | "negative" | "neutral"

export interface InsightListItem {
  id: string
  title: ReactNode
  description?: ReactNode
  severity?: InsightListSeverity
  /** Which way the thing moved. Drives the arrow. */
  direction?: DeltaDirection
  /** Whether the move is good. Defaults to up is good, down is bad. */
  tone?: InsightListTone
  /** Size of the effect. Draws a bar relative to the largest impact in the list. */
  impact?: number
  /** How the impact reads, e.g. "+$12.4k". Defaults to the number. */
  impactLabel?: ReactNode
}

export interface InsightListLabels {
  severity?: Partial<Record<InsightListSeverity, string>>
  showAll?: (total: number) => string
  showFewer?: string
}

export interface InsightListProps extends HTMLAttributes<HTMLDivElement> {
  items: readonly InsightListItem[]
  /** Items past this wait behind a "Show all" button. */
  maxVisible?: number
  /** Shown when there are no items. */
  empty?: ReactNode
  labels?: InsightListLabels
}

const severityWords: Record<InsightListSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

const tones: Record<InsightListTone, { glyph: string; bar: string; label: string }> = {
  positive: {
    glyph: "bg-kg-paper-sage",
    bar: "bg-kg-success",
    label: "text-[color-mix(in_oklab,var(--kg-success)_80%,var(--kg-fg))]",
  },
  negative: {
    glyph: "bg-kg-paper-rose",
    bar: "bg-kg-danger",
    label: "text-[color-mix(in_oklab,var(--kg-danger)_75%,var(--kg-fg))]",
  },
  neutral: { glyph: "bg-kg-muted", bar: "bg-kg-fg-muted", label: "text-kg-fg-muted" },
}

const itemClass = [
  "kg-insight-list__item relative flex items-start gap-3 overflow-hidden rounded-kg-lg border-2 border-kg-ink bg-kg-surface p-3.5",
  "animate-[kg-insight-in_var(--kg-duration-slow)_var(--kg-ease-out)_backwards] [animation-delay:calc(var(--_i,0)*50ms)]",
  "motion-reduce:animate-none in-data-[kg-motion=reduce]:animate-none",
].join(" ")

const moreClass = [
  "kg-insight-list__more h-kg-sm cursor-pointer rounded-kg-md border-0 bg-transparent font-[inherit] text-kg-sm font-[560] text-kg-fg-muted",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted hover:text-kg-fg",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

const rootClass = "kg-insight-list grid min-w-0 gap-2 text-kg-fg"

/**
 * A stream of findings, "what changed", each with a direction, a written severity and a bar
 * for the size of its impact. Long lists fold behind a disclosure button.
 */
export const InsightList = forwardRef<HTMLDivElement, InsightListProps>(
  ({ items, maxVisible = 5, empty, labels, className, ...props }, ref) => {
    const [expanded, setExpanded] = useState(false)
    const listId = useId()
    if (items.length === 0 && empty != null)
      return (
        <div ref={ref} className={cx(rootClass, className)} {...props}>
          <div className="kg-insight-list__empty rounded-kg-lg border-2 border-dashed border-kg-border-strong px-4 py-8 text-center text-kg-fg-muted">
            {empty}
          </div>
        </div>
      )

    const widest = Math.max(1e-9, ...items.map((item) => Math.abs(item.impact ?? 0)))
    const shown = expanded ? items : items.slice(0, maxVisible)
    const folds = items.length > maxVisible
    const words = { ...severityWords, ...labels?.severity }

    return (
      <div ref={ref} className={cx(rootClass, className)} {...props}>
        <ol className="kg-insight-list__list m-0 grid list-none gap-2 p-0" id={listId}>
          {shown.map((item, index) => {
            const direction = item.direction ?? "flat"
            const tone: InsightListTone =
              item.tone ??
              (direction === "up" ? "positive" : direction === "down" ? "negative" : "neutral")
            const share =
              item.impact === undefined ? null : (Math.abs(item.impact) / widest) * 100
            return (
              <li
                key={item.id}
                className={itemClass}
                data-tone={tone}
                data-severity={item.severity}
                style={{ "--_i": index } as CSSProperties}
              >
                <span
                  className={cx(
                    "kg-insight-list__glyph grid size-[1.75rem] shrink-0 place-items-center rounded-full text-kg-fg",
                    tones[tone].glyph,
                  )}
                  aria-hidden="true"
                >
                  <DeltaArrow direction={direction} />
                </span>
                <div className="kg-insight-list__body grid min-w-0 flex-auto gap-1">
                  <div className="kg-insight-list__head flex items-start justify-between gap-2">
                    <p className="kg-insight-list__title m-0 text-kg-base font-[580] leading-[1.4] text-pretty">
                      {item.title}
                    </p>
                    {item.severity && (
                      <span
                        className={cx(
                          "kg-insight-list__severity mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.04em] uppercase",
                          item.severity === "high"
                            ? "bg-kg-accent text-kg-accent-fg"
                            : "bg-kg-muted text-kg-fg-muted",
                        )}
                      >
                        <span className="kg-visually-hidden">Severity: </span>
                        {words[item.severity]}
                      </span>
                    )}
                  </div>
                  {item.description != null && (
                    <p className="kg-insight-list__description m-0 text-kg-sm leading-normal text-kg-fg-muted">{item.description}</p>
                  )}
                  {share !== null && (
                    <div className="kg-insight-list__impact flex items-center gap-3 pt-1.5">
                      <span
                        className={cx(
                          "kg-insight-list__impact-label shrink-0 text-kg-sm font-semibold tabular-nums",
                          tones[tone].label,
                        )}
                      >
                        {item.impactLabel ?? item.impact}
                      </span>
                      <span
                        className="kg-insight-list__track h-1 flex-auto overflow-hidden rounded-full bg-kg-muted"
                        aria-hidden="true"
                      >
                        <span
                          className={cx(
                            "kg-insight-list__bar block h-full rounded-[inherit] scale-x-(--_share) ltr:origin-left rtl:origin-right",
                            "transition-[scale] duration-[var(--kg-duration-slower)] ease-kg-out",
                            tones[tone].bar,
                          )}
                          style={{ "--_share": share / 100 } as CSSProperties}
                        />
                      </span>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
        {folds && (
          <button
            type="button"
            className={moreClass}
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded
              ? (labels?.showFewer ?? "Show fewer")
              : (labels?.showAll?.(items.length) ?? `Show all ${items.length}`)}
          </button>
        )}
      </div>
    )
  },
)

InsightList.displayName = "InsightList"
