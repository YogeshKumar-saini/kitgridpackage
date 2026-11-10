"use client"

import {
  type ChangeEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { Button } from "../button/button.js"

export type CouponInputSize = "sm" | "md" | "lg"
export type CouponInputState = "idle" | "applying" | "applied" | "invalid"

export interface CouponInputResult {
  ok: boolean
  /** On success, the savings line ("You saved $12.00"); on failure, why it was rejected. */
  message?: string
}

export interface CouponInputApplied {
  code: string
  message?: string | undefined
}

export interface CouponInputLabels {
  /** Accessible name of the field; also its placeholder unless `placeholder` is set. */
  label?: string
  apply?: string
  remove?: (code: string) => string
  /** Shown when `onApply` resolves `{ ok: false }` without a message. */
  invalid?: string
  /** Shown when `onApply` throws or rejects. */
  error?: string
  /** Announced on success when the result has no message. */
  applied?: (code: string) => string
  /** Announced after a code is removed. */
  removed?: (code: string) => string
}

export interface CouponInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue"
> {
  /** Validate the (trimmed, uppercased) code against your backend. */
  onApply: (code: string) => Promise<CouponInputResult>
  /** Called before the applied code is cleared; may return a promise. */
  onRemove?: (code: string) => void | Promise<void>
  /** The applied code. Controlled when defined; `null` means none. */
  applied?: CouponInputApplied | null
  defaultApplied?: CouponInputApplied | null
  onAppliedChange?: (applied: CouponInputApplied | null) => void
  placeholder?: string
  /** Show the label above the field instead of only to assistive technology. */
  showLabel?: boolean
  size?: CouponInputSize
  disabled?: boolean
  name?: string
  maxLength?: number
  labels?: CouponInputLabels
  /** Leading icon of the applied tag. */
  icon?: ReactNode
}

const defaultLabels: Required<CouponInputLabels> = {
  label: "Discount code",
  apply: "Apply",
  remove: (code) => `Remove code ${code}`,
  invalid: "This code isn't valid.",
  error: "We couldn't apply that code. Please try again.",
  applied: (code) => `Code ${code} applied`,
  removed: (code) => `Code ${code} removed`,
}

const TagIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.4 1.4 0 0 1 0 2l-7.1 7.1a1.4 1.4 0 0 1-2 0z" />
    <circle cx="8" cy="8" r="1.4" />
  </svg>
)

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M7 7l10 10M17 7 7 17" strokeLinecap="round" />
  </svg>
)

const rootVariants = variants({
  base: "kg-coupon-input grid gap-2 text-(length:--_text)",
  variants: {
    size: {
      sm: "[--_height:var(--kg-control-sm)] [--_text:var(--kg-text-sm)]",
      md: "[--_height:var(--kg-control-md)] [--_text:var(--kg-text-base)]",
      lg: "[--_height:var(--kg-control-lg)] [--_text:var(--kg-text-md)]",
    },
  },
  defaults: { size: "md" },
})

const fieldClass = [
  "kg-coupon-input__field h-(--_height) min-w-0 flex-1 rounded-kg-md border-2 border-kg-ink bg-kg-surface px-3",
  "font-[inherit] text-(length:--_text) font-[550] tracking-[0.04em] text-kg-fg",
  "transition-[border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out [&:not(:placeholder-shown)]:uppercase",
  "placeholder:font-normal placeholder:tracking-normal placeholder:text-kg-fg-faint",
  "focus-visible:shadow-kg-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  "aria-invalid:border-kg-danger aria-invalid:focus-visible:shadow-[3px_3px_0_var(--kg-danger)]",
  "disabled:cursor-not-allowed disabled:opacity-55 read-only:not-disabled:text-kg-fg-muted",
]

/** Discount-code field with async validation, a removable applied tag and announced results. */
export const CouponInput = forwardRef<HTMLDivElement, CouponInputProps>(
  (
    {
      onApply,
      onRemove,
      applied: appliedProp,
      defaultApplied = null,
      onAppliedChange,
      placeholder,
      showLabel = false,
      size = "md",
      disabled = false,
      name,
      maxLength = 64,
      labels,
      icon,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const inputRef = useRef<HTMLInputElement>(null)
    const request = useRef(0)
    const [applied, setApplied] = useControllableState<CouponInputApplied | null>({
      value: appliedProp,
      defaultValue: defaultApplied,
      onChange: onAppliedChange,
    })
    const [code, setCode] = useState("")
    const [status, setStatus] = useState<"idle" | "applying" | "invalid">("idle")
    const [error, setError] = useState("")
    const [announcement, setAnnouncement] = useState("")
    const [attempts, setAttempts] = useState(0)

    useEffect(
      () => () => {
        // Responses that land after unmount are dropped.
        request.current = -1
      },
      [],
    )

    const normalized = code.trim().toUpperCase()
    const state: CouponInputState = status === "idle" && applied ? "applied" : status
    const applying = status === "applying"

    const fail = (message: string) => {
      setStatus("invalid")
      setError(message)
      setAnnouncement(message)
      setAttempts((count) => count + 1)
    }

    const apply = async () => {
      if (!normalized || applying || disabled) return
      const ticket = ++request.current
      setStatus("applying")
      setError("")
      setAnnouncement("")
      try {
        const result = await onApply(normalized)
        if (ticket !== request.current) return
        if (result.ok) {
          setApplied({ code: normalized, message: result.message })
          setStatus("idle")
          setCode("")
          setAnnouncement(result.message ?? text.applied(normalized))
        } else {
          fail(result.message ?? text.invalid)
        }
      } catch {
        if (ticket === request.current) fail(text.error)
      }
      if (ticket === request.current) inputRef.current?.focus()
    }

    const remove = async () => {
      if (!applied) return
      const removed = applied.code
      await onRemove?.(removed)
      setApplied(null)
      setAnnouncement(text.removed(removed))
      inputRef.current?.focus()
    }

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      setCode(event.target.value)
      if (status === "invalid") {
        setStatus("idle")
        setError("")
      }
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return
      // Coupon fields usually sit inside a checkout form: Enter applies, it never submits.
      event.preventDefault()
      void apply()
    }

    const errorId = `${id}-error`

    return (
      <div
        ref={ref}
        className={rootVariants({ size, className })}
        data-size={size}
        data-state={state}
        {...props}
      >
        <label
          htmlFor={`${id}-input`}
          className={
            showLabel
              ? "kg-coupon-input__label text-kg-sm font-semibold text-kg-fg"
              : "kg-visually-hidden"
          }
        >
          {text.label}
        </label>
        <div
          className={cx(
            "kg-coupon-input__row flex gap-2",
            status === "invalid" &&
              (attempts % 2
                ? "animate-[kg-coupon-shake-a_var(--kg-duration-slower)_var(--kg-ease-out)]"
                : "animate-[kg-coupon-shake-b_var(--kg-duration-slower)_var(--kg-ease-out)]"),
          )}
          data-shake={status === "invalid" ? (attempts % 2 ? "a" : "b") : undefined}
        >
          <input
            ref={inputRef}
            id={`${id}-input`}
            className={cx(fieldClass)}
            type="text"
            name={name}
            value={code}
            placeholder={placeholder ?? text.label}
            maxLength={maxLength}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={disabled}
            readOnly={applying}
            aria-invalid={status === "invalid" || undefined}
            aria-describedby={status === "invalid" ? errorId : undefined}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          <Button
            className="kg-coupon-input__apply shrink-0"
            variant="solid"
            size={size}
            loading={applying}
            disabled={disabled || !normalized}
            onClick={() => void apply()}
          >
            {text.apply}
          </Button>
        </div>
        {status === "invalid" && error && (
          <p
            id={errorId}
            className={cx(
              "kg-coupon-input__error m-0 flex items-center gap-[0.4em] text-kg-sm font-medium",
              "text-[color-mix(in_oklab,var(--kg-danger),var(--kg-fg)_30%)]",
              "animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)] [--kg-enter-y:-2px]",
              "before:inline-grid before:size-[1.15em] before:place-items-center before:rounded-full before:bg-kg-danger before:text-[0.85em] before:font-bold before:text-kg-danger-fg before:content-['!']",
            )}
          >
            {error}
          </p>
        )}
        {applied && (
          <div className="kg-coupon-input__applied flex animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)] flex-wrap items-center gap-x-3 gap-y-2">
            <span className="kg-coupon-input__tag inline-flex h-kg-sm items-center gap-1.5 rounded-full border-2 border-kg-ink bg-kg-paper-sage ps-2.5 pe-0.5 text-kg-sm font-[650] tracking-[0.04em] text-kg-fg">
              <span className="kg-coupon-input__tag-icon inline-grid size-[1em] [&_svg]:size-full">
                {icon ?? <TagIcon />}
              </span>
              <span className="kg-coupon-input__code">{applied.code}</span>
              <button
                type="button"
                className={cx(
                  "kg-coupon-input__remove relative inline-grid size-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-inherit",
                  "transition-[background-color] duration-(--kg-duration-fast) ease-kg-out before:absolute before:-inset-1 before:content-['']",
                  "interactive:hover:bg-kg-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3.5",
                )}
                aria-label={text.remove(applied.code)}
                disabled={disabled}
                onClick={() => void remove()}
              >
                <CloseIcon />
              </button>
            </span>
            {applied.message && (
              <span className="kg-coupon-input__savings text-kg-sm font-[550] text-[color-mix(in_oklab,var(--kg-success),var(--kg-fg)_30%)]">{applied.message}</span>
            )}
          </div>
        )}
        <span className="kg-visually-hidden" role="status">
          {announcement}
        </span>
      </div>
    )
  },
)

CouponInput.displayName = "CouponInput"
