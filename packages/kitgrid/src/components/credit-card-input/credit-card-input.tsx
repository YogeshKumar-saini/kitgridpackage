"use client"

import { forwardRef, type HTMLAttributes, useRef } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { resolveFieldControl, useField } from "../field/field.js"
import { type InputGroupSize, inputGroupVariants } from "../input-group/input-group.js"

export type CreditCardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown"

export interface CreditCardValue {
  /** Digits only. */
  number: string
  /** `MM/YY`. */
  expiry: string
  cvc: string
}

export interface CreditCardInputLabels {
  number: string
  expiry: string
  cvc: string
}

export interface CreditCardInputProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: CreditCardValue
  defaultValue?: CreditCardValue
  onValueChange?: (value: CreditCardValue) => void
  size?: InputGroupSize
  invalid?: boolean
  disabled?: boolean
  labels?: Partial<CreditCardInputLabels>
}

const defaultLabels: CreditCardInputLabels = {
  number: "Card number",
  expiry: "Expiry date",
  cvc: "Security code",
}

// inputGroupControl without its flex sizing, which each part sets itself.
const controlBase = cx(
  "kg-input-group__control self-stretch min-h-[calc(var(--_h)-4px)] m-0 p-0 border-0 bg-transparent",
  "[font:inherit] text-inherit tabular-nums caret-kg-accent-strong text-ellipsis outline-none",
  "placeholder:text-kg-fg-faint placeholder:opacity-100 disabled:cursor-not-allowed",
  "autofill:[-webkit-text-fill-color:var(--kg-fg)] autofill:[transition:background-color_600000s_0s]",
)

const empty: CreditCardValue = { number: "", expiry: "", cvc: "" }

export const detectCardBrand = (digits: string): CreditCardBrand =>
  /^3[47]/.test(digits)
    ? "amex"
    : /^4/.test(digits)
      ? "visa"
      : /^(5[1-5]|2[2-7])/.test(digits)
        ? "mastercard"
        : /^6(011|5)/.test(digits)
          ? "discover"
          : "unknown"

export const luhnCheck = (digits: string): boolean => {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return digits.length > 0 && sum % 10 === 0
}

const groupsFor = (brand: CreditCardBrand) => (brand === "amex" ? [4, 6, 5] : [4, 4, 4, 4])

const formatNumber = (digits: string, brand: CreditCardBrand) => {
  const parts: string[] = []
  let at = 0
  for (const size of groupsFor(brand)) {
    if (at >= digits.length) break
    parts.push(digits.slice(at, at + size))
    at += size
  }
  return parts.join(" ")
}

const formatExpiry = (raw: string) => {
  let digits = raw.replace(/\D/g, "").slice(0, 4)
  // "4" means April, so it becomes "04" instead of waiting for a second digit.
  if (/^[2-9]$/.test(digits)) digits = `0${digits}`
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

/**
 * Card number, expiry and security code in one field. The number groups by brand, fails the
 * Luhn check visibly, and focus moves on as each part fills.
 */
export const CreditCardInput = forwardRef<HTMLDivElement, CreditCardInputProps>(
  (
    {
      value: valueProp,
      defaultValue = empty,
      onValueChange,
      size = "md",
      invalid,
      disabled,
      labels: labelsProp,
      className,
      ...props
    },
    ref,
  ) => {
    const control = resolveFieldControl(useField(), { disabled, invalid })
    const labels = { ...defaultLabels, ...labelsProp }
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const expiryRef = useRef<HTMLInputElement>(null)
    const cvcRef = useRef<HTMLInputElement>(null)
    const brand = detectCardBrand(value.number)
    const maxDigits = groupsFor(brand).reduce((a, b) => a + b, 0)
    const cvcLength = brand === "amex" ? 4 : 3
    const numberInvalid = value.number.length === maxDigits && !luhnCheck(value.number)
    const month = Number(value.expiry.slice(0, 2))
    const expiryInvalid = value.expiry.length >= 2 && (month < 1 || month > 12)

    return (
      <div
        ref={ref}
        className={inputGroupVariants({
          size,
          className: cx("kg-credit-card-input data-brand:gap-3", className),
        })}
        data-size={size}
        data-brand={brand}
        data-invalid={control.invalid || numberInvalid || expiryInvalid || undefined}
        data-disabled={control.disabled || undefined}
        {...props}
      >
        <span
          className={cx(
            "kg-credit-card-input__brand inline-grid place-items-center shrink-0 min-w-[2.25rem] h-[1.4rem] px-[0.3rem]",
            "rounded-kg-xs border border-kg-ink bg-kg-muted text-[0.625rem] font-extrabold tracking-[0.06em]",
            "text-kg-fg-muted transition-[transform,color] duration-(--kg-duration-base) ease-kg-out",
            "[[data-brand]:not([data-brand=unknown])>&]:text-kg-fg [[data-brand]:not([data-brand=unknown])>&]:rotate-y-360",
          )}
          aria-hidden="true"
        >
          {brand === "unknown" ? "" : brand === "mastercard" ? "MC" : brand.toUpperCase()}
        </span>
        <input
          id={control.id}
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          aria-label={labels.number}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || numberInvalid || undefined}
          placeholder="1234 1234 1234 1234"
          disabled={control.disabled}
          className={cx(controlBase, "kg-credit-card-input__number flex-[1_1_10rem] min-w-[8rem]")}
          value={formatNumber(value.number, brand)}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "")
            const nextMax = groupsFor(detectCardBrand(digits)).reduce((a, b) => a + b, 0)
            const number = digits.slice(0, nextMax)
            setValue({ ...value, number })
            if (number.length === nextMax && luhnCheck(number)) expiryRef.current?.focus()
          }}
        />
        <input
          ref={expiryRef}
          type="text"
          inputMode="numeric"
          autoComplete="cc-exp"
          aria-label={labels.expiry}
          aria-invalid={expiryInvalid || undefined}
          placeholder="MM/YY"
          disabled={control.disabled}
          className={cx(controlBase, "kg-credit-card-input__expiry flex-[0_0_4.5ch] min-w-[4.5ch] text-center")}
          value={value.expiry}
          onChange={(event) => {
            const typed = event.target.value
            // Deleting the slash also drops the digit before it, so backspace never sticks.
            const expiry =
              typed.length < value.expiry.length && value.expiry.endsWith("/")
                ? typed.slice(0, -1)
                : formatExpiry(typed)
            setValue({ ...value, expiry })
            if (expiry.length === 5) cvcRef.current?.focus()
          }}
        />
        <input
          ref={cvcRef}
          type="text"
          inputMode="numeric"
          autoComplete="cc-csc"
          aria-label={labels.cvc}
          placeholder={brand === "amex" ? "1234" : "123"}
          disabled={control.disabled}
          className={cx(controlBase, "kg-credit-card-input__cvc flex-[0_0_4ch] min-w-[4ch] text-center")}
          value={value.cvc}
          onChange={(event) =>
            setValue({ ...value, cvc: event.target.value.replace(/\D/g, "").slice(0, cvcLength) })
          }
        />
      </div>
    )
  },
)

CreditCardInput.displayName = "CreditCardInput"
