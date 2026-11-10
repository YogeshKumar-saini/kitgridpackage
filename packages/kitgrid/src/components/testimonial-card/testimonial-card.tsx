import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: `card` is a white sheet on an ink offset; `quote` drops the sheet and sets the
 * quote larger, for hero sections.
 */
export const testimonialCardVariants = variants({
  base: "kg-testimonial-card relative m-0 flex flex-col gap-4 text-kg-fg",
  variants: {
    variant: {
      card: "overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-6 shadow-kg-md",
      quote: "p-0",
    },
  },
  defaults: { variant: "card" },
})

export type TestimonialCardVariant = NonNullable<
  VariantProps<typeof testimonialCardVariants>["variant"]
>

export interface TestimonialCardProps extends HTMLAttributes<HTMLElement> {
  quote: ReactNode
  author: string
  /** Role and company, e.g. "Head of Ops, Loom". */
  byline?: ReactNode
  /** Avatar image URL. Initials are shown without one. */
  avatar?: string
  /** 1 to 5, shown as stars above the quote. */
  rating?: number
  /** Company mark shown in the footer. Decorative. */
  logo?: ReactNode
  /** `quote` drops the surface and sets the quote larger, for hero sections. */
  variant?: TestimonialCardVariant
  ratingLabel?: (rating: number) => string
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

const Star = () => (
  <svg className="block size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10 1.8 12.5 7l5.7.6-4.3 3.9 1.2 5.6L10 14.3l-5.1 2.8 1.2-5.6L1.8 7.6 7.5 7z" />
  </svg>
)

/** A customer quote with attribution, optional stars and company mark. */
export const TestimonialCard = forwardRef<HTMLElement, TestimonialCardProps>(
  (
    {
      quote,
      author,
      byline,
      avatar,
      rating,
      logo,
      variant = "card",
      ratingLabel = (value) => `Rated ${value} out of 5`,
      className,
      ...props
    },
    ref,
  ) => {
    const stars = rating === undefined ? 0 : Math.max(0, Math.min(5, Math.round(rating)))
    return (
      <figure
        ref={ref}
        className={testimonialCardVariants({ variant, className })}
        data-variant={variant}
        {...props}
      >
        {rating !== undefined && (
          <div
            className="kg-testimonial-card__stars flex gap-0.5"
            role="img"
            aria-label={ratingLabel(stars)}
          >
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                className={`kg-testimonial-card__star ${
                  index < stars ? "text-kg-ink" : "text-kg-border"
                }`}
                data-on={index < stars || undefined}
              >
                <Star />
              </span>
            ))}
          </div>
        )}
        <blockquote
          className={`kg-testimonial-card__quote relative z-1 m-0 leading-[1.55] text-pretty ${
            variant === "quote"
              ? "text-[length:var(--kg-text-xl)] font-[550] tracking-[-0.01em]"
              : "text-kg-md"
          }`}
        >
          {quote}
        </blockquote>
        <figcaption className="kg-testimonial-card__author mt-auto flex items-center gap-3">
          <span
            className="kg-testimonial-card__avatar inline-grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-kg-ink bg-kg-paper-peach text-kg-sm font-[650] text-kg-fg"
            aria-hidden="true"
          >
            {avatar ? (
              <img className="kg-testimonial-card__avatar-img size-full object-cover" src={avatar} alt="" />
            ) : (
              initials(author)
            )}
          </span>
          <span className="kg-testimonial-card__who grid min-w-0">
            <span className="kg-testimonial-card__name text-kg-sm font-[650]">{author}</span>
            {byline != null && (
              <span className="kg-testimonial-card__byline text-kg-sm text-kg-fg-muted">{byline}</span>
            )}
          </span>
          {logo != null && (
            <span
              className="kg-testimonial-card__logo ms-auto inline-flex text-kg-fg-muted [&_svg]:h-5 [&_svg]:w-auto"
              aria-hidden="true"
            >
              {logo}
            </span>
          )}
        </figcaption>
      </figure>
    )
  },
)

TestimonialCard.displayName = "TestimonialCard"
