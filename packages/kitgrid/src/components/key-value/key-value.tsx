"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { useCopy } from "../../utils/copy-text.js"
import { cx } from "../../utils/cx.js"

export interface KeyValueLabels {
  copy?: string
  copied?: string
}

export interface KeyValueProps extends HTMLAttributes<HTMLDListElement> {
  label: ReactNode
  value: ReactNode
  /** Shows a copy button. Copies `copyValue`, or `value` when it is a string or number. */
  copyable?: boolean
  copyValue?: string
  /** Monospace value for IDs, hashes and keys. */
  mono?: boolean
  /** A dotted leader between label and value, like a receipt. */
  leader?: boolean
  labels?: KeyValueLabels
}

const CopyIcon = ({ done }: { done: boolean }) => (
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

/** A single labelled value on one row, with an optional copy action. */
export const KeyValue = forwardRef<HTMLDListElement, KeyValueProps>(
  (
    {
      label,
      value,
      copyable = false,
      copyValue,
      mono = false,
      leader = false,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const { copied, copy } = useCopy()
    const text =
      copyValue ??
      (typeof value === "string" || typeof value === "number" ? String(value) : "")
    const words = { copy: "Copy", copied: "Copied", ...labels }

    return (
      <dl
        ref={ref}
        className={cx("kg-key-value m-0 flex min-w-0 items-center gap-3 text-kg-base leading-[1.4]", className)}
        data-mono={mono || undefined}
        data-leader={leader || undefined}
        {...props}
      >
        <dt className="kg-key-value__label flex-none text-kg-fg-muted">{label}</dt>
        <dd className="kg-key-value__value relative m-0 inline-flex min-w-0 flex-1 items-center justify-end gap-1 font-medium text-kg-fg tabular-nums">
          {leader && <span className="kg-key-value__leader mt-[0.35em] h-px min-w-4 flex-1 self-center border-b-2 border-dotted border-kg-ink/60" aria-hidden="true" />}
          <span className={`kg-key-value__text min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${mono ? "font-kg-mono text-[0.92em] font-normal" : ""}`}>{value}</span>
          {copyable && text && (
            <button
              type="button"
              className="kg-key-value__copy inline-grid size-[1.625rem] flex-none cursor-pointer place-items-center rounded-kg-sm border-0 bg-transparent p-0 text-kg-fg-muted transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted hover:text-kg-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring data-[state=copied]:text-kg-success [&_svg]:size-3.5 [&_svg]:transition-transform [&_svg]:duration-(--kg-duration-spring) [&_svg]:ease-(--kg-ease-bounce) data-[state=copied]:[&_svg]:rotate-360"
              data-state={copied ? "copied" : "idle"}
              aria-label={copied ? words.copied : words.copy}
              onClick={() => void copy(text)}
            >
              <CopyIcon done={copied} />
            </button>
          )}
          {copyable && (
            <span className="kg-key-value__status sr-only" role="status">
              {copied ? words.copied : ""}
            </span>
          )}
        </dd>
      </dl>
    )
  },
)
KeyValue.displayName = "KeyValue"
