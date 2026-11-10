"use client"

import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { useLocale } from "../../hooks/use-locale.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: the bar is an ink-edged track with an ink fill and paper tier markers; the ring
 * is the same meter drawn as an arc. --_fill (0–1) is set inline and eased with the spring token.
 */
export const loyaltyMeterVariants = variants({
  base: "kg-loyalty-meter grid gap-3 text-kg-fg",
  variants: {
    variant: {
      bar: "",
      ring: "justify-items-center text-center",
    },
  },
  defaults: { variant: "bar" },
})

export interface LoyaltyMeterTier {
  name: string
  /** Points needed to reach this tier. The first tier is usually 0. */
  threshold: number
}

export type LoyaltyMeterVariant = NonNullable<VariantProps<typeof loyaltyMeterVariants>["variant"]>

export interface LoyaltyMeterLabels {
  points?: (points: string) => string
  toNext?: (points: string, tier: string) => string
  top?: (tier: string) => string
}

export interface LoyaltyMeterProps extends HTMLAttributes<HTMLDivElement> {
  points: number
  /** Ascending by threshold. */
  tiers: readonly LoyaltyMeterTier[]
  variant?: LoyaltyMeterVariant
  locale?: string
  /** Shown next to the tier name, e.g. a perk. */
  aside?: ReactNode
  labels?: LoyaltyMeterLabels
}

const defaultLabels: Required<LoyaltyMeterLabels> = {
  points: (points) => `${points} pts`,
  toNext: (points, tier) => `${points} pts to ${tier}`,
  top: (tier) => `Top tier: ${tier}`,
}

const markerEdge = {
  start: "translate-x-0",
  middle: "-translate-x-1/2",
  end: "-translate-x-full",
} as const

const labelEdge = {
  start: "left-0",
  middle: "left-1/2 -translate-x-1/2",
  end: "right-0",
} as const

/** Reward points with the current tier, markers for every tier and the gap to the next one. */
export const LoyaltyMeter = forwardRef<HTMLDivElement, LoyaltyMeterProps>(
  (
    { points, tiers, variant = "bar", locale: localeProp, aside, labels, className, style, ...props },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const locale = useLocale(localeProp)
    const number = new Intl.NumberFormat(locale)
    const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold)
    let currentIndex = 0
    sorted.forEach((tier, index) => {
      if (points >= tier.threshold) currentIndex = index
    })
    const currentTier = sorted[currentIndex]
    const nextTier = sorted[currentIndex + 1]
    const max = sorted[sorted.length - 1]?.threshold ?? points
    const fill = max > 0 ? Math.min(1, Math.max(0, points / max)) : 1
    const status = nextTier
      ? text.toNext(number.format(nextTier.threshold - points), nextTier.name)
      : text.top(currentTier?.name ?? "")
    const valueText = `${text.points(number.format(points))}, ${currentTier?.name ?? ""}. ${status}`

    const meter = {
      role: "meter",
      "aria-valuemin": 0,
      "aria-valuemax": max,
      "aria-valuenow": Math.min(points, max),
      "aria-valuetext": valueText,
      "aria-label": currentTier?.name,
    } as const

    return (
      <div
        ref={ref}
        className={loyaltyMeterVariants({ variant, className })}
        data-variant={variant}
        style={{ ...style, "--_fill": fill } as CSSProperties}
        {...props}
      >
        {variant === "ring" ? (
          <div className="kg-loyalty-meter__ring relative grid size-36 place-items-center" {...meter}>
            <svg
              className="kg-loyalty-meter__ring-svg absolute inset-0 size-full -rotate-90"
              viewBox="0 0 120 120"
              aria-hidden="true"
            >
              <circle
                className="kg-loyalty-meter__ring-track fill-none stroke-kg-surface-sunken [stroke-width:9]"
                cx="60"
                cy="60"
                r="52"
                pathLength={100}
              />
              <circle
                className="kg-loyalty-meter__ring-fill fill-none stroke-kg-accent [stroke-linecap:round] [stroke-width:9] [stroke-dasharray:calc(var(--_fill)*100)_100] transition-[stroke-dasharray] duration-[var(--kg-duration-spring)] ease-kg-spring"
                cx="60"
                cy="60"
                r="52"
                pathLength={100}
              />
            </svg>
            <span className="kg-loyalty-meter__ring-center relative grid gap-0.5" aria-hidden="true">
              <span className="kg-loyalty-meter__points text-[length:var(--kg-text-2xl)] font-bold leading-none tracking-[-0.02em] text-kg-fg tabular-nums">
                {number.format(points)}
              </span>
              <span className="kg-loyalty-meter__tier text-kg-xs font-semibold uppercase tracking-[0.06em] text-kg-accent-strong">
                {currentTier?.name}
              </span>
            </span>
          </div>
        ) : (
          <>
            <div className="kg-loyalty-meter__head flex items-baseline justify-between gap-2" aria-hidden="true">
              <span className="kg-loyalty-meter__tier text-kg-md font-bold tracking-[-0.01em]">
                {currentTier?.name}
              </span>
              <span className="kg-loyalty-meter__points text-kg-sm font-semibold text-kg-fg-muted tabular-nums">
                {text.points(number.format(points))}
              </span>
            </div>
            <div
              className="kg-loyalty-meter__track relative mt-1 mb-7 h-3 rounded-full border-2 border-kg-ink bg-kg-surface-sunken"
              {...meter}
            >
              <span className="kg-loyalty-meter__fill absolute inset-0 origin-left scale-x-(--_fill) rounded-[inherit] bg-kg-accent transition-[scale] duration-[var(--kg-duration-spring)] ease-kg-spring" />
              {sorted.map((tier, index) => {
                const reached = index <= currentIndex
                const edge =
                  index === 0 ? "start" : index === sorted.length - 1 ? "end" : undefined
                return (
                  <span
                    key={tier.name}
                    className={`kg-loyalty-meter__marker absolute top-1/2 left-[calc(var(--_at)*100%)] size-4 -translate-y-1/2 rounded-full border-2 border-kg-ink ${
                      markerEdge[edge ?? "middle"]
                    } ${reached ? "bg-kg-accent" : "bg-kg-surface"}`}
                    data-reached={reached || undefined}
                    data-edge={edge}
                    style={{ "--_at": max > 0 ? tier.threshold / max : 0 } as CSSProperties}
                    aria-hidden="true"
                  >
                    <span
                      className={`kg-loyalty-meter__marker-label absolute top-[calc(100%+0.4rem)] whitespace-nowrap text-kg-xs ${
                        labelEdge[edge ?? "middle"]
                      } ${reached ? "font-semibold text-kg-fg" : "font-medium text-kg-fg-muted"}`}
                    >
                      {tier.name}
                    </span>
                  </span>
                )
              })}
            </div>
          </>
        )}
        <div
          className={`kg-loyalty-meter__foot flex flex-wrap gap-2 text-kg-sm text-kg-fg-muted ${
            variant === "ring" ? "justify-center" : "justify-between"
          }`}
          aria-hidden="true"
        >
          <span className="kg-loyalty-meter__status">{status}</span>
          {aside != null && (
            <span className="kg-loyalty-meter__aside font-semibold text-kg-accent-strong">{aside}</span>
          )}
        </div>
      </div>
    )
  },
)

LoyaltyMeter.displayName = "LoyaltyMeter"
