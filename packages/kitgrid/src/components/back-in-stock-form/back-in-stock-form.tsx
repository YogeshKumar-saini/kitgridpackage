"use client"

import {
  type FormEvent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"

export interface BackInStockFormLabels {
  trigger?: string
  email?: string
  submit?: string
  invalid?: string
  error?: string
  /** Receives the `variant` text when given. */
  success?: (variant?: string) => string
}

export interface BackInStockFormProps extends HTMLAttributes<HTMLDivElement> {
  onNotify: (email: string) => Promise<void | boolean>
  /** The sold-out option, e.g. "Sage / M", used in the confirmation. */
  variant?: string
  /** Show the field straight away instead of behind the trigger button. */
  defaultExpanded?: boolean
  defaultEmail?: string
  icon?: ReactNode
  labels?: BackInStockFormLabels
}

const defaultLabels: Required<BackInStockFormLabels> = {
  trigger: "Notify me when available",
  email: "Email address",
  submit: "Notify me",
  invalid: "Enter a valid email address.",
  error: "We couldn't save that. Try again.",
  success: (variant) =>
    variant ? `We'll email you when ${variant} is back.` : "We'll email you when it's back.",
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const Bell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />
  </svg>
)

/** Sold-out replacement for the buy button: reveals an email field and confirms the alert. */
export const BackInStockForm = forwardRef<HTMLDivElement, BackInStockFormProps>(
  (
    {
      onNotify,
      variant,
      defaultExpanded = false,
      defaultEmail = "",
      icon,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const inputRef = useRef<HTMLInputElement>(null)
    const mounted = useRef(true)
    const [expanded, setExpanded] = useState(defaultExpanded)
    const [email, setEmail] = useState(defaultEmail)
    const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle")
    const [error, setError] = useState("")

    useEffect(
      () => () => {
        mounted.current = false
      },
      [],
    )

    const fail = (message: string) => {
      setState("error")
      setError(message)
      inputRef.current?.focus()
    }

    const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (state === "submitting") return
      const value = email.trim()
      if (!EMAIL.test(value)) return fail(text.invalid)
      setState("submitting")
      try {
        const result = await onNotify(value)
        if (!mounted.current) return
        if (result === false) fail(text.error)
        else setState("success")
      } catch {
        if (mounted.current) fail(text.error)
      }
    }

    return (
      <div
        ref={ref}
        className={cx("kg-back-in-stock grid w-full text-kg-fg", className)}
        data-state={state}
        data-expanded={expanded || undefined}
        {...props}
      >
        {state === "success" ? (
          <p className="kg-back-in-stock__success flex items-center gap-2.5 m-0 p-3 rounded-kg-md border-2 border-kg-ink bg-kg-paper-sage text-kg-sm font-[550] text-kg-fg shadow-kg-xs animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)]">
            <span className="kg-back-in-stock__icon inline-grid shrink-0 text-kg-fg [&_svg]:size-[1.15rem]">{icon ?? <Bell />}</span>
            {text.success(variant)}
          </p>
        ) : !expanded ? (
          <Button
            variant="outline"
            fullWidth
            leading={icon ?? <Bell />}
            onClick={() => {
              setExpanded(true)
              requestAnimationFrame(() => inputRef.current?.focus())
            }}
          >
            {text.trigger}
          </Button>
        ) : (
          <form noValidate className="kg-back-in-stock__form grid gap-2 animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)]" onSubmit={submit}>
            <label htmlFor={`${id}-email`} className="kg-back-in-stock__label kg-visually-hidden">
              {text.email}
            </label>
            <div className="kg-back-in-stock__row flex gap-2">
              <input
                ref={inputRef}
                id={`${id}-email`}
                className={cx(
                  "kg-back-in-stock__input flex-1 min-w-0 h-kg-md px-3 rounded-kg-md border-2 border-kg-ink bg-kg-surface",
                  "[font-family:inherit] text-kg-base text-kg-fg placeholder:text-kg-fg-faint",
                  "[--_shadow:3px_3px_0_var(--kg-ink)] aria-invalid:border-kg-danger aria-invalid:[--_shadow:3px_3px_0_var(--kg-danger)]",
                  "transition-[border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
                  "focus-visible:shadow-(--_shadow) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                  "read-only:bg-kg-surface-sunken",
                )}
                type="email"
                autoComplete="email"
                value={email}
                placeholder={text.email}
                readOnly={state === "submitting"}
                aria-invalid={state === "error" || undefined}
                aria-describedby={state === "error" ? `${id}-error` : undefined}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (state === "error") setState("idle")
                }}
              />
              <Button type="submit" loading={state === "submitting"}>
                {text.submit}
              </Button>
            </div>
            {state === "error" && (
              <p id={`${id}-error`} className="kg-back-in-stock__error m-0 text-kg-sm text-kg-danger">
                {error}
              </p>
            )}
          </form>
        )}
        <span className="kg-back-in-stock__status kg-visually-hidden" role="status">
          {state === "success" ? text.success(variant) : ""}
        </span>
      </div>
    )
  },
)

BackInStockForm.displayName = "BackInStockForm"
