"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId, useState } from "react"
import { cx } from "../../utils/cx.js"

export interface WebhookLogDelivery {
  id: string
  /** Event type, e.g. `invoice.paid`. */
  event: string
  /** HTTP status. 0 means no response (timeout, DNS). */
  status: number
  time: ReactNode
  /** Round trip, e.g. "182ms". */
  duration?: ReactNode
  /** Request body, shown when the row is expanded. */
  payload?: string
  /** Response body or error. */
  response?: string
}

export interface WebhookLogLabels {
  request?: string
  response?: string
  retry?: string
  noResponse?: string
  failed?: string
  succeeded?: string
}

export interface WebhookLogProps extends Omit<
  HTMLAttributes<HTMLUListElement>,
  "onToggle"
> {
  deliveries: readonly WebhookLogDelivery[]
  /** Adds a Retry button to failed deliveries. */
  onRetry?: (id: string) => void
  /** Row ids open on first render. */
  defaultExpanded?: readonly string[]
  labels?: WebhookLogLabels
}

const words: Required<WebhookLogLabels> = {
  request: "Request",
  response: "Response",
  retry: "Retry",
  noResponse: "No response",
  failed: "Failed",
  succeeded: "Succeeded",
}

const ok = (status: number) => status >= 200 && status < 300

const caption =
  "text-[0.6875rem] font-semibold tracking-[0.04em] text-kg-fg-faint uppercase"

const pre =
  "m-0 max-h-[12rem] overflow-auto rounded-kg-md border-2 border-kg-ink bg-kg-surface p-3 font-kg-mono text-kg-xs leading-[1.6] text-kg-fg-muted"

/** Recent webhook deliveries; each row discloses its request and response bodies. */
export const WebhookLog = forwardRef<HTMLUListElement, WebhookLogProps>(
  ({ deliveries, onRetry, defaultExpanded = [], labels, className, ...props }, ref) => {
    const t = { ...words, ...labels }
    const [open, setOpen] = useState<ReadonlySet<string>>(
      () => new Set(defaultExpanded),
    )
    const baseId = useId()

    const toggle = (id: string) =>
      setOpen((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })

    return (
      <ul
        ref={ref}
        className={cx(
          "kg-webhook-log @container m-0 grid min-w-0 list-none overflow-hidden rounded-kg-lg border-2 border-kg-ink bg-kg-surface p-0 text-kg-sm shadow-kg-sm",
          className,
        )}
        {...props}
      >
        {deliveries.map((delivery) => {
          const expanded = open.has(delivery.id)
          const panelId = `${baseId}-${delivery.id}`
          const success = ok(delivery.status)
          return (
            <li
              key={delivery.id}
              className="kg-webhook-log__item border-b border-kg-border last:border-b-0"
              data-result={success ? "success" : "failure"}
              data-state={expanded ? "open" : "closed"}
            >
              <div className="kg-webhook-log__row flex items-center gap-2 pe-2">
                <button
                  type="button"
                  className={cx(
                    "kg-webhook-log__toggle grid min-w-0 flex-1 cursor-pointer grid-cols-[7.5rem_minmax(0,1fr)_auto_3.5rem_1rem] items-center gap-3 border-0 bg-transparent px-3 py-2.5",
                    "text-start text-inherit [font:inherit] transition-[background-color] duration-(--kg-duration-fast) ease-kg-out interactive:hover:bg-kg-muted",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
                    "@max-[34rem]:grid-cols-[auto_minmax(0,1fr)_1rem]",
                  )}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggle(delivery.id)}
                >
                  <span
                    className={cx(
                      "kg-webhook-log__status inline-flex items-center gap-1.5 justify-self-start rounded-kg-sm px-2 font-kg-mono text-kg-xs font-semibold leading-[1.375rem] whitespace-nowrap text-kg-fg before:size-[0.375rem]",
                      success
                        ? "bg-kg-paper-sage before:rounded-full before:bg-kg-success"
                        : "bg-kg-paper-rose before:rotate-45 before:rounded-[1px] before:bg-kg-danger",
                    )}
                  >
                    <span className="kg-visually-hidden">
                      {success ? t.succeeded : t.failed},
                    </span>{" "}
                    {delivery.status === 0 ? t.noResponse : delivery.status}
                  </span>{" "}
                  <code className="kg-webhook-log__event truncate rounded-none bg-transparent p-0 font-kg-mono text-kg-xs text-kg-fg">
                    {delivery.event}
                  </code>{" "}
                  {delivery.duration != null && (
                    <span className="kg-webhook-log__duration text-kg-xs tabular-nums whitespace-nowrap text-kg-fg-faint @max-[34rem]:hidden">
                      {delivery.duration}
                    </span>
                  )}
                  <span className="kg-webhook-log__time text-end text-kg-xs tabular-nums whitespace-nowrap text-kg-fg-faint @max-[34rem]:hidden">
                    {delivery.time}
                  </span>
                  <svg
                    className={cx(
                      "kg-webhook-log__chevron size-[1rem] text-kg-fg-faint transition-[rotate] duration-(--kg-duration-base) ease-kg-out",
                      expanded && "rotate-90",
                    )}
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m6 4 4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {!success && onRetry && (
                  <button
                    type="button"
                    className={cx(
                      "kg-webhook-log__retry h-kg-sm shrink-0 cursor-pointer rounded-full border-2 border-kg-ink bg-kg-surface px-2.5 text-kg-xs font-[560] text-kg-fg [font-family:inherit] shadow-kg-xs",
                      "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
                      "interactive:hover:-translate-px interactive:hover:shadow-kg-sm interactive:active:translate-x-[2px] interactive:active:translate-y-[2px] interactive:active:shadow-none",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                    )}
                    aria-label={`${t.retry} ${delivery.event}`}
                    onClick={() => onRetry(delivery.id)}
                  >
                    {t.retry}
                  </button>
                )}
              </div>
              <div
                id={panelId}
                className="kg-webhook-log__panel animate-[kg-webhook-open_var(--kg-duration-slow)_var(--kg-ease-out)] border-t border-kg-border bg-kg-surface-sunken"
                hidden={!expanded}
              >
                <div className="kg-webhook-log__panel-inner grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-3 p-3">
                  {delivery.payload != null && (
                    <figure className="kg-webhook-log__body m-0 grid min-w-0 gap-1.5">
                      <figcaption className={caption}>{t.request}</figcaption>
                      <pre className={pre}>{delivery.payload}</pre>
                    </figure>
                  )}
                  {delivery.response != null && (
                    <figure className="kg-webhook-log__body m-0 grid min-w-0 gap-1.5">
                      <figcaption className={caption}>{t.response}</figcaption>
                      <pre className={pre}>{delivery.response}</pre>
                    </figure>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    )
  },
)

WebhookLog.displayName = "WebhookLog"
