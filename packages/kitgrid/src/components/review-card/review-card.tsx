"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useState } from "react"
import { cx } from "../../utils/cx.js"
import { Rating } from "../rating/rating.js"

export interface ReviewCardLabels {
  verified?: string
  helpful?: (count: number) => string
  /** Accessible name of the helpful button. */
  helpfulAction?: string
}

export interface ReviewCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  author: string
  rating: number
  title?: ReactNode
  body: ReactNode
  /** Display date, e.g. "Oct 12". */
  date?: ReactNode
  dateTime?: string
  verified?: boolean
  /** Purchased option, e.g. "Sage / M". */
  variant?: ReactNode
  /** Customer photos. Decorative thumbnails with alt text. */
  photos?: readonly { src: string; alt: string }[]
  helpfulCount?: number
  /** Shows the helpful button. Called once per vote. */
  onHelpful?: () => void
  labels?: ReviewCardLabels
}


const defaultLabels: Required<ReviewCardLabels> = {
  verified: "Verified buyer",
  helpful: (count) => `Helpful (${count})`,
  helpfulAction: "Mark review as helpful",
}

const Check = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Thumb = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 2.8 1.9L13 9h5.5a2 2 0 0 1 2 2.4l-1.5 7A2 2 0 0 1 17 20H7" />
  </svg>
)

const helpfulClass = [
  "kg-review-card__helpful ms-auto inline-flex h-7 cursor-pointer items-center gap-[0.4em] rounded-full border-2 border-kg-ink bg-kg-surface px-[0.65rem]",
  "[font-family:inherit] text-kg-xs font-[550] text-kg-fg [&_svg]:size-[0.9rem]",
  "transition-[translate,box-shadow,background-color,color] duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:-translate-0.5 interactive:hover:shadow-kg-xs interactive:active:translate-0 interactive:active:shadow-none",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  "aria-pressed:cursor-default aria-pressed:bg-kg-accent aria-pressed:text-kg-accent-fg",
  "aria-pressed:[&_svg]:animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-bounce)] motion-reduce:[&_svg]:animate-none",
].join(" ")

/** A single customer review: stars, short title, body, purchase details and a helpful vote. */
export const ReviewCard = forwardRef<HTMLElement, ReviewCardProps>(
  (
    {
      author,
      rating,
      title,
      body,
      date,
      dateTime,
      verified = false,
      variant,
      photos = [],
      helpfulCount = 0,
      onHelpful,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const [voted, setVoted] = useState(false)
    const count = helpfulCount + (voted ? 1 : 0)
    return (
      <article ref={ref} className={cx(
          "kg-review-card grid gap-2.5 rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-5 text-kg-fg shadow-kg-sm",
          className,
        )} {...props}>
        <header className="kg-review-card__head flex items-center justify-between gap-2">
          <Rating value={rating} size="sm" />
          {date != null && (
            <time className="kg-review-card__date text-kg-xs text-kg-fg-muted" dateTime={dateTime}>
              {date}
            </time>
          )}
        </header>
        {title != null && <h3 className="kg-review-card__title m-0 text-kg-base font-[650]">{title}</h3>}
        <div className="kg-review-card__body text-kg-sm leading-[1.6] text-pretty text-kg-fg-muted [&_p]:m-0">{body}</div>
        {photos.length > 0 && (
          <ul className="kg-review-card__photos m-0 flex list-none gap-2 p-0">
            {photos.map((photo) => (
              <li key={photo.src} className="kg-review-card__photo">
                <img
                  className="kg-review-card__photo-img block size-14 rounded-kg-md border-2 border-kg-ink object-cover"
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        )}
        <footer className="kg-review-card__foot flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-kg-xs text-kg-fg-muted">
          <span className="kg-review-card__author text-kg-sm font-semibold text-kg-fg">{author}</span>
          {verified && (
            <span className="kg-review-card__verified inline-flex items-center gap-[0.3em] font-semibold text-kg-success [&_svg]:size-[0.8rem]">
              <Check />
              {text.verified}
            </span>
          )}
          {variant != null && <span className="kg-review-card__variant rounded-full bg-kg-paper-sage px-[0.55em] py-[0.15em] text-kg-fg">{variant}</span>}
          {onHelpful && (
            <button
              type="button"
              className={helpfulClass}
              aria-pressed={voted}
              aria-label={`${text.helpfulAction}, ${count}`}
              disabled={voted}
              onClick={() => {
                setVoted(true)
                onHelpful()
              }}
            >
              <Thumb />
              {text.helpful(count)}
            </button>
          )}
        </footer>
      </article>
    )
  },
)

ReviewCard.displayName = "ReviewCard"
