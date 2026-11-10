"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import {
  SegmentedControl,
  type SegmentedControlSize,
} from "../segmented-control/segmented-control.js"

export type PricingToggleBilling = "monthly" | "yearly"

export interface PricingToggleLabels {
  /** Accessible name of the group. */
  group?: string
  monthly?: string
  yearly?: string
}

export interface PricingToggleProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  value?: PricingToggleBilling
  defaultValue?: PricingToggleBilling
  onValueChange?: (value: PricingToggleBilling) => void
  /** Shown beside the yearly option, e.g. "−20%". Part of its accessible name. */
  savings?: ReactNode
  size?: SegmentedControlSize
  labels?: PricingToggleLabels
}

const defaultLabels: Required<PricingToggleLabels> = {
  group: "Billing period",
  monthly: "Monthly",
  yearly: "Yearly",
}

/** Monthly / yearly billing switch with a savings tag on the yearly option. */
export const PricingToggle = forwardRef<HTMLDivElement, PricingToggleProps>(
  (
    {
      value: valueProp,
      defaultValue = "monthly",
      onValueChange,
      savings,
      size = "md",
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const [value, setValue] = useControllableState<PricingToggleBilling>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    return (
      <div
        ref={ref}
        className={cx("kg-pricing-toggle inline-flex", className)}
        data-value={value}
        {...props}
      >
        <SegmentedControl<PricingToggleBilling>
          aria-label={text.group}
          variant="pill"
          size={size}
          value={value}
          onValueChange={setValue}
          options={[
            { value: "monthly", label: text.monthly },
            {
              value: "yearly",
              label: (
                <span className="kg-pricing-toggle__yearly inline-flex items-center gap-1.5">
                  {text.yearly}
                  {savings != null && (
                    <span className="kg-pricing-toggle__savings py-[0.1em] px-[0.5em] rounded-full bg-kg-paper-sage text-kg-xs font-[650] leading-[1.4] text-kg-fg">{savings}</span>
                  )}
                </span>
              ),
            },
          ]}
        />
      </div>
    )
  },
)

PricingToggle.displayName = "PricingToggle"
