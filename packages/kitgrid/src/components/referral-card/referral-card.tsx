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
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"

export interface ReferralCardLabels {
  link?: string
  copy?: string
  copied?: string
  share?: string
}

export interface ReferralCardProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "onCopy"> {
  /** The shopper's personal referral URL. */
  link: string
  /** The offer, e.g. "Give $20, get $20". Rendered as the heading. */
  title: ReactNode
  /** One short line under the heading. */
  description?: ReactNode
  /** Text passed to the native share sheet. */
  shareText?: string
  /** Optional footer facts, e.g. friends joined and credit earned. */
  stats?: readonly { label: string; value: ReactNode }[]
  onCopy?: (link: string) => void
  labels?: ReferralCardLabels
}

const defaultLabels: Required<ReferralCardLabels> = {
  link: "Your referral link",
  copy: "Copy",
  copied: "Copied",
  share: "Share",
}

/** Give-and-get offer with a copyable personal link and the native share sheet where available. */
export const ReferralCard = forwardRef<HTMLElement, ReferralCardProps>(
  (
    { link, title, description, shareText, stats = [], onCopy, labels, className, ...props },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const inputRef = useRef<HTMLInputElement>(null)
    const [copied, setCopied] = useState(false)
    const [canShare, setCanShare] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

    // Read after mount so the server render and first client render match.
    useEffect(() => {
      setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function")
      return () => clearTimeout(timer.current)
    }, [])

    const copy = async () => {
      try {
        await navigator.clipboard.writeText(link)
      } catch {
        // Clipboard can be blocked; selecting the text still lets the shopper copy by hand.
        inputRef.current?.select()
        return
      }
      setCopied(true)
      onCopy?.(link)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1800)
    }

    const share = () => {
      void navigator.share?.({ url: link, text: shareText }).catch(() => {})
    }

    return (
      <section
        ref={ref}
        aria-labelledby={`${id}-title`}
        className={cx(
          "kg-referral-card relative isolate grid gap-3 overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-6 text-kg-fg shadow-kg-md",
          className,
        )}
        {...props}
      >
        <div
          className="kg-referral-card__art pointer-events-none absolute -end-4 -top-6 -z-1 flex"
          aria-hidden="true"
        >
          <span className="kg-referral-card__disc size-28 rounded-full border-2 border-kg-ink bg-kg-paper-sage" />
          <span className="kg-referral-card__disc -ms-11 size-28 rounded-full border-2 border-kg-ink bg-kg-paper-peach" />
        </div>
        <h2 id={`${id}-title`} className="kg-referral-card__title m-0 max-w-[16ch] text-[length:var(--kg-text-xl)] font-[750] leading-[1.15] tracking-[-0.02em]">
          {title}
        </h2>
        {description != null && (
          <p className="kg-referral-card__description m-0 text-kg-sm text-kg-fg-muted">{description}</p>
        )}
        <div className="kg-referral-card__link mt-1 flex items-center gap-1.5 rounded-[calc(var(--kg-radius-md)+var(--kg-space))] border-2 border-kg-ink bg-kg-surface-sunken p-1 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-kg-ring">
          <label htmlFor={`${id}-link`} className="kg-visually-hidden">
            {text.link}
          </label>
          <input
            ref={inputRef}
            id={`${id}-link`}
            className="kg-referral-card__input h-kg-sm min-w-0 flex-1 border-0 bg-transparent px-2 font-kg-mono text-kg-xs text-ellipsis text-kg-fg outline-none"
            value={link}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button
            size="sm"
            variant={copied ? "soft" : "solid"}
            onClick={() => void copy()}
            data-copied={copied || undefined}
          >
            {copied ? text.copied : text.copy}
          </Button>
          {canShare && (
            <Button size="sm" variant="outline" onClick={share}>
              {text.share}
            </Button>
          )}
        </div>
        {stats.length > 0 && (
          <dl className="kg-referral-card__stats mx-0 mt-1 mb-0 flex gap-6 border-t-2 border-kg-border pt-3">
            {stats.map((stat) => (
              <div key={stat.label} className="kg-referral-card__stat grid gap-0.5">
                <dt className="kg-referral-card__stat-label text-kg-xs text-kg-fg-muted">{stat.label}</dt>
                <dd className="kg-referral-card__stat-value m-0 text-kg-lg font-bold tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <span className="kg-visually-hidden" role="status">
          {copied ? text.copied : ""}
        </span>
      </section>
    )
  },
)

ReferralCard.displayName = "ReferralCard"
