"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  useId,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"
import { clamp, roundToStep } from "../../utils/math.js"
import { formatMoney, getMoneyFormatter } from "../../utils/money.js"
import { Input } from "../input/input.js"
import { Slider } from "../slider/slider.js"

export type PriceRangeSliderValue = [number, number]

export interface PriceRangeSliderLabels {
  /** Visible group label. */
  label?: string
  min?: string
  max?: string
  /** Between the two inputs. */
  separator?: string
}

export interface PriceRangeSliderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  min: number
  max: number
  step?: number
  value?: PriceRangeSliderValue
  defaultValue?: PriceRangeSliderValue
  /** Every change, including drag frames. */
  onValueChange?: (value: PriceRangeSliderValue) => void
  /** Once per interaction (thumb released, input committed): filter here. */
  onValueCommit?: (value: PriceRangeSliderValue) => void
  currency?: string
  locale?: string
  /** Product counts per equal-width price bucket from `min` to `max`. */
  histogram?: readonly number[]
  /** Minimum gap between the thumbs, in steps. */
  minStepsBetweenThumbs?: number
  /** Show the number inputs. */
  inputs?: boolean
  disabled?: boolean
  labels?: PriceRangeSliderLabels
}

const defaultLabels: Required<PriceRangeSliderLabels> = {
  label: "Price",
  min: "Minimum price",
  max: "Maximum price",
  separator: "to",
}

const symbolOf = (currency: string, locale: string | undefined) =>
  getMoneyFormatter({ currency, locale, display: "narrowSymbol" })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value ?? currency

const decimalOf = (locale: string | undefined) =>
  new Intl.NumberFormat(locale)
    .formatToParts(1.1)
    .find((part) => part.type === "decimal")?.value ?? "."

/** Reads what a shopper typed in their locale: "1.299,50" in de-DE, "1,299.50" in en-US. */
const parseAmount = (input: string, locale: string | undefined): number | null => {
  const decimal = decimalOf(locale)
  const cleaned = input
    .replace(new RegExp(`[^0-9${decimal === "." ? "\\." : decimal}-]`, "g"), "")
    .replace(decimal, ".")
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/** A two-thumb price filter with synced inputs and an optional price histogram. */
export const PriceRangeSlider = forwardRef<HTMLDivElement, PriceRangeSliderProps>(
  (
    {
      min,
      max,
      step = 1,
      value: valueProp,
      defaultValue,
      onValueChange,
      onValueCommit,
      currency = "USD",
      locale: localeProp,
      histogram,
      minStepsBetweenThumbs = 0,
      inputs = true,
      disabled = false,
      labels,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const locale = useLocale(localeProp)
    const [value, setValue] = useControllableState<PriceRangeSliderValue>({
      value: valueProp,
      defaultValue: defaultValue ?? [min, max],
      onChange: onValueChange,
    })
    const [low, high] = value
    const [drafts, setDrafts] = useState<[string | null, string | null]>([null, null])
    const symbol = symbolOf(currency, locale)
    const decimals = step < 1 ? (String(step).split(".")[1]?.length ?? 2) : 0
    const number = new Intl.NumberFormat(locale, {
      maximumFractionDigits: decimals,
      useGrouping: false,
    })
    const format = (amount: number) =>
      formatMoney(amount, { currency, locale, trimZeros: true })
    const gap = minStepsBetweenThumbs * step

    const commitInput = (index: 0 | 1) => {
      const draft = drafts[index]
      setDrafts((current) => (index === 0 ? [null, current[1]] : [current[0], null]))
      if (draft === null) return
      const parsed = parseAmount(draft, locale)
      if (parsed === null) return
      const bounded =
        index === 0
          ? clamp(roundToStep(parsed, step, min), min, high - gap)
          : clamp(roundToStep(parsed, step, min), low + gap, max)
      const next: PriceRangeSliderValue = index === 0 ? [bounded, high] : [low, bounded]
      if (next[0] === low && next[1] === high) return
      setValue(next)
      onValueCommit?.(next)
    }

    const inputProps = (index: 0 | 1) => ({
      value: drafts[index] ?? number.format(value[index]),
      inputMode: "decimal" as const,
      disabled,
      size: "sm" as const,
      leading: symbol,
      "aria-label": index === 0 ? text.min : text.max,
      onChange: (event: { currentTarget: HTMLInputElement }) => {
        const next = event.currentTarget.value
        setDrafts((current) => (index === 0 ? [next, current[1]] : [current[0], next]))
      },
      onBlur: () => commitInput(index),
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          event.preventDefault()
          commitInput(index)
        } else if (event.key === "Escape" && drafts[index] !== null) {
          event.preventDefault()
          setDrafts((current) =>
            index === 0 ? [null, current[1]] : [current[0], null],
          )
        }
      },
    })

    const buckets = histogram ?? []
    const peak = Math.max(1, ...buckets)
    const width = buckets.length ? (max - min) / buckets.length : 0

    return (
      <div
        ref={ref}
        className={cx("kg-price-range grid min-w-0 gap-3 data-disabled:opacity-55", className)}
        role="group"
        aria-labelledby={`${id}-label`}
        data-disabled={disabled || undefined}
        style={style}
        {...props}
      >
        <div className="kg-price-range__header flex items-baseline justify-between gap-3">
          <span id={`${id}-label`} className="kg-price-range__label text-kg-sm font-semibold text-kg-fg">
            {text.label}
          </span>
          <span className="kg-price-range__readout text-kg-sm text-kg-fg-muted tabular-nums" aria-hidden="true">
            {format(low)} - {format(high)}
          </span>
        </div>
        {buckets.length > 0 && (
          // Decorative: the result count belongs next to the product grid, announced once per commit.
          <div className="kg-price-range__histogram -mb-3 px-2" aria-hidden="true">
            <div className="kg-price-range__bars flex h-11 items-end gap-[2px]">
              {buckets.map((count, index) => {
                const from = min + index * width
                const active = from + width > low && from < high
                return (
                  <span
                    key={index}
                    className={cx(
                      "kg-price-range__bar h-full flex-1 basis-0 origin-bottom rounded-t-[2px]",
                      "transition-[background-color,scale] duration-(--kg-duration-base) ease-kg-out",
                      active ? "bg-kg-ink" : "bg-kg-border",
                    )}
                    data-active={active || undefined}
                    style={
                      {
                        "--_h": count / peak,
                        scale: `1 ${Math.max(count / peak, 0.04)}`,
                      } as CSSProperties
                    }
                  />
                )
              })}
            </div>
          </div>
        )}
        <Slider
          className="kg-price-range__slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onValueChange={(next) => setValue([next[0] ?? min, next[1] ?? max])}
          onValueCommit={(next) => onValueCommit?.([next[0] ?? min, next[1] ?? max])}
          minStepsBetweenThumbs={minStepsBetweenThumbs}
          formatValue={(amount) => format(amount)}
          thumbLabels={[text.min, text.max]}
          showValue="never"
          disabled={disabled}
        />
        {inputs && (
          <div className="kg-price-range__inputs grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 [&_input]:tabular-nums">
            <Input {...inputProps(0)} />
            <span className="kg-price-range__separator text-kg-sm text-kg-fg-muted">{text.separator}</span>
            <Input {...inputProps(1)} />
          </div>
        )}
      </div>
    )
  },
)

PriceRangeSlider.displayName = "PriceRangeSlider"
