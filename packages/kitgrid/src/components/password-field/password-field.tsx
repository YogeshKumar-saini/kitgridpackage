"use client"

import {
  type CSSProperties,
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  useId,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { joinIds, resolveFieldControl, useField } from "../field/field.js"
import {
  type InputGroupSize,
  inputGroupButton,
  inputGroupControl,
  inputGroupVariants,
} from "../input-group/input-group.js"

export interface PasswordFieldRule {
  label: string
  test: (password: string) => boolean
}

export interface PasswordFieldLabels {
  /** Name of the reveal toggle; its pressed state says whether the text shows. */
  show: string
  capsLock: string
  /** One per score from 0 to 4. */
  strength: readonly [string, string, string, string, string]
}

export interface PasswordFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "type"
> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Shows a four-step strength meter. */
  meter?: boolean
  /** Replaces the built-in estimate. Return 0 to 4. */
  scorePassword?: (password: string) => number
  /** Requirements ticked off as they are met. */
  rules?: readonly PasswordFieldRule[]
  size?: InputGroupSize
  invalid?: boolean
  labels?: Partial<PasswordFieldLabels>
  className?: string
  style?: CSSProperties
}

const defaultLabels: PasswordFieldLabels = {
  show: "Show password",
  capsLock: "Caps Lock is on",
  strength: ["Too short", "Weak", "Fair", "Good", "Strong"],
}

/** A deliberately simple estimate: length first, then character variety. */
export const estimatePasswordStrength = (password: string): number => {
  if (password.length < 8) return 0
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  let score = kinds >= 3 ? 2 : 1
  if (password.length >= 12) score++
  if (password.length >= 16 && kinds >= 3) score++
  return Math.min(score, 4)
}

// Each score carries a tone and the text colour that stays AA on it.
const meterTones = cx(
  "[--_tone:var(--kg-muted)] [--_tone-fg:var(--kg-fg-muted)]",
  "data-[score=0]:[--_tone:var(--kg-danger)] data-[score=0]:[--_tone-fg:var(--kg-danger-fg)]",
  "data-[score=1]:[--_tone:var(--kg-danger)] data-[score=1]:[--_tone-fg:var(--kg-danger-fg)]",
  "data-[score=2]:[--_tone:var(--kg-warning)] data-[score=2]:[--_tone-fg:var(--kg-warning-fg)]",
  "data-[score=3]:[--_tone:var(--kg-success)] data-[score=3]:[--_tone-fg:var(--kg-success-fg)]",
  "data-[score=4]:[--_tone:var(--kg-success)] data-[score=4]:[--_tone-fg:var(--kg-success-fg)]",
)

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path
      d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="m4 4 16 16" strokeLinecap="round" />}
  </svg>
)

const RuleIcon = ({ met }: { met: boolean }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    {met ? (
      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
    )}
  </svg>
)

/**
 * A password input with a reveal toggle, an optional strength meter, live requirement checks
 * and a Caps Lock hint.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      meter = false,
      scorePassword = estimatePasswordStrength,
      rules,
      size = "md",
      invalid,
      disabled,
      required,
      labels: labelsProp,
      autoComplete = "current-password",
      id,
      className,
      style,
      onKeyDown,
      onKeyUp,
      onBlur,
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
    const labels = { ...defaultLabels, ...labelsProp }
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [revealed, setRevealed] = useState(false)
    const [capsLock, setCapsLock] = useState(false)
    const baseId = useId()
    const meterId = `${baseId}-meter`
    const rulesId = `${baseId}-rules`
    const capsId = `${baseId}-caps`

    const score = Math.max(0, Math.min(4, Math.round(scorePassword(value))))
    const readCaps = (event: ReactKeyboardEvent<HTMLInputElement>) =>
      setCapsLock(event.getModifierState?.("CapsLock") ?? false)

    return (
      <div
        className={cx("kg-password-field grid gap-2 w-full", className)}
        style={style}
        data-size={size}
      >
        <div
          className={inputGroupVariants({
            size,
            end: "tight",
            className: "kg-password-field__group",
          })}
          data-size={size}
          data-invalid={control.invalid || undefined}
          data-disabled={control.disabled || undefined}
        >
          <input
            ref={ref}
            id={control.id}
            type={revealed ? "text" : "password"}
            autoComplete={autoComplete}
            autoCapitalize="off"
            spellCheck={false}
            className={cx(
              inputGroupControl,
              "kg-password-field__input tracking-[0.02em] [&[type=password]]:tracking-[0.12em]",
            )}
            disabled={control.disabled}
            aria-describedby={joinIds(
              control.describedBy,
              meter && value ? meterId : undefined,
              rules?.length ? rulesId : undefined,
              capsLock ? capsId : undefined,
            )}
            aria-invalid={control.invalid || undefined}
            aria-errormessage={control.errorMessage}
            aria-required={control.required || undefined}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              onKeyDown?.(event)
              readCaps(event)
            }}
            onKeyUp={(event) => {
              onKeyUp?.(event)
              readCaps(event)
            }}
            onBlur={(event) => {
              onBlur?.(event)
              setCapsLock(false)
            }}
            {...props}
          />
          <button
            type="button"
            className={inputGroupButton}
            aria-label={labels.show}
            aria-pressed={revealed}
            aria-controls={control.id}
            disabled={control.disabled}
            onClick={() => setRevealed((on) => !on)}
          >
            <EyeIcon off={revealed} />
          </button>
        </div>
        {capsLock && (
          <p
            id={capsId}
            className={cx(
              "kg-password-field__caps justify-self-start m-0 px-[0.6em] py-[0.2em] rounded-full",
              "border border-kg-ink bg-kg-paper-butter text-kg-xs font-medium text-kg-fg",
              "animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
            )}
          >
            {labels.capsLock}
          </p>
        )}
        {meter && (
          <div
            className={cx("kg-password-field__meter flex items-center gap-3", meterTones)}
            data-score={value ? score : undefined}
          >
            <span className="kg-password-field__bars grid grid-cols-4 gap-1 flex-1" aria-hidden="true">
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={cx(
                    "kg-password-field__bar h-2 overflow-hidden rounded-full border border-kg-ink bg-kg-surface",
                    "after:block after:h-full after:bg-(--_tone) after:origin-left after:scale-x-0",
                    "after:transition-[scale,background-color] after:duration-(--kg-duration-slow) after:ease-kg-out",
                    "data-on:after:scale-x-100",
                  )}
                  data-on={(value && score >= step) || (value && step === 1) || undefined}
                />
              ))}
            </span>
            <span
              id={meterId}
              className={cx(
                "kg-password-field__score min-w-[4.5rem] px-2 py-0.5 rounded-full border border-kg-ink text-center",
                "bg-(--_tone) text-kg-xs font-semibold text-(--_tone-fg)",
                "empty:border-transparent empty:bg-transparent",
              )}
              aria-live="polite"
            >
              {value ? labels.strength[score] : ""}
            </span>
          </div>
        )}
        {rules && rules.length > 0 && (
          <ul
            id={rulesId}
            className="kg-password-field__rules grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-4 gap-y-1.5 m-0 p-0 list-none"
          >
            {rules.map((rule) => {
              const met = rule.test(value)
              return (
                <li
                  key={rule.label}
                  className={cx(
                    "kg-password-field__rule flex items-center gap-2 text-kg-xs text-kg-fg-muted",
                    "transition-colors duration-(--kg-duration-base) ease-kg-out data-met:text-kg-fg",
                    "[&_svg]:shrink-0 [&_svg]:size-[0.875rem] [&_svg]:text-kg-fg-faint",
                    "data-met:[&_svg]:text-kg-success data-met:[&_svg]:animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
                  )}
                  data-met={met || undefined}
                >
                  <RuleIcon met={met} />
                  <span>{rule.label}</span>
                  <span className="kg-visually-hidden">{met ? ", met" : ", not met"}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  },
)

PasswordField.displayName = "PasswordField"
