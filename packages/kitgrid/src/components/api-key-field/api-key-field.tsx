"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { CheckIcon, CopyIcon } from "../copy-field/copy-field.js"
import { useCopy } from "../copy-field/copy-text.js"

export interface ApiKeyFieldLabels {
  reveal?: string
  copy?: string
  copied?: string
  regenerate?: string
  confirm?: string
  cancel?: string
  /** Shown while the confirmation is open. */
  warning?: string
  /** Read before the visible tail of a masked key. */
  masked?: string
}

export interface ApiKeyFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "onCopy"> {
  /** The full key. Only the prefix and `visibleChars` of it are drawn until revealed. */
  value: string
  name: ReactNode
  /** A quiet line beside the name: created date, last used. */
  meta?: ReactNode
  /** Characters kept at the end of the masked key. */
  visibleChars?: number
  revealed?: boolean
  defaultRevealed?: boolean
  onRevealedChange?: (revealed: boolean) => void
  /** Adds a Regenerate action guarded by an inline confirmation. May return a promise. */
  onRegenerate?: () => void | Promise<void>
  onCopy?: (value: string) => void
  labels?: ApiKeyFieldLabels
}

const words: Required<ApiKeyFieldLabels> = {
  reveal: "Show key",
  copy: "Copy key",
  copied: "Copied",
  regenerate: "Regenerate",
  confirm: "Regenerate key",
  cancel: "Cancel",
  warning: "The current key stops working now.",
  masked: "hidden, ending in",
}

/** Keeps a recognisable prefix such as `sk_live_` and the last few characters. */
const mask = (value: string, visible: number) => {
  const prefix = /^[a-z]+(?:_[a-z]+)*_/i.exec(value)?.[0] ?? ""
  const tail = value.slice(Math.max(prefix.length, value.length - visible))
  const hidden = Math.max(value.length - prefix.length - tail.length, 0)
  return { prefix, dots: "•".repeat(Math.min(hidden, 16)), tail }
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const RotateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const tool = cx(
  "kg-api-key-field__tool grid place-items-center size-[1.875rem] p-0 [&_svg]:size-4",
  "border-0 rounded-kg-sm bg-transparent text-kg-fg-muted cursor-pointer",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "interactive:not-aria-pressed:hover:bg-kg-muted interactive:not-aria-pressed:hover:text-kg-fg",
  "aria-pressed:bg-kg-accent aria-pressed:text-kg-accent-fg data-copied:text-kg-success",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
)

const action = cx(
  "kg-api-key-field__action h-kg-sm px-3 text-kg-xs font-[560] font-[family-name:inherit] rounded-full border-2 border-kg-ink",
  "cursor-pointer shadow-kg-xs transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:-translate-px interactive:active:translate-0.5 interactive:active:shadow-none",
  "disabled:cursor-progress disabled:opacity-70 disabled:shadow-none",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
)

/** An API key row: masked value, reveal, copy and a confirmed regenerate. */
export const ApiKeyField = forwardRef<HTMLDivElement, ApiKeyFieldProps>(
  (
    {
      value,
      name,
      meta,
      visibleChars = 4,
      revealed: revealedProp,
      defaultRevealed = false,
      onRevealedChange,
      onRegenerate,
      onCopy,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const t = { ...words, ...labels }
    const nameId = useId()
    const warnId = useId()
    const [revealed, setRevealed] = useControllableState({
      value: revealedProp,
      defaultValue: defaultRevealed,
      onChange: onRevealedChange,
    })
    const [confirming, setConfirming] = useState(false)
    const [busy, setBusy] = useState(false)
    const { copied, copy } = useCopy()
    const cancelRef = useRef<HTMLButtonElement>(null)
    const regenRef = useRef<HTMLButtonElement>(null)
    const wasConfirming = useRef(false)

    useEffect(() => {
      if (confirming) cancelRef.current?.focus()
      else if (wasConfirming.current) regenRef.current?.focus()
      wasConfirming.current = confirming
    }, [confirming])

    const parts = mask(value, visibleChars)

    const regenerate = async () => {
      setBusy(true)
      try {
        await onRegenerate?.()
      } finally {
        setBusy(false)
        setConfirming(false)
      }
    }

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={nameId}
        className={cx(
          "kg-api-key-field grid gap-2 min-w-0 p-3 text-kg-fg",
          "bg-kg-surface border-2 border-kg-ink rounded-kg-lg shadow-kg-sm",
          className,
        )}
        data-state={confirming ? "confirming" : "idle"}
        {...props}
      >
        <div className="kg-api-key-field__head flex items-baseline justify-between gap-3 min-w-0">
          <span id={nameId} className="kg-api-key-field__name text-kg-sm font-semibold text-kg-fg">
            {name}
          </span>
          {meta != null && (
            <span className="kg-api-key-field__meta text-kg-xs whitespace-nowrap text-kg-fg-faint">
              {meta}
            </span>
          )}
        </div>
        <div
          className={cx(
            "kg-api-key-field__row flex items-center gap-2 min-w-0 h-kg-md ps-3 pe-1",
            "bg-kg-surface-sunken border-2 border-kg-border rounded-kg-md",
          )}
        >
          <code
            className={cx(
              "kg-api-key-field__value flex-1 min-w-0 overflow-hidden p-0 bg-transparent rounded-none",
              "font-kg-mono text-kg-sm text-kg-fg whitespace-nowrap text-ellipsis",
              "data-revealed:animate-[kg-fade-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
            )}
            data-revealed={revealed || undefined}
          >
            {revealed ? (
              value
            ) : (
              <>
                <span className="kg-api-key-field__prefix text-kg-fg-muted">{parts.prefix}</span>
                <span
                  className="kg-api-key-field__dots tracking-[0.08em] text-kg-fg-faint"
                  aria-hidden="true"
                >
                  {parts.dots}
                </span>
                <span className="kg-visually-hidden"> {t.masked} </span>
                {parts.tail}
              </>
            )}
          </code>
          <div className="kg-api-key-field__tools flex shrink-0 gap-0.5">
            <button
              type="button"
              className={tool}
              aria-label={t.reveal}
              aria-pressed={revealed}
              onClick={() => setRevealed(!revealed)}
            >
              <EyeIcon />
            </button>
            <button
              type="button"
              className={tool}
              aria-label={t.copy}
              data-copied={copied || undefined}
              onClick={async () => {
                if (await copy(value)) onCopy?.(value)
              }}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            {onRegenerate && !confirming && (
              <button
                ref={regenRef}
                type="button"
                className={tool}
                aria-label={t.regenerate}
                onClick={() => setConfirming(true)}
              >
                <RotateIcon />
              </button>
            )}
          </div>
        </div>
        {confirming && (
          <div
            className={cx(
              "kg-api-key-field__confirm flex flex-wrap items-center gap-2 px-2.5 py-2 text-kg-fg",
              "bg-kg-paper-rose border-2 border-kg-ink rounded-kg-md origin-top",
              "animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
            )}
            role="alertdialog"
            aria-labelledby={warnId}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return
              event.stopPropagation()
              setConfirming(false)
            }}
          >
            <span
              id={warnId}
              className="kg-api-key-field__warning flex-1 min-w-[10rem] text-kg-xs font-[520] text-kg-fg"
            >
              {t.warning}
            </span>
            <button
              ref={cancelRef}
              type="button"
              className={cx(action, "bg-kg-surface text-kg-fg")}
              onClick={() => setConfirming(false)}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              className={cx(action, "bg-kg-danger text-kg-danger-fg")}
              data-tone="danger"
              aria-busy={busy || undefined}
              disabled={busy}
              onClick={() => void regenerate()}
            >
              {t.confirm}
            </button>
          </div>
        )}
        <span className="kg-visually-hidden" role="status">
          {copied ? t.copied : ""}
        </span>
      </div>
    )
  },
)

ApiKeyField.displayName = "ApiKeyField"
