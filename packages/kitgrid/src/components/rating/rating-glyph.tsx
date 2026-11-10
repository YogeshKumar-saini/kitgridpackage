import type { CSSProperties, ReactNode } from "react"
import { variants } from "../../utils/variants.js"

export type RatingSize = "sm" | "md" | "lg"

export interface RatingLabels {
  /** Accessible summary of the value, e.g. "4.6 out of 5 stars". */
  summary?: (value: string, max: number) => string
  /** Appended to the summary when `count` is set, e.g. "1,284 reviews". */
  reviews?: (count: number, formatted: string) => string
  /** Name of each choice in input mode, e.g. "4 stars". */
  option?: (value: number, max: number) => string
  /** Legend of the radio group in input mode. */
  group?: string
  /** Visible button that resets the value when `clearable`. */
  clear?: string
}

/*
 * Shared by display and input: --_size sets the star size, the root's mode and size pick it.
 * Stars are graphite by default (a rating is information, not a warning); --kg-rating-color
 * re-tones them per brand.
 */
export const ratingVariants = variants({
  base: [
    "kg-rating group/rating inline-flex items-center gap-1.5 align-middle leading-none text-kg-fg-muted",
    "[--_color:var(--kg-rating-color,var(--kg-fg))] [--_empty:color-mix(in_oklab,var(--kg-fg)_25%,transparent)] [--_gap:0.125em]",
  ],
  variants: {
    mode: {
      display: "",
      input: "m-0 min-w-0 border-0 p-0 [--_gap:0.0625em] disabled:opacity-50",
    },
    size: {
      sm: "text-kg-xs",
      md: "text-kg-sm",
      lg: "text-kg-base",
    },
  },
  compound: [
    { mode: "display", size: "sm", class: "[--_size:0.875rem]" },
    { mode: "display", size: "md", class: "[--_size:1.125rem]" },
    { mode: "display", size: "lg", class: "[--_size:1.5rem]" },
    { mode: "input", size: "sm", class: "[--_size:1.25rem]" },
    { mode: "input", size: "md", class: "[--_size:1.625rem]" },
    { mode: "input", size: "lg", class: "[--_size:2.125rem]" },
  ],
  defaults: { mode: "display", size: "md" },
})

export const starsClass = "kg-rating__stars inline-flex gap-(--_gap) text-(length:--_size)"

export const resolveRatingLabels = (
  labels: RatingLabels | undefined,
  locale: string | undefined,
): Required<RatingLabels> => {
  const plural = new Intl.PluralRules(locale)
  return {
    summary: (value, max) => `${value} out of ${max} stars`,
    reviews: (count, formatted) =>
      `${formatted} ${plural.select(count) === "one" ? "review" : "reviews"}`,
    option: (value) => `${value} ${value === 1 ? "star" : "stars"}`,
    group: "Rating",
    clear: "Clear",
    ...labels,
  }
}

export const DefaultStarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 2.1l2.59 6.94 7.4.32-5.81 4.6 1.99 7.14L12 17l-6.17 4.1 1.99-7.14-5.81-4.6 7.4-.32z" />
  </svg>
)

interface RatingGlyphProps {
  /** 0–1: how much of this glyph is filled. */
  fill: number
  icon?: ReactNode
  preview?: boolean
  children?: ReactNode
}

/** One star: an empty glyph with a filled copy clipped to `fill`, so fractions need no extra art. */
export const RatingGlyph = ({ fill, icon, preview, children }: RatingGlyphProps) => {
  const glyph = icon ?? <DefaultStarIcon />
  const percent = Math.round(fill * 1000) / 10
  return (
    <span
      className={[
        "kg-rating__glyph relative inline-grid size-[1em] shrink-0 rounded-kg-xs transition-[scale] duration-(--kg-duration-base) ease-kg-out [&_svg]:size-full",
        "group-data-[mode=input]/rating:size-[1.125em] group-data-[mode=input]/rating:p-[0.0625em]",
        "group-data-[mode=input]/rating:data-preview:scale-[1.14]",
        "group-data-[mode=input]/rating:has-[input:focus-visible]:outline-2 group-data-[mode=input]/rating:has-[input:focus-visible]:outline-offset-1 group-data-[mode=input]/rating:has-[input:focus-visible]:outline-kg-ring",
        "group-data-touched/rating:has-[input:checked]:animate-[kg-rating-pop_var(--kg-duration-slow)_var(--kg-ease-out)]",
      ].join(" ")}
      data-fill={fill >= 1 ? "full" : fill > 0 ? "partial" : "empty"}
      data-preview={preview || undefined}
      style={
        {
          "--_fill": `${percent}%`,
          "--_clip": `inset(0 ${100 - percent}% 0 0)`,
          "--_clip-rtl": `inset(0 0 0 ${100 - percent}%)`,
        } as CSSProperties
      }
    >
      <span className="kg-rating__empty grid text-(--_empty) [grid-area:1/1]" aria-hidden="true">
        {glyph}
      </span>
      <span
        className="kg-rating__filled grid text-(--_color) [grid-area:1/1] [clip-path:var(--_clip)] rtl:[clip-path:var(--_clip-rtl)] group-data-[mode=input]/rating:transition-[clip-path] group-data-[mode=input]/rating:duration-(--kg-duration-fast) group-data-[mode=input]/rating:ease-kg-out"
        aria-hidden="true"
      >
        {glyph}
      </span>
      {children}
    </span>
  )
}
