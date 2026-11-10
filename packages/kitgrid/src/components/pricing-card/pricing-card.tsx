import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { getMoneyFormatter } from "../../utils/money.js"
import { variants } from "../../utils/variants.js"

export interface PricingCardFeature {
  label: ReactNode
  /** Defaults to true. Excluded features are dimmed and announced as not included. */
  included?: boolean
}

export interface PricingCardLabels {
  included?: string
  excluded?: string
}

export interface PricingCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  name: ReactNode
  /** Per-period amount. `null` renders `customPrice` instead, for "Contact us" tiers. */
  price: number | null
  currency?: string
  locale?: string
  /** Shown after the price, e.g. "/ mo". */
  period?: ReactNode
  /** One short line under the name. */
  tagline?: ReactNode
  /** Small print under the price, e.g. "Billed $228 yearly". */
  note?: ReactNode
  customPrice?: ReactNode
  features?: readonly (PricingCardFeature | string)[]
  /** Usually a Button. */
  action?: ReactNode
  /** Lifts the card on a deeper ink offset and shows `badge`. */
  highlighted?: boolean
  badge?: ReactNode
  /** Heading level of the plan name. */
  headingLevel?: 2 | 3 | 4
  labels?: PricingCardLabels
}

const defaultLabels: Required<PricingCardLabels> = {
  included: "Included",
  excluded: "Not included",
}

const Check = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Dash = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M4.5 8h7" strokeLinecap="round" />
  </svg>
)

/*
 * Paper Layers: a tier is a white sheet with an ink edge. The highlighted tier sits on a deeper
 * offset, and its marks fill with ink.
 */
export const pricingCardVariants = variants({
  base: [
    "kg-pricing-card relative flex flex-col gap-4 rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-6 text-kg-fg",
  ],
  variants: {
    highlighted: {
      true: "shadow-kg-lg [--_mark:var(--kg-accent)] [--_mark-fg:var(--kg-accent-fg)]",
      false: "shadow-kg-sm [--_mark:var(--kg-paper-sage)] [--_mark-fg:var(--kg-fg)]",
    },
  },
  defaults: { highlighted: false },
})

/** One marketing pricing tier: name, big price, call to action and feature list. */
export const PricingCard = forwardRef<HTMLElement, PricingCardProps>(
  (
    {
      name,
      price,
      currency = "USD",
      locale,
      period,
      tagline,
      note,
      customPrice,
      features = [],
      action,
      highlighted = false,
      badge,
      headingLevel = 3,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const Heading = `h${headingLevel}` as const
    const parts =
      price === null
        ? null
        : getMoneyFormatter({ currency, locale, trimZeros: true }).formatToParts(price)
    return (
      <article
        ref={ref}
        className={pricingCardVariants({ highlighted, className })}
        data-highlighted={highlighted || undefined}
        {...props}
      >
        <header className="kg-pricing-card__head grid gap-1">
          <div className="kg-pricing-card__title-row flex items-center justify-between gap-2">
            <Heading className="kg-pricing-card__name m-0 text-kg-md font-semibold leading-[1.3] text-kg-fg">{name}</Heading>
            {highlighted && badge != null && (
              <span className="kg-pricing-card__badge inline-flex h-6 items-center rounded-full border-2 border-kg-ink bg-kg-paper-butter px-2.5 text-kg-xs font-semibold leading-none whitespace-nowrap text-kg-fg">{badge}</span>
            )}
          </div>
          {tagline != null && <p className="kg-pricing-card__tagline m-0 text-kg-sm text-kg-fg-muted">{tagline}</p>}
        </header>
        <div className="kg-pricing-card__price flex items-baseline gap-1.5">
          {parts ? (
            <>
              <span className="kg-pricing-card__amount kg-tabular text-[length:var(--kg-text-4xl)] font-bold leading-none tracking-[-0.03em] tabular-nums">
                {parts.map((part, index) =>
                  part.type === "currency" ? (
                    <span
                      key={index}
                      className="kg-pricing-card__currency me-[0.08em] align-[0.7em] text-[0.5em] font-semibold text-kg-fg-muted"
                    >
                      {part.value}
                    </span>
                  ) : (
                    part.value
                  ),
                )}
              </span>
              {period != null && (
                <span className="kg-pricing-card__period text-kg-sm text-kg-fg-muted">{period}</span>
              )}
            </>
          ) : (
            <span className="kg-pricing-card__amount text-[length:var(--kg-text-4xl)] font-bold leading-none tracking-[-0.03em]">
              {customPrice}
            </span>
          )}
        </div>
        {note != null && <p className="kg-pricing-card__note m-0 text-kg-sm text-kg-fg-muted">{note}</p>}
        {action != null && <div className="kg-pricing-card__action grid">{action}</div>}
        {features.length > 0 && (
          <ul className="kg-pricing-card__features m-0 grid list-none gap-2.5 border-t-2 border-kg-ink px-0 pt-4 pb-0 text-kg-sm">
            {features.map((feature, index) => {
              const item = typeof feature === "string" ? { label: feature } : feature
              const included = item.included !== false
              return (
                <li
                  key={index}
                  className="kg-pricing-card__feature flex items-start gap-2.5 data-[included=false]:text-kg-fg-faint"
                  data-included={included}
                >
                  <span className="kg-pricing-card__mark mt-px inline-grid size-[1.15rem] shrink-0 place-items-center rounded-full bg-(--_mark) text-(--_mark-fg) in-data-[included=false]:bg-kg-muted in-data-[included=false]:text-kg-fg-faint [&_svg]:size-3">
                    {included ? <Check /> : <Dash />}
                  </span>
                  <span className="kg-visually-hidden">
                    {included ? text.included : text.excluded}:{" "}
                  </span>
                  <span className="kg-pricing-card__label">{item.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </article>
    )
  },
)

PricingCard.displayName = "PricingCard"
