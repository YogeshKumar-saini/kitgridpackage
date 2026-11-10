"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { IconButton } from "../icon-button/icon-button.js"
import { CheckIcon, CopyIcon, RetryIcon, SparkleIcon } from "./internal/icons.js"

export type ChatMessageFrom = "user" | "assistant" | "system"

export interface ChatMessageLabels {
  copy?: string
  copied?: string
  copyFailed?: string
  retry?: string
}

export interface ChatMessageProps extends HTMLAttributes<HTMLElement> {
  /** Who wrote it. User messages sit in a bubble on the end side; assistant messages read as prose. */
  from?: ChatMessageFrom
  /** Accessible name of the author. Defaults to "You", "Assistant" or "System". */
  name?: string
  /** Shown beside assistant messages. Defaults to a sparkle emblem; pass `null` for none. */
  avatar?: ReactNode
  /** A timestamp or other quiet metadata, shown in the actions row. */
  time?: ReactNode
  /** Draws a caret after the last words while the answer is still being written. */
  streaming?: boolean
  /** Text the copy button writes to the clipboard. The button appears when set. */
  copyText?: string
  /** Shows a retry button. */
  onRetry?: () => void
  /** Extra controls for the actions row, e.g. rating buttons. */
  actions?: ReactNode
  labels?: ChatMessageLabels
}

const defaultNames: Record<ChatMessageFrom, string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
}

const defaultLabels: Required<ChatMessageLabels> = {
  copy: "Copy message",
  copied: "Copied",
  copyFailed: "Copy failed",
  retry: "Retry",
}

type CopyState = "idle" | "copied" | "failed"

const rootClass = cx(
  "kg-chat-message group/msg flex min-w-0 gap-3 text-kg-base leading-[1.6] text-kg-fg",
  "data-[from=user]:flex-row-reverse data-[from=system]:justify-center",
)

/* Paper Layers: the user's turn is an ink sheet lifted on sage; system notes are a quiet sunken pill. */
const contentVariants = variants({
  base: "kg-chat-message__content min-w-0 max-w-full [overflow-wrap:anywhere]",
  variants: {
    from: {
      assistant: "",
      user: [
        "max-w-[min(85%,36rem)] px-3.5 py-2 whitespace-pre-wrap",
        "rounded-[var(--kg-radius-2xl)_var(--kg-radius-2xl)_var(--kg-radius-sm)_var(--kg-radius-2xl)]",
        "border-2 border-kg-ink bg-kg-accent text-kg-accent-fg shadow-[3px_3px_0_var(--kg-paper-sage)]",
        "origin-bottom-right animate-[kg-pop-in_var(--kg-duration-spring)_var(--kg-ease-spring)_backwards] motion-reduce:animate-none",
      ],
      system: "rounded-full border-2 border-kg-border bg-kg-surface-sunken px-3 py-1 text-center text-kg-xs text-kg-fg-muted",
    },
  },
  defaults: { from: "assistant" },
})

export const ChatMessage = forwardRef<HTMLElement, ChatMessageProps>(
  (
    {
      from = "assistant",
      name,
      avatar,
      time,
      streaming = false,
      copyText,
      onRetry,
      actions,
      labels: labelsProp,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const labels = { ...defaultLabels, ...labelsProp }
    const [copy, setCopy] = useState<CopyState>("idle")
    const timer = useRef(0)
    useEffect(() => () => window.clearTimeout(timer.current), [])

    const handleCopy = () => {
      if (copyText === undefined) return
      const settle = (state: CopyState) => {
        setCopy(state)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopy("idle"), 1600)
      }
      const clipboard =
        typeof navigator !== "undefined" ? navigator.clipboard : undefined
      if (!clipboard) return settle("failed")
      clipboard.writeText(copyText).then(
        () => settle("copied"),
        () => settle("failed"),
      )
    }

    const copyLabel =
      copy === "copied"
        ? labels.copied
        : copy === "failed"
          ? labels.copyFailed
          : labels.copy
    const showCopy = copyText !== undefined && !streaming
    const showRetry = onRetry !== undefined && !streaming
    const hasActions = showCopy || showRetry || actions != null || time != null
    const emblem =
      avatar === undefined && from === "assistant" ? (
        <span className="kg-chat-message__emblem inline-grid size-7 place-items-center rounded-full border-2 border-kg-ink bg-kg-paper-sage text-[0.875rem] text-kg-fg group-data-streaming/msg:[&_svg]:animate-[kg-pulse_1.6s_var(--kg-ease-in-out)_infinite] motion-reduce:[&_svg]:animate-none">
          <SparkleIcon />
        </span>
      ) : (
        avatar
      )

    return (
      <article
        ref={ref}
        className={cx(rootClass, className)}
        data-from={from}
        data-streaming={streaming || undefined}
        aria-label={name ?? defaultNames[from]}
        aria-busy={streaming || undefined}
        {...props}
      >
        {from !== "system" && emblem != null && (
          <span className="kg-chat-message__avatar mt-0.5 inline-grid shrink-0 self-start place-items-center" aria-hidden="true">
            {emblem}
          </span>
        )}
        <div className="kg-chat-message__body flex min-w-0 flex-1 flex-col gap-1.5 group-data-[from=user]/msg:items-end group-data-[from=system]/msg:flex-[0_1_auto] group-data-[from=system]/msg:items-center">
          <div
            className={contentVariants({ from })}
            data-streaming={streaming || undefined}
          >
            {children}
          </div>
          {from !== "system" && hasActions && (
            <div className="kg-chat-message__actions -ms-1.5 flex items-center gap-0.5 opacity-0 transition-opacity duration-(--kg-duration-base) ease-kg-out group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 group-data-[from=user]/msg:ms-0 group-data-[from=user]/msg:-me-1.5 [@media(hover:none)]:opacity-100">
              {showCopy && (
                <IconButton
                  size="sm"
                  label={copyLabel}
                  data-state={copy}
                  icon={copy === "copied" ? <CheckIcon /> : <CopyIcon />}
                  onClick={handleCopy}
                />
              )}
              {showRetry && (
                <IconButton
                  size="sm"
                  label={labels.retry}
                  icon={<RetryIcon />}
                  onClick={onRetry}
                />
              )}
              {actions}
              {time != null && <span className="kg-chat-message__time px-1.5 text-kg-xs tabular-nums text-kg-fg-faint">{time}</span>}
              <span className="kg-visually-hidden" role="status">
                {copy === "idle" ? "" : copyLabel}
              </span>
            </div>
          )}
        </div>
      </article>
    )
  },
)

ChatMessage.displayName = "ChatMessage"
