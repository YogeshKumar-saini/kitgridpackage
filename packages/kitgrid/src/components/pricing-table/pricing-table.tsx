"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { discountPercent, formatMoney } from "../../utils/money.js"
import { Button } from "../button/button.js"
import { PricingCard, type PricingCardFeature } from "../pricing-card/pricing-card.js"
import {
  type PricingToggleBilling,
  type PricingToggleLabels,
  PricingToggle,
} from "../pricing-toggle/pricing-toggle.js"

export interface PricingTablePlan {
  id: string
  name: ReactNode
  tagline?: ReactNode
  /** Price per month when billed monthly. `null` for custom-quoted tiers. */
  monthly: number | null
  /** Price per month when billed yearly. Defaults to `monthly`. */
  yearly?: number | null
  features?: readonly (PricingCardFeature | string)[]
  highlighted?: boolean
  badge?: ReactNode
  /** Button text. Defaults to `labels.cta`. */
  cta?: string
  customPrice?: ReactNode
}

export interface PricingTableLabels extends PricingToggleLabels {
  cta?: string
  period?: string
  /** Small print under a yearly price. Receives the formatted yearly total. */
  billedYearly?: (total: string) => string
}

export interface PricingTableProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onSelect"
> {
  plans: readonly PricingTablePlan[]
  billing?: PricingToggleBilling
  defaultBilling?: PricingToggleBilling
  onBillingChange?: (billing: PricingToggleBilling) => void
  onSelect?: (planId: string, billing: PricingToggleBilling) => void
  /** Hide the monthly / yearly switch, e.g. when every plan bills one way. */
  hideToggle?: boolean
  currency?: string
  locale?: string
  labels?: PricingTableLabels
}

const defaultLabels = {
  cta: "Get started",
  period: "/ mo",
  billedYearly: (total: string) => `Billed ${total} yearly`,
}

/** A row of plan cards driven by a monthly / yearly toggle that shows the best yearly saving. */
export const PricingTable = forwardRef<HTMLDivElement, PricingTableProps>(
  (
    {
      plans,
      billing: billingProp,
      defaultBilling = "monthly",
      onBillingChange,
      onSelect,
      hideToggle = false,
      currency = "USD",
      locale,
      labels,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const [billing, setBilling] = useControllableState<PricingToggleBilling>({
      value: billingProp,
      defaultValue: defaultBilling,
      onChange: onBillingChange,
    })
    const bestSaving = Math.max(
      0,
      ...plans.map((plan) =>
        plan.monthly && plan.yearly != null ? discountPercent(plan.yearly, plan.monthly) : 0,
      ),
    )
    const money = { currency, locale, trimZeros: true }

    return (
      <div
        ref={ref}
        className={cx("kg-pricing-table grid w-full justify-items-center gap-8", className)}
        data-billing={billing}
        style={style}
        {...props}
      >
        {!hideToggle && (
          <PricingToggle
            className="kg-pricing-table__toggle"
            value={billing}
            onValueChange={setBilling}
            savings={bestSaving > 0 ? `−${bestSaving}%` : undefined}
            labels={labels}
          />
        )}
        <div
          className={cx(
            "kg-pricing-table__grid grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] items-stretch gap-4",
            "[&>[data-highlighted]]:z-1 lg:[&>[data-highlighted]]:-translate-y-2",
          )}
        >
          {plans.map((plan) => {
            const price =
              billing === "yearly" && plan.yearly !== undefined ? plan.yearly : plan.monthly
            const note =
              billing === "yearly" && price !== null && price > 0
                ? text.billedYearly(formatMoney(price * 12, money))
                : undefined
            return (
              <PricingCard
                key={plan.id}
                name={plan.name}
                tagline={plan.tagline}
                price={price}
                customPrice={plan.customPrice}
                currency={currency}
                locale={locale}
                period={price !== null ? text.period : undefined}
                note={note}
                features={plan.features}
                highlighted={plan.highlighted}
                badge={plan.badge}
                action={
                  <Button
                    variant={plan.highlighted ? "solid" : "outline"}
                    fullWidth
                    onClick={() => onSelect?.(plan.id, billing)}
                  >
                    {plan.cta ?? text.cta}
                  </Button>
                }
              />
            )
          })}
        </div>
      </div>
    )
  },
)

PricingTable.displayName = "PricingTable"
