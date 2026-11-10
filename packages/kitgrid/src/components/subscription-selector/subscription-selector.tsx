"use client"

import { type FieldsetHTMLAttributes, forwardRef, useId } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { formatMoney } from "../../utils/money.js"
import { Select } from "../select/select.js"

export type SubscriptionSelectorMode = "once" | "subscribe"

export interface SubscriptionSelectorFrequency {
  value: string
  /** e.g. "2 weeks", read after `labels.every`. */
  label: string
}

export interface SubscriptionSelectorValue {
  mode: SubscriptionSelectorMode
  frequency: string
}

export interface SubscriptionSelectorLabels {
  legend?: string
  once?: string
  /** Subscribe option title, given the discount percent. */
  subscribe?: (percent: number) => string
  every?: string
  each?: string
  /** One short perk line under the subscribe option. */
  perk?: string
}

export interface SubscriptionSelectorProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "defaultValue" | "onChange"
> {
  /** One-time price. */
  price: number
  /** Percent off when subscribing. */
  discount: number
  frequencies: readonly SubscriptionSelectorFrequency[]
  value?: SubscriptionSelectorValue
  defaultValue?: SubscriptionSelectorValue
  onValueChange?: (value: SubscriptionSelectorValue) => void
  currency?: string
  locale?: string
  name?: string
  labels?: SubscriptionSelectorLabels
}

const defaultLabels: Required<SubscriptionSelectorLabels> = {
  legend: "Purchase options",
  once: "One-time purchase",
  subscribe: (percent) => `Subscribe and save ${percent}%`,
  every: "Delivery every",
  each: "each",
  perk: "Skip or cancel anytime",
}

/*
 * Paper Layers: each option is a white sheet; the chosen one takes an ink edge and an offset.
 */
const sheetClass = cx(
  "rounded-kg-lg border-2 bg-kg-surface transition-[border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "data-[state=unchecked]:border-kg-border data-[state=checked]:border-kg-ink data-[state=checked]:shadow-kg-sm",
)

const chipClass = cx(
  "kg-subscription__chip-label inline-flex h-8 items-center rounded-full border-2 border-kg-border bg-kg-surface px-3 text-kg-xs font-medium",
  "transition-[background-color,border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "peer-checked:border-kg-ink peer-checked:bg-kg-accent peer-checked:text-kg-accent-fg peer-checked:shadow-kg-xs",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-kg-ring",
)

/**
 * One-time versus subscribe-and-save, following Shopify's selling-plan guidance: one-time is the
 * default, savings are shown as a percentage, each option carries its per-delivery price, and
 * frequency uses radios up to four choices and a select beyond that.
 */
export const SubscriptionSelector = forwardRef<HTMLFieldSetElement, SubscriptionSelectorProps>(
  (
    {
      price,
      discount,
      frequencies,
      value: valueProp,
      defaultValue,
      onValueChange,
      currency = "USD",
      locale,
      name,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const group = name ?? id
    const [value, setValue] = useControllableState<SubscriptionSelectorValue>({
      value: valueProp,
      defaultValue: defaultValue ?? { mode: "once", frequency: frequencies[0]?.value ?? "" },
      onChange: onValueChange,
    })
    const money = { currency, locale }
    const subscribed = Math.round(price * (100 - discount)) / 100
    const subscribing = value.mode === "subscribe"

    const option = (
      mode: SubscriptionSelectorMode,
      title: string,
      amount: number,
      sheet: boolean,
    ) => (
      <label
        className={cx(
          "kg-subscription__option relative grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5",
          sheet && sheetClass,
        )}
        data-state={value.mode === mode ? "checked" : "unchecked"}
      >
        <input
          type="radio"
          className="kg-subscription__input peer absolute m-0 size-px opacity-0"
          name={`${group}-mode`}
          value={mode}
          checked={value.mode === mode}
          onChange={() => setValue((current) => ({ ...current, mode }))}
        />
        <span
          className={cx(
            "kg-subscription__radio grid size-[1.125rem] place-items-center rounded-full border-2 border-kg-ink bg-kg-surface",
            "after:size-2 after:scale-0 after:rounded-full after:bg-kg-accent-fg after:transition-[scale] after:duration-(--kg-duration-base) after:ease-kg-out",
            "peer-checked:bg-kg-accent peer-checked:after:scale-100",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-kg-ring",
          )}
          aria-hidden="true"
        />
        <span className="kg-subscription__title text-kg-sm font-semibold">{title}</span>{" "}
        <span className="kg-subscription__price text-kg-sm font-semibold whitespace-nowrap tabular-nums">
          {mode === "subscribe" && (
            <s className="kg-subscription__compare font-normal text-kg-fg-muted line-through" aria-hidden="true">{formatMoney(price, money)}</s>
          )}{" "}
          {formatMoney(amount, money)}{" "}
          <span className="kg-subscription__each text-kg-xs font-normal text-kg-fg-muted">{text.each}</span>
        </span>
      </label>
    )

    return (
      <fieldset
        ref={ref}
        className={cx("kg-subscription m-0 grid min-w-0 gap-2 border-0 p-0 text-kg-fg", className)}
        data-mode={value.mode}
        {...props}
      >
        <legend className="kg-visually-hidden">{text.legend}</legend>
        {option("once", text.once, price, true)}
        <div
          className={cx("kg-subscription__group group/sub", sheetClass)}
          data-state={subscribing ? "checked" : "unchecked"}
        >
          {option("subscribe", text.subscribe(discount), subscribed, false)}
          <div className="kg-subscription__reveal grid grid-rows-[0fr] transition-[grid-template-rows] duration-[var(--kg-duration-slow)] ease-kg-out group-data-[state=checked]/sub:grid-rows-[1fr]">
            <div className="kg-subscription__details grid min-h-0 gap-2.5 overflow-hidden ps-11 pe-4 group-data-[state=checked]/sub:pb-4">
              {frequencies.length <= 4 ? (
                <fieldset
                  className="kg-subscription__frequencies m-0 grid min-w-0 gap-2 border-0 p-0"
                  disabled={!subscribing}
                >
                  <legend className="kg-subscription__every mb-2 p-0 text-kg-xs font-semibold text-kg-fg-muted">{text.every}</legend>
                  <div className="kg-subscription__chips flex flex-wrap gap-1.5">
                    {frequencies.map((frequency) => (
                      <label
                        key={frequency.value}
                        className="kg-subscription__chip relative cursor-pointer"
                      >
                        <input
                          type="radio"
                          className="kg-subscription__chip-input peer absolute inset-0 m-0 cursor-[inherit] opacity-0"
                          name={`${group}-frequency`}
                          value={frequency.value}
                          checked={value.frequency === frequency.value}
                          onChange={() =>
                            setValue((current) => ({ ...current, frequency: frequency.value }))
                          }
                        />
                        <span className={chipClass}>{frequency.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <div className="kg-subscription__frequencies grid min-w-0 gap-2">
                  <span
                    className="kg-subscription__every text-kg-xs font-semibold text-kg-fg-muted"
                    id={`${id}-every`}
                  >
                    {text.every}
                  </span>
                  <Select
                    size="sm"
                    aria-labelledby={`${id}-every`}
                    disabled={!subscribing}
                    value={value.frequency}
                    onValueChange={(frequency) =>
                      setValue((current) => ({ ...current, frequency }))
                    }
                    options={frequencies.map((frequency) => ({
                      value: frequency.value,
                      label: frequency.label,
                    }))}
                  />
                </div>
              )}
              {text.perk && <p className="kg-subscription__perk m-0 text-kg-xs text-kg-fg-muted">{text.perk}</p>}
            </div>
          </div>
        </div>
      </fieldset>
    )
  },
)

SubscriptionSelector.displayName = "SubscriptionSelector"
