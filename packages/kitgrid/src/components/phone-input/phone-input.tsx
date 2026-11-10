"use client"

import {
  type ClipboardEvent,
  forwardRef,
  type InputHTMLAttributes,
  useMemo,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { resolveFieldControl, useField } from "../field/field.js"
import {
  type InputGroupSize,
  inputGroupControl,
  inputGroupVariants,
} from "../input-group/input-group.js"
import { SearchSelect } from "../search-select/search-select.js"
import {
  formatPhone,
  maxDigits,
  type PhoneInputCountry,
  phoneInputCountries,
} from "./countries.js"

export interface PhoneInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "type"
> {
  /** E.164, e.g. `+14155550123`. Empty string while no digits are typed. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  country?: string
  defaultCountry?: string
  onCountryChange?: (code: string) => void
  countries?: readonly PhoneInputCountry[]
  countryLabel?: string
  size?: InputGroupSize
  invalid?: boolean
}

const digitsOf = (text: string) => text.replace(/\D/g, "")

/** The country whose calling code starts an international number, longest code first. */
const matchDial = (
  digits: string,
  countries: readonly PhoneInputCountry[],
  preferred?: string,
) =>
  [...countries]
    .sort(
      (a, b) =>
        b.dial.length - a.dial.length ||
        Number(b.code === preferred) - Number(a.code === preferred),
    )
    .find((country) => digits.startsWith(country.dial))

/**
 * A national number field with a searchable country code. It formats as you type, accepts
 * pasted international numbers and reports E.164. No phone metadata is bundled.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      country: countryProp,
      defaultCountry = "US",
      onCountryChange,
      countries = phoneInputCountries,
      countryLabel = "Country code",
      size = "md",
      invalid,
      disabled,
      required,
      placeholder,
      id,
      className,
      style,
      onPaste,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
      ...props
    },
    ref,
  ) => {
    const control = resolveFieldControl(useField(), {
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
    })
    const initialDigits = digitsOf(valueProp ?? defaultValue)
    const [code, setCode] = useControllableState({
      value: countryProp,
      defaultValue: initialDigits
        ? (matchDial(initialDigits, countries, defaultCountry)?.code ?? defaultCountry)
        : defaultCountry,
      onChange: onCountryChange,
    })
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const country = countries.find((c) => c.code === code) ?? countries[0]
    const dial = country?.dial ?? ""
    const pattern = country?.pattern ?? "###############"
    const allDigits = digitsOf(value)
    const national = allDigits.startsWith(dial) ? allDigits.slice(dial.length) : allDigits

    const emit = (digits: string, target = country) =>
      setValue(
        digits && target
          ? `+${target.dial}${digits.slice(0, maxDigits(target.pattern))}`
          : "",
      )

    const options = useMemo(
      () =>
        countries.map((c) => ({
          value: c.code,
          label: c.name,
          aside: `+${c.dial}`,
          keywords: [c.code, c.dial],
        })),
      [countries],
    )

    const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(event)
      const text = event.clipboardData.getData("text").trim()
      if (!text.startsWith("+") && !text.startsWith("00")) return
      const digits = digitsOf(text).replace(/^00/, "")
      const match = matchDial(digits, countries, code)
      if (!match) return
      event.preventDefault()
      setCode(match.code)
      emit(digits.slice(match.dial.length), match)
    }

    return (
      <div
        className={inputGroupVariants({
          size,
          className: cx(
            "kg-phone-input data-size:gap-1.5 data-size:ps-1",
            "[--_bare-h:calc(var(--_h)-var(--kg-space)*2)]",
            className,
          ),
        })}
        style={style}
        data-size={size}
        data-invalid={control.invalid || undefined}
        data-disabled={control.disabled || undefined}
      >
        <SearchSelect
          variant="bare"
          size={size}
          aria-label={countryLabel}
          options={options}
          value={country?.code ?? null}
          onValueChange={(next) => {
            const target = countries.find((c) => c.code === next)
            setCode(next)
            if (target && national) emit(national, target)
          }}
          disabled={control.disabled}
          renderValue={(option) => (
            <span className="kg-phone-input__country inline-flex items-baseline gap-1.5 tabular-nums">
              <span className="kg-phone-input__iso font-kg-mono text-[0.8em] font-semibold tracking-[0.04em] text-kg-fg-muted">
                {option.value}
              </span>
              <span className="kg-phone-input__dial">{option.aside}</span>
            </span>
          )}
        />
        <span
          className="kg-phone-input__divider self-stretch w-[2px] my-2 shrink-0 bg-kg-ink"
          aria-hidden="true"
        />
        <input
          ref={ref}
          id={control.id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className={cx(inputGroupControl, "kg-phone-input__input tabular-nums tracking-[0.01em]")}
          placeholder={placeholder ?? pattern.replace(/#/g, "0")}
          disabled={control.disabled}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || undefined}
          aria-errormessage={control.errorMessage}
          aria-required={control.required || undefined}
          value={formatPhone(national, pattern)}
          onChange={(event) => emit(digitsOf(event.target.value))}
          onPaste={handlePaste}
          {...props}
        />
      </div>
    )
  },
)

PhoneInput.displayName = "PhoneInput"
