"use client"

import {
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useLocale } from "../../hooks/use-locale.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"
import { MinusIcon, PlusIcon } from "../combobox/internal.js"
import { resolveFieldControl, useField } from "../field/field.js"
import {
  type InputGroupSize,
  inputGroupAddon,
  inputGroupControl,
  inputGroupVariants,
} from "../input-group/input-group.js"

export interface NumberFieldLabels {
  increment: string
  decrement: string
}

export interface NumberFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "type" | "min" | "max" | "step"
> {
  value?: number | null
  defaultValue?: number | null
  onValueChange?: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  /** Step for Shift+Arrow and Page keys. */
  largeStep?: number
  locale?: string
  /** Intl options for how the number is written, e.g. `{ style: "percent" }`. */
  formatOptions?: Intl.NumberFormatOptions
  /** `split` puts minus and plus at either end, `stacked` stacks them at the end. */
  stepper?: "split" | "stacked" | "none"
  leading?: ReactNode
  trailing?: ReactNode
  size?: InputGroupSize
  invalid?: boolean
  labels?: Partial<NumberFieldLabels>
}

const defaultLabels: NumberFieldLabels = { increment: "Increase", decrement: "Decrease" }

const stepBase = cx(
  "kg-input-group__button kg-number-field__step relative inline-grid place-items-center shrink-0 p-0",
  "border-0 bg-transparent text-kg-fg-muted cursor-pointer",
  "transition-[background-color,color,scale] duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:bg-kg-muted interactive:hover:text-kg-fg interactive:active:scale-92",
  "disabled:cursor-not-allowed disabled:opacity-45",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
)

const stepClass = {
  split: cx(stepBase, "size-7 rounded-kg-sm [&_svg]:size-4"),
  stacked: cx(stepBase, "w-7 rounded-none border-kg-ink [&_svg]:size-3 [&+&]:border-t-2"),
}

const decimalsOf = (n: number) => (String(n).split(".")[1] ?? "").length

/** Reads what a person typed in the given locale, ignoring group separators and symbols. */
export const parseLocaleNumber = (
  text: string,
  locale: string | undefined,
  options: Intl.NumberFormatOptions = {},
): number | null => {
  const parts = new Intl.NumberFormat(locale).formatToParts(11111.1)
  const group = parts.find((part) => part.type === "group")?.value ?? ","
  const decimal = parts.find((part) => part.type === "decimal")?.value ?? "."
  let clean = text.trim()
  if (!clean) return null
  const negative = /[-−]/.test(clean) || /^\(.*\)$/.test(clean)
  // Narrow no-break spaces are the group separator in several locales.
  clean = clean.split(group).join("").replace(/[\s  ]/g, "")
  clean = clean.split(decimal).join(".").replace(/[^\d.]/g, "")
  if (!clean || clean === ".") return null
  let value = Number(clean)
  if (Number.isNaN(value)) return null
  if (negative) value = -value
  if (options.style === "percent") value /= 100
  return value
}

/**
 * A spinbutton that formats with Intl in the user's locale and steps from the keyboard, the
 * wheel-free buttons, or press-and-hold.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  (
    {
      value: valueProp,
      defaultValue = null,
      onValueChange,
      min = Number.NEGATIVE_INFINITY,
      max = Number.POSITIVE_INFINITY,
      step = 1,
      largeStep = step * 10,
      locale: localeProp,
      formatOptions,
      stepper = "split",
      leading,
      trailing,
      size = "md",
      invalid,
      disabled,
      readOnly,
      required,
      labels: labelsProp,
      id,
      className,
      style,
      onKeyDown,
      onBlur,
      onFocus,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
      ...props
    },
    forwardedRef,
  ) => {
    const control = resolveFieldControl(useField(), {
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
    })
    const locale = useLocale(localeProp)
    const labels = { ...defaultLabels, ...labelsProp }
    const [value, setValue] = useControllableState<number | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const formatter = useMemo(
      () => new Intl.NumberFormat(locale, formatOptions),
      [locale, formatOptions],
    )
    const format = (n: number | null) => (n === null ? "" : formatter.format(n))
    const [text, setText] = useState(() => format(value))
    const [editing, setEditing] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const ref = useComposedRefs(inputRef, forwardedRef)
    const repeat = useRef<{ timeout: number; interval: number } | null>(null)

    useEffect(() => {
      if (!editing) setText(format(value))
    }, [value, formatter, editing])

    const resolvedDigits = formatter.resolvedOptions().maximumFractionDigits ?? 0
    const precision = Math.max(
      decimalsOf(step),
      formatOptions?.style === "percent" ? resolvedDigits + 2 : resolvedDigits,
    )
    const normalize = (n: number) => Number(clamp(n, min, max).toFixed(Math.min(precision, 20)))

    const commitText = (): number | null => {
      const parsed = parseLocaleNumber(text, locale, formatOptions)
      const next = parsed === null ? null : normalize(parsed)
      setValue(next)
      setText(format(next))
      return next
    }

    const stepBy = (delta: number) => {
      if (readOnly || control.disabled) return
      const current = editing ? parseLocaleNumber(text, locale, formatOptions) : value
      // From empty, the first step lands on the nearest bound, or zero when unbounded.
      const start = delta > 0 ? min : max
      const next =
        current === null ? normalize(Number.isFinite(start) ? start : 0) : normalize(current + delta)
      setValue(next)
      setText(format(next))
    }

    const stopRepeat = () => {
      if (!repeat.current) return
      window.clearTimeout(repeat.current.timeout)
      window.clearInterval(repeat.current.interval)
      repeat.current = null
    }
    useEffect(() => stopRepeat, [])

    const startRepeat = (delta: number) => {
      stopRepeat()
      stepBy(delta)
      const timeout = window.setTimeout(() => {
        if (repeat.current) repeat.current.interval = window.setInterval(() => stepBy(delta), 60)
      }, 400)
      repeat.current = { timeout, interval: 0 }
    }

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const big = event.shiftKey ? largeStep : step
      switch (event.key) {
        case "ArrowUp":
          event.preventDefault()
          return stepBy(big)
        case "ArrowDown":
          event.preventDefault()
          return stepBy(-big)
        case "PageUp":
          event.preventDefault()
          return stepBy(largeStep)
        case "PageDown":
          event.preventDefault()
          return stepBy(-largeStep)
        case "Home":
          if (Number.isFinite(min)) {
            event.preventDefault()
            setValue(min)
            setText(format(min))
          }
          return
        case "End":
          if (Number.isFinite(max)) {
            event.preventDefault()
            setValue(max)
            setText(format(max))
          }
          return
        case "Enter":
          commitText()
      }
    }

    const atMin = value !== null && value <= min
    const atMax = value !== null && value >= max

    const button = (kind: "increment" | "decrement", place: "split" | "stacked" = "split") => (
      <button
        type="button"
        tabIndex={-1}
        className={stepClass[place]}
        data-kind={kind}
        aria-label={labels[kind]}
        aria-controls={control.id}
        disabled={control.disabled || readOnly || (kind === "increment" ? atMax : atMin)}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.preventDefault()
          inputRef.current?.focus()
          startRepeat(kind === "increment" ? step : -step)
        }}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        onClick={(event) => {
          // Keyboard and assistive-tech activation, which fire click without pointerdown.
          if (event.detail === 0) stepBy(kind === "increment" ? step : -step)
        }}
      >
        {kind === "increment" ? <PlusIcon /> : <MinusIcon />}
      </button>
    )

    return (
      <div
        className={inputGroupVariants({
          size,
          className: cx(
            "kg-number-field",
            "data-[stepper=split]:[--_px:calc(var(--kg-space)*2)]",
            "data-[stepper=stacked]:pe-0 data-[stepper=stacked]:overflow-hidden",
            className,
          ),
        })}
        style={style}
        data-size={size}
        data-stepper={stepper}
        data-invalid={control.invalid || undefined}
        data-disabled={control.disabled || undefined}
      >
        {stepper === "split" && button("decrement")}
        {leading != null && (
          <span className={inputGroupAddon("text")} data-kind="text">
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={control.id}
          type="text"
          role="spinbutton"
          inputMode={precision > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          aria-valuenow={value ?? undefined}
          aria-valuemin={Number.isFinite(min) ? min : undefined}
          aria-valuemax={Number.isFinite(max) ? max : undefined}
          aria-valuetext={value === null ? undefined : format(value)}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || undefined}
          aria-errormessage={control.errorMessage}
          aria-required={control.required || undefined}
          disabled={control.disabled}
          readOnly={readOnly}
          className={cx(
            inputGroupControl,
            "kg-number-field__input tabular-nums [[data-stepper=split]>&]:text-center",
          )}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={(event) => {
            onFocus?.(event)
            setEditing(true)
          }}
          onBlur={(event) => {
            onBlur?.(event)
            setEditing(false)
            commitText()
          }}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {trailing != null && (
          <span className={inputGroupAddon("text")} data-kind="text">
            {trailing}
          </span>
        )}
        {stepper === "split" && button("increment")}
        {stepper === "stacked" && (
          <span className="kg-number-field__stack grid grid-rows-2 self-stretch border-s-2 border-kg-ink">
            {button("increment", "stacked")}
            {button("decrement", "stacked")}
          </span>
        )}
      </div>
    )
  },
)

NumberField.displayName = "NumberField"
