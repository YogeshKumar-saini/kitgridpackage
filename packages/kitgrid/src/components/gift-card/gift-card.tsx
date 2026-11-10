"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"
import { formatMoney } from "../../utils/money.js"

/*
 * Paper Layers: the card face is a solid sheet on an ink edge and offset. It lifts toward the
 * pointer on hover; the rings and chip are flat paper marks, scaled with the card (cqi).
 */
export const giftCardVariants = variants({
  base: [
    "kg-gift-card__face relative flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-kg-xl border-2 border-kg-ink px-[7cqi] py-[6cqi] shadow-kg-lg",
    "transition-[translate,box-shadow] duration-(--kg-duration-base) ease-kg-out group-hover/gift:-translate-1 group-hover/gift:shadow-[11px_11px_0_var(--kg-ink)]",
    "after:pointer-events-none after:absolute after:-end-[18cqi] after:-bottom-[30cqi] after:aspect-square after:w-[70cqi] after:rounded-full after:border-2 after:border-current/20",
    "before:pointer-events-none before:absolute before:-end-[26cqi] before:-bottom-[38cqi] before:aspect-square before:w-[86cqi] before:rounded-full before:border-2 before:border-current/20",
  ],
  variants: {
    finish: {
      accent: "bg-kg-accent text-kg-accent-fg",
      graphite: "bg-kg-fg text-kg-bg",
    },
  },
  defaults: { finish: "accent" },
})

export type GiftCardFinish = NonNullable<VariantProps<typeof giftCardVariants>["finish"]>

export interface GiftCardLabels {
  reveal?: string
  /** Read in place of the masked code. */
  hidden?: string
  copy?: string
  copied?: string
  balance?: string
}

export interface GiftCardProps extends HTMLAttributes<HTMLDivElement> {
  amount: number
  currency?: string
  locale?: string
  /** Store name or logo. */
  brand?: ReactNode
  /** Redemption code. Masked until revealed. */
  code?: string
  /** Show the code from the start. */
  defaultRevealed?: boolean
  /** e.g. "For Maya". */
  recipient?: ReactNode
  finish?: GiftCardFinish
  labels?: GiftCardLabels
}

const defaultLabels: Required<GiftCardLabels> = {
  reveal: "Show code",
  hidden: "Code hidden",
  copy: "Copy code",
  copied: "Code copied",
  balance: "Gift card balance",
}

const rowClass = "relative z-1 flex items-center justify-between gap-2"

const actionClass = cx(
  "kg-gift-card__action inline-grid size-7 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-inherit",
  "transition-[background-color] duration-(--kg-duration-fast) ease-kg-out hover:bg-current/15",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current [&_svg]:size-[0.95rem]",
  "data-copied:[&_svg]:animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-bounce)]",
)

const mask = (code: string) => code.replace(/[^\s-]/g, "•")

/** A physical-looking gift card with a masked code you can reveal and copy. */
export const GiftCard = forwardRef<HTMLDivElement, GiftCardProps>(
  (
    {
      amount,
      currency = "USD",
      locale,
      brand,
      code,
      defaultRevealed = false,
      recipient,
      finish = "accent",
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const [revealed, setRevealed] = useState(defaultRevealed)
    const [copied, setCopied] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
    useEffect(() => () => clearTimeout(timer.current), [])

    const copy = async () => {
      if (!code) return
      try {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1800)
      } catch {
        setRevealed(true)
      }
    }

    const formatted = formatMoney(amount, { currency, locale, trimZeros: true })

    return (
      <div
        ref={ref}
        className={cx("kg-gift-card group/gift @container w-84 max-w-full", className)}
        data-finish={finish}
        {...props}
      >
        <div className={giftCardVariants({ finish })}>
          <div className={cx("kg-gift-card__top", rowClass)}>
            <span className="kg-gift-card__brand text-[max(var(--kg-text-sm),5cqi)] font-bold tracking-[-0.02em]">{brand}</span>
            <span className="kg-gift-card__chip aspect-[1.3] w-[11cqi] rounded-[2cqi] border-2 border-kg-ink bg-kg-paper-butter" aria-hidden="true" />
          </div>
          <div className="kg-gift-card__amount relative z-1 text-[14cqi] font-bold leading-none tracking-[-0.04em] tabular-nums">
            <span className="kg-visually-hidden">{text.balance} </span>
            {formatted}
          </div>
          <div className={cx("kg-gift-card__bottom", rowClass)}>
            {recipient != null && <span className="kg-gift-card__recipient text-kg-xs font-semibold">{recipient}</span>}
            {code && (
              <span className="kg-gift-card__code ms-auto inline-flex items-center gap-0.5 rounded-full bg-current/12 py-0.5 ps-2.5 pe-0.5">
                <span className="kg-gift-card__digits me-1 font-kg-mono text-kg-xs font-semibold tracking-[0.06em]">
                  {revealed ? (
                    code
                  ) : (
                    <>
                      <span aria-hidden="true">{mask(code)}</span>
                      <span className="kg-visually-hidden">{text.hidden}</span>
                    </>
                  )}
                </span>
                <button
                  type="button"
                  className={actionClass}
                  aria-pressed={revealed}
                  aria-label={text.reveal}
                  onClick={() => setRevealed((value) => !value)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="2.8" />
                    {revealed && <path d="m4 4 16 16" strokeLinecap="round" />}
                  </svg>
                </button>
                <button
                  type="button"
                  className={actionClass}
                  aria-label={copied ? text.copied : text.copy}
                  data-copied={copied || undefined}
                  onClick={() => void copy()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {copied ? (
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    ) : (
                      <>
                        <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
                        <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
                      </>
                    )}
                  </svg>
                </button>
              </span>
            )}
          </div>
        </div>
        <span className="kg-visually-hidden" role="status">
          {copied ? text.copied : ""}
        </span>
      </div>
    )
  },
)

GiftCard.displayName = "GiftCard"
