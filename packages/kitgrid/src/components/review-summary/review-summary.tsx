"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useRef,
  useState,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useLocale } from "../../hooks/use-locale.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"
import { Rating } from "../rating/rating.js"

/** Star value → number of reviews, e.g. `{ 5: 812, 4: 301, 3: 96, 2: 41, 1: 34 }`. */
export type ReviewSummaryDistribution = Readonly<Partial<Record<number, number>>>

export interface ReviewSummaryLabels {
  heading?: string
  /** Under the average, e.g. "Based on 1,284 reviews". */
  basedOn?: (count: number, formatted: string) => string
  /** Accessible name of a distribution row. */
  row?: (stars: number, count: string, percent: string) => string
  writeReview?: ReactNode
  /** Shown while a star filter is active. */
  clear?: ReactNode
}

export interface ReviewSummaryProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "onChange"
> {
  average: number
  /** Total reviews. Defaults to the sum of `distribution`. */
  count?: number
  distribution: ReviewSummaryDistribution
  max?: number
  /** Makes each row a toggle that filters reviews by its star value; `null` clears. */
  onFilter?: (stars: number | null) => void
  /** The active star filter, which marks its row pressed. */
  filter?: number | null
  /** Shows a "Write a review" button. */
  onWriteReview?: () => void
  locale?: string
  labels?: ReviewSummaryLabels
}

const defaultLabels: Required<ReviewSummaryLabels> = {
  heading: "Customer reviews",
  basedOn: (count, formatted) =>
    count === 1 ? "Based on 1 review" : `Based on ${formatted} reviews`,
  row: (stars, count, percent) =>
    `${stars} ${stars === 1 ? "star" : "stars"}: ${count} reviews, ${percent}`,
  writeReview: "Write a review",
  clear: "Show all reviews",
}

const rowClass =
  "kg-review-summary__row grid w-full grid-cols-[2.5rem_minmax(0,1fr)_3rem] items-center gap-3 rounded-kg-md border-0 bg-transparent px-2 py-1.5 text-start font-[inherit] text-kg-sm text-inherit"

/** Average, total and a 5→1 star distribution whose rows can filter the review list. */
export const ReviewSummary = forwardRef<HTMLElement, ReviewSummaryProps>(
  (
    {
      average,
      count: countProp,
      distribution,
      max = 5,
      onFilter,
      filter = null,
      onWriteReview,
      locale: localeProp,
      labels,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const locale = useLocale(localeProp)
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const inView = useInView(local, { once: true, amount: 0.3 })
    // Bars render full on the server; they only start empty when mounted below the fold.
    const [armed, setArmed] = useState(false)
    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (!node || typeof IntersectionObserver === "undefined") return
      if (node.getBoundingClientRect().top > window.innerHeight) setArmed(true)
    }, [])
    const held = armed && !inView

    const stars = Array.from({ length: max }, (_, index) => max - index)
    const total =
      countProp ?? stars.reduce((sum, value) => sum + (distribution[value] ?? 0), 0)
    const number = new Intl.NumberFormat(locale)
    const percentFormat = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 0,
    })
    const averageText = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(average)

    return (
      <section
        ref={ref}
        className={cx("kg-review-summary @container text-kg-fg", className)}
        data-armed={held ? "" : undefined}
        {...props}
      >
        <div className="kg-review-summary__layout grid gap-x-10 gap-y-6 @min-[32rem]:grid-cols-[auto_minmax(0,1fr)]">
          <div className="kg-review-summary__overview grid content-start justify-items-start gap-2">
            <h2 className="kg-review-summary__heading m-0 text-kg-sm font-semibold tracking-[0.06em] text-kg-fg-muted uppercase">
              {text.heading}
            </h2>
            <p className="kg-review-summary__average m-0 text-[length:var(--kg-text-5xl,3rem)] leading-none font-bold tracking-[-0.04em] tabular-nums">
              <span aria-hidden="true">{averageText}</span>
            </p>
            <Rating value={average} max={max} size="md" locale={locale} />
            <p className="kg-review-summary__count m-0 text-kg-sm text-kg-fg-muted">
              {text.basedOn(total, number.format(total))}
            </p>
            {onWriteReview && (
              <Button className="mt-3" variant="outline" onClick={onWriteReview}>
                {text.writeReview}
              </Button>
            )}
          </div>
          <ul className="kg-review-summary__bars m-0 grid list-none content-start gap-1 p-0">
            {stars.map((value, index) => {
              const reviews = distribution[value] ?? 0
              const share = total > 0 ? reviews / total : 0
              const percent = percentFormat.format(share)
              const name = text.row(value, number.format(reviews), percent)
              const content = (
                <>
                  <span
                    className="kg-review-summary__stars inline-flex items-center gap-1 font-semibold tabular-nums [&>svg]:size-3.5 [&>svg]:text-[var(--kg-rating-color,var(--kg-fg))]"
                    aria-hidden="true"
                  >
                    {value}
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                    </svg>
                  </span>
                  <span
                    className="kg-review-summary__track relative h-2.5 overflow-hidden rounded-full border-[1.5px] border-kg-ink bg-kg-surface"
                    aria-hidden="true"
                  >
                    <span
                      className={cx(
                        "absolute inset-0 origin-left bg-[var(--kg-rating-color,var(--kg-ink))] rtl:origin-right",
                        held
                          ? "scale-x-0 transition-none"
                          : "scale-x-(--_share) transition-[scale] duration-(--kg-duration-bounce) ease-kg-out delay-(--_delay) motion-reduce:delay-0",
                      )}
                      style={
                        {
                          "--_share": share,
                          "--_index": index,
                          "--_delay": `${index * 70}ms`,
                        } as CSSProperties
                      }
                    />
                  </span>
                  <span className="kg-review-summary__amount text-end text-kg-fg-muted tabular-nums" aria-hidden="true">
                    {percent}
                  </span>
                </>
              )
              return (
                <li key={value}>
                  {onFilter ? (
                    <button
                      type="button"
                      className={cx(
                        rowClass,
                        "cursor-pointer transition-[background-color] duration-(--kg-duration-fast) ease-kg-out interactive:hover:bg-kg-muted",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring disabled:cursor-default disabled:opacity-50",
                        "aria-pressed:bg-kg-paper-sage aria-pressed:shadow-[inset_0_0_0_2px_var(--kg-ink)] interactive:aria-pressed:hover:bg-kg-paper-sage",
                      )}
                      aria-label={name}
                      aria-pressed={filter === value}
                      disabled={reviews === 0}
                      onClick={() => onFilter(filter === value ? null : value)}
                    >
                      {content}
                    </button>
                  ) : (
                    <div
                      className={rowClass}
                      role="img"
                      aria-label={name}
                    >
                      {content}
                    </div>
                  )}
                </li>
              )
            })}
            {onFilter && filter !== null && (
              <li>
                <button
                  type="button"
                  className="kg-review-summary__clear mt-1 cursor-pointer rounded-kg-sm border-0 bg-transparent px-2 py-1 font-[inherit] text-kg-sm font-[550] text-kg-fg underline underline-offset-[0.2em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
                  onClick={() => onFilter(null)}
                >
                  {text.clear}
                </button>
              </li>
            )}
          </ul>
        </div>
      </section>
    )
  },
)

ReviewSummary.displayName = "ReviewSummary"
