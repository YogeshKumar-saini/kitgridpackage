"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"
import { Price } from "../price/price.js"

export interface UpsellCardLabels {
  add?: string
  added?: string
  dismiss?: string
}

export interface UpsellCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  name: string
  image?: string
  href?: string
  price: number
  compareAt?: number
  currency?: string
  locale?: string
  /** A two or three word reason, e.g. "Pairs well". */
  reason?: ReactNode
  /** May return a promise; the button shows a spinner until it settles. */
  onAdd?: () => void | Promise<void>
  onDismiss?: () => void
  /** Controlled added state, e.g. from the cart. */
  added?: boolean
  labels?: UpsellCardLabels
}

const defaultLabels: Required<UpsellCardLabels> = {
  add: "Add",
  added: "Added",
  dismiss: "Not interested",
}

const nameClass =
  "kg-upsell-card__name truncate text-kg-sm font-semibold text-inherit no-underline"

/** A one-tap add-on offer for cart drawers and order summaries. */
export const UpsellCard = forwardRef<HTMLElement, UpsellCardProps>(
  (
    {
      name,
      image,
      href,
      price,
      compareAt,
      currency = "USD",
      locale,
      reason,
      onAdd,
      onDismiss,
      added: addedProp,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const [addedState, setAdded] = useState(false)
    const [busy, setBusy] = useState(false)
    const mounted = useRef(true)
    useEffect(
      () => () => {
        mounted.current = false
      },
      [],
    )
    const added = addedProp ?? addedState

    const add = async () => {
      if (busy || added) return
      setBusy(true)
      try {
        await onAdd?.()
        if (mounted.current) setAdded(true)
      } finally {
        if (mounted.current) setBusy(false)
      }
    }

    return (
      <article
        ref={ref}
        className={cx(
          "kg-upsell-card relative flex items-center gap-3 rounded-kg-lg border-2 border-kg-ink bg-kg-surface p-3 text-kg-fg shadow-kg-sm",
          "transition-[translate,box-shadow,background-color] duration-(--kg-duration-fast) ease-kg-out",
          "hover:-translate-0.5 hover:shadow-kg-md active:translate-0 active:shadow-kg-xs",
          "data-[state=added]:bg-kg-paper-sage",
          className,
        )}
        data-state={added ? "added" : "idle"}
        {...props}
      >
        <span
          className="kg-upsell-card__image size-14 shrink-0 overflow-hidden rounded-kg-md border-2 border-kg-ink bg-kg-muted data-placeholder:bg-kg-paper-sage [&>img]:size-full [&>img]:object-cover"
          data-placeholder={image ? undefined : ""}
        >
          {image && <img src={image} alt="" />}
        </span>
        <div className="kg-upsell-card__info grid min-w-0 flex-1 gap-px">
          {reason != null && <span className="kg-upsell-card__reason text-kg-xs font-semibold text-kg-accent-strong">{reason}</span>}
          {href ? (
            <a
              className={cx(
                nameClass,
                "rounded-kg-xs underline-offset-3 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
              )}
              href={href}
            >
              {name}
            </a>
          ) : (
            <span className={nameClass}>{name}</span>
          )}
          <Price
            amount={price}
            compareAt={compareAt}
            currency={currency}
            locale={locale}
            size="sm"
            savings={false}
          />
        </div>
        <Button
          size="sm"
          variant={added ? "soft" : "outline"}
          loading={busy}
          aria-label={added ? `${text.added}: ${name}` : `${text.add} ${name}`}
          leading={
            added ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
              </svg>
            )
          }
          onClick={() => void add()}
        >
          {added ? text.added : text.add}
        </Button>
        {onDismiss && !added && (
          <button
            type="button"
            className={cx(
              "kg-upsell-card__dismiss absolute -end-2 -top-2 grid size-6 cursor-pointer place-items-center rounded-full border-2 border-kg-ink bg-kg-surface p-0 text-kg-fg shadow-kg-xs",
              "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out hover:-translate-px hover:shadow-kg-sm active:translate-0 active:shadow-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring [&_svg]:size-3",
            )}
            aria-label={`${text.dismiss}: ${name}`}
            onClick={onDismiss}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M7 7l10 10M17 7 7 17" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <span className="kg-visually-hidden" role="status">
          {added ? `${name} ${text.added.toLowerCase()}` : ""}
        </span>
      </article>
    )
  },
)

UpsellCard.displayName = "UpsellCard"
