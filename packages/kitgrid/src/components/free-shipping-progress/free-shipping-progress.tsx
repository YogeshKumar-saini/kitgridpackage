import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"
import { formatMoney } from "../../utils/money.js"

export type FreeShippingProgressSize = "sm" | "md"

export interface FreeShippingProgressLabels {
  /** Message while below the threshold; receives the formatted amount still to spend. */
  remaining?: (amount: string) => ReactNode
  /** Message once the threshold is reached. */
  unlocked?: ReactNode
  /** Accessible name of the progress bar. */
  progress?: string
  /** `aria-valuetext` of the progress bar. */
  valueText?: (remaining: string, unlocked: boolean) => string
}

export interface FreeShippingProgressProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** Cart subtotal that counts toward the threshold. */
  subtotal: number
  /** Amount at which shipping becomes free. */
  threshold: number
  currency?: string
  locale?: string
  /** Drop `.00` on whole amounts in the message. */
  trimZeros?: boolean
  size?: FreeShippingProgressSize
  labels?: FreeShippingProgressLabels
}

const defaultLabels: Required<FreeShippingProgressLabels> = {
  remaining: (amount) => (
    <>
      Add <strong>{amount}</strong> more for free shipping
    </>
  ),
  unlocked: "You've unlocked free shipping",
  progress: "Free shipping progress",
  valueText: (remaining, unlocked) =>
    unlocked ? "Free shipping unlocked" : `${remaining} away from free shipping`,
}

const TruckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3 6.5h10.5v9H3zM13.5 9.5h4l3 3.2v2.8h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
)

const UnlockedIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" opacity="0.16" />
    <path d="m8 12.3 2.7 2.7L16.2 9.4" />
  </svg>
)

/** Cart nudge toward a free-shipping threshold. Server-safe; the bar animates with CSS only. */
export const FreeShippingProgress = forwardRef<
  HTMLDivElement,
  FreeShippingProgressProps
>(
  (
    {
      subtotal,
      threshold,
      currency = "USD",
      locale,
      trimZeros = false,
      size = "md",
      labels,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const unlocked = threshold <= 0 || subtotal >= threshold
    const progress = unlocked ? 1 : clamp(subtotal / threshold, 0, 1)
    // Cents rounding first, so 49.99 + 0.01 float noise never prints "$0.00 more".
    const remaining = formatMoney(
      Math.max(0, Math.round((threshold - subtotal) * 100) / 100),
      {
        currency,
        locale,
        trimZeros,
      },
    )

    return (
      <div
        ref={ref}
        className={cx(
          "kg-free-shipping-progress grid gap-2.5 text-kg-sm text-kg-fg [--_track:0.75rem]",
          "data-[size=sm]:gap-2 data-[size=sm]:text-kg-xs data-[size=sm]:[--_track:0.5rem]",
          className,
        )}
        data-size={size}
        data-unlocked={unlocked || undefined}
        style={{ "--_progress": progress, ...style } as CSSProperties}
        {...props}
      >
        <p
          className="kg-free-shipping-progress__message m-0 flex items-center gap-2 leading-[1.35] [&_strong]:font-[650] [&_strong]:tabular-nums"
          aria-live="polite"
        >
          <span
            key={unlocked ? "unlocked" : "locked"}
            className={cx(
              "kg-free-shipping-progress__icon inline-grid size-[1.35em] shrink-0 [&_svg]:size-full",
              unlocked
                ? "animate-[kg-free-shipping-pop_var(--kg-duration-slower)_var(--kg-ease-out)] text-[color-mix(in_oklab,var(--kg-success),var(--kg-fg)_30%)]"
                : "animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)] text-kg-fg",
            )}
          >
            {unlocked ? <UnlockedIcon /> : <TruckIcon />}
          </span>
          <span>{unlocked ? text.unlocked : text.remaining(remaining)}</span>
        </p>
        <div
          className="kg-free-shipping-progress__track relative h-(--_track) overflow-hidden rounded-full border-2 border-kg-ink bg-kg-surface"
          role="progressbar"
          aria-label={text.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuetext={text.valueText(remaining, unlocked)}
        >
          <div
            className={cx(
              "kg-free-shipping-progress__fill absolute inset-0 origin-left scale-x-(--_progress) rtl:origin-right",
              "transition-[scale,background-color] duration-(--kg-duration-slower) ease-kg-out",
              unlocked ? "bg-kg-success" : "bg-kg-accent",
            )}
          />
        </div>
      </div>
    )
  },
)

FreeShippingProgress.displayName = "FreeShippingProgress"
