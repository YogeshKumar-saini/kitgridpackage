"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from "react"
import { useLocale } from "../../hooks/use-locale.js"
import { clamp, roundToStep } from "../../utils/math.js"
import {
  RatingGlyph,
  type RatingLabels,
  type RatingSize,
  ratingVariants,
  resolveRatingLabels,
  starsClass,
} from "./rating-glyph.js"
import { RatingInput } from "./rating-input.js"

export type { RatingLabels, RatingSize }

export interface RatingProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "defaultValue" | "onChange"
> {
  /** The rating. In display mode this is the average, e.g. 4.6. */
  value?: number
  /** Initial value for an uncontrolled input. */
  defaultValue?: number
  /** Turns the rating into an input (a radio group). */
  onValueChange?: (value: number) => void
  /** Render as an input without a change handler, e.g. an uncontrolled form field with `name`. */
  interactive?: boolean
  max?: number
  /**
   * Display mode: the fill is rounded to this step (default 0.1).
   * Input mode: 1 (whole stars, default) or 0.5 (half stars).
   */
  precision?: number
  size?: RatingSize
  /** Number of reviews, shown as "(1,284)" after the stars. */
  count?: number
  /** Turns the stars and count into a link, usually to the reviews section. */
  href?: string
  /** Show the numeric value next to the stars. */
  showValue?: boolean
  /** Replaces the star. It should paint with `currentColor`. */
  icon?: ReactNode
  /** Input mode: allow clearing back to 0 (click the chosen star, Delete, or the Clear button). */
  clearable?: boolean
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  name?: string
  /** Input mode: the group's accessible name (defaults to `labels.group`). */
  label?: string
  locale?: string
  labels?: RatingLabels
}

/**
 * Star rating. Without `onValueChange` it is a server-safe display; with it, a native radio group
 * with arrow-key selection and hover preview.
 */
export const Rating = forwardRef<HTMLElement, RatingProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      interactive = false,
      max = 5,
      precision,
      size = "md",
      count,
      href,
      showValue = false,
      icon,
      clearable = false,
      required,
      disabled,
      readOnly = false,
      name,
      label,
      locale,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const resolvedLocale = useLocale(locale)
    if (!readOnly && (onValueChange !== undefined || interactive)) {
      return (
        <RatingInput
          ref={ref as Ref<HTMLFieldSetElement>}
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          max={max}
          precision={precision === 0.5 ? 0.5 : 1}
          size={size}
          icon={icon}
          clearable={clearable}
          required={required}
          disabled={disabled}
          name={name}
          label={label}
          locale={locale}
          labels={labels}
          className={className}
          {...(props as Omit<
            HTMLAttributes<HTMLFieldSetElement>,
            "defaultValue" | "onChange"
          >)}
        />
      )
    }

    const text = resolveRatingLabels(labels, resolvedLocale)
    const current = clamp(value ?? defaultValue ?? 0, 0, max)
    const filled = roundToStep(current, precision ?? 0.1)
    const valueText = new Intl.NumberFormat(resolvedLocale, {
      maximumFractionDigits: 1,
    }).format(current)
    const countText =
      count === undefined ? undefined : new Intl.NumberFormat(resolvedLocale).format(count)
    const summary =
      text.summary(valueText, max) +
      (count === undefined || countText === undefined
        ? ""
        : `, ${text.reviews(count, countText)}`)

    const content = (
      <>
        <span className="kg-visually-hidden">{summary}</span>
        <span className={starsClass} aria-hidden="true">
          {Array.from({ length: max }, (_, index) => (
            <RatingGlyph key={index} fill={clamp(filled - index, 0, 1)} icon={icon} />
          ))}
        </span>
        {showValue && (
          <span className="kg-rating__value font-[650] text-kg-fg tabular-nums" aria-hidden="true">
            {valueText}
          </span>
        )}
        {countText !== undefined && (
          <span
            className="kg-rating__count tabular-nums group-hover/link:text-kg-fg group-hover/link:underline group-hover/link:underline-offset-[0.2em]"
            aria-hidden="true"
          >
            ({countText})
          </span>
        )}
      </>
    )

    return (
      <span
        ref={ref as Ref<HTMLSpanElement>}
        className={ratingVariants({ mode: "display", size, className })}
        data-mode="display"
        data-size={size}
        {...props}
      >
        {href ? (
          <a
            className="kg-rating__link group/link inline-flex items-center gap-[inherit] rounded-kg-xs text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
            href={href}
          >
            {content}
          </a>
        ) : (
          content
        )}
      </span>
    )
  },
)

Rating.displayName = "Rating"
