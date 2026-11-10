"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId, useState } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"

export interface IntegrationCardLabels {
  connect?: string
  disconnect?: string
  connected?: string
}

export interface IntegrationCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  name: string
  /** The service logo. Decorative: the name is the label. */
  logo?: ReactNode
  /** One short line. */
  description?: ReactNode
  /** e.g. "Warehouse". */
  category?: ReactNode
  connected?: boolean
  defaultConnected?: boolean
  onConnectedChange?: (connected: boolean) => void
  /** Runs before the state flips; the button shows a spinner while it resolves. */
  onConnect?: () => void | Promise<void>
  onDisconnect?: () => void | Promise<void>
  /** Shown when connected, e.g. "Synced 4m ago". */
  status?: ReactNode
  labels?: IntegrationCardLabels
}

const words: Required<IntegrationCardLabels> = {
  connect: "Connect",
  disconnect: "Disconnect",
  connected: "Connected",
}

/** One integration in a directory: logo, name, a line of copy and a connect toggle. */
export const IntegrationCard = forwardRef<HTMLElement, IntegrationCardProps>(
  (
    {
      name,
      logo,
      description,
      category,
      connected: connectedProp,
      defaultConnected = false,
      onConnectedChange,
      onConnect,
      onDisconnect,
      status,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const t = { ...words, ...labels }
    const nameId = useId()
    const [connected, setConnected] = useControllableState({
      value: connectedProp,
      defaultValue: defaultConnected,
      onChange: onConnectedChange,
    })
    const [busy, setBusy] = useState(false)

    const toggle = async () => {
      setBusy(true)
      try {
        await (connected ? onDisconnect?.() : onConnect?.())
        setConnected(!connected)
      } finally {
        setBusy(false)
      }
    }

    return (
      <article
        ref={ref}
        aria-labelledby={nameId}
        className={cx(
          "kg-integration-card relative flex min-w-0 flex-col gap-1.5 p-4",
          "rounded-kg-xl border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-sm",
          className,
        )}
        data-connected={connected || undefined}
        {...props}
      >
        <div className="kg-integration-card__head mb-1.5 flex items-start justify-between gap-2">
          <span
            className={cx(
              "kg-integration-card__logo grid size-10 place-items-center rounded-kg-lg border-2 border-kg-ink shadow-kg-xs",
              "text-kg-md font-bold text-kg-fg transition-colors duration-(--kg-duration-base) ease-kg-out",
              "[&_img]:size-5.5 [&_svg]:size-5.5",
              connected ? "bg-kg-paper-sage" : "bg-kg-surface",
            )}
            aria-hidden="true"
          >
            {logo ?? name.trim()[0]}
          </span>
          {category != null && <span className="kg-integration-card__category rounded-full bg-kg-paper-sky px-2 text-[0.6875rem] leading-5 font-medium text-kg-fg">{category}</span>}
        </div>
        <h3 id={nameId} className="kg-integration-card__name m-0 text-kg-sm font-semibold text-kg-fg">
          {name}
        </h3>
        {description != null && <p className="kg-integration-card__description m-0 text-kg-xs leading-normal text-kg-fg-muted">{description}</p>}
        <div className="kg-integration-card__foot mt-auto flex items-center justify-between gap-2 pt-3">
          {connected ? (
            <span className="kg-integration-card__status inline-flex items-center gap-1.5 text-kg-xs font-medium text-kg-fg-muted animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)] motion-reduce:animate-none">
              <span className="kg-integration-card__dot size-[0.4375rem] rounded-full bg-kg-success" aria-hidden="true" />
              {status ?? t.connected}
            </span>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            variant={connected ? "ghost" : "outline"}
            loading={busy}
            aria-label={`${connected ? t.disconnect : t.connect} ${name}`}
            onClick={() => void toggle()}
          >
            {connected ? t.disconnect : t.connect}
          </Button>
        </div>
      </article>
    )
  },
)

IntegrationCard.displayName = "IntegrationCard"
