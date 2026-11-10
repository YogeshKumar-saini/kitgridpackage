"use client"

import {
  type FormEvent,
  forwardRef,
  type FormHTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { Button } from "../button/button.js"

/*
 * Paper Layers: inline puts the field and button on one ink-edged sheet that lifts on focus;
 * stacked gives the field its own sheet above a full-width button.
 */
export const newsletterFormVariants = variants({
  base: "kg-newsletter-form__row flex gap-2",
  variants: {
    variant: {
      inline: [
        "p-1 rounded-[calc(var(--kg-radius-md)+var(--kg-space))] border-2 bg-kg-surface",
        "transition-[border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
        "focus-within:shadow-(--_shadow) focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kg-ring",
      ],
      stacked: "flex-col",
    },
    invalid: {
      true: "border-kg-danger [--_shadow:3px_3px_0_var(--kg-danger)]",
      false: "border-kg-ink [--_shadow:3px_3px_0_var(--kg-ink)]",
    },
  },
  defaults: { variant: "inline", invalid: false },
})

export type NewsletterFormState = "idle" | "submitting" | "success" | "error"
export type NewsletterFormVariant = "inline" | "stacked"

export interface NewsletterFormLabels {
  email?: string
  submit?: string
  invalid?: string
  error?: string
  success?: string
}

export interface NewsletterFormProps extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
> {
  /** Resolve to subscribe; reject (or resolve `false`) to show the error message. */
  onSubscribe: (email: string) => Promise<void | boolean>
  variant?: NewsletterFormVariant
  placeholder?: string
  /** One short line under the field, e.g. a privacy note. */
  hint?: ReactNode
  labels?: NewsletterFormLabels
}

const defaultLabels: Required<NewsletterFormLabels> = {
  email: "Email address",
  submit: "Subscribe",
  invalid: "Enter a valid email address.",
  error: "Something went wrong. Try again.",
  success: "You're on the list.",
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const Check = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Email capture with inline validation, a busy state and an announced confirmation. */
export const NewsletterForm = forwardRef<HTMLFormElement, NewsletterFormProps>(
  (
    {
      onSubscribe,
      variant = "inline",
      placeholder = "you@example.com",
      hint,
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
    const [email, setEmail] = useState("")
    const [state, setState] = useState<NewsletterFormState>("idle")
    const [message, setMessage] = useState("")

    useEffect(
      () => () => {
        mounted.current = false
      },
      [],
    )

    const fail = (reason: string) => {
      setState("error")
      setMessage(reason)
      inputRef.current?.focus()
    }

    const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (state === "submitting") return
      const value = email.trim()
      if (!EMAIL.test(value)) return fail(text.invalid)
      setState("submitting")
      setMessage("")
      try {
        const result = await onSubscribe(value)
        if (!mounted.current) return
        if (result === false) return fail(text.error)
        setState("success")
        setMessage(text.success)
      } catch {
        if (mounted.current) fail(text.error)
      }
    }

    const messageId = `${id}-message`
    const hintId = `${id}-hint`

    return (
      <form
        ref={ref}
        noValidate
        className={cx("kg-newsletter-form grid gap-2 w-full max-w-md text-kg-fg", className)}
        data-variant={variant}
        data-state={state}
        onSubmit={submit}
        {...props}
      >
        {state === "success" ? (
          <p className="kg-newsletter-form__success flex items-center gap-2.5 min-h-[calc(var(--kg-control-md)+var(--kg-space)*2)] m-0 font-semibold animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)]">
            <span className="kg-newsletter-form__check inline-grid place-items-center size-7 shrink-0 rounded-full border-2 border-kg-ink bg-kg-success text-kg-success-fg [&_svg]:size-4">
              <Check />
            </span>
            {message}
          </p>
        ) : (
          <>
            <label htmlFor={`${id}-email`} className="kg-newsletter-form__label kg-visually-hidden">
              {text.email}
            </label>
            <div className={newsletterFormVariants({ variant, invalid: state === "error" })}>
              <input
                ref={inputRef}
                id={`${id}-email`}
                className={cx(
                  "kg-newsletter-form__input flex-1 min-w-0 h-kg-md px-3 rounded-kg-md",
                  "[font-family:inherit] text-kg-base text-kg-fg placeholder:text-kg-fg-faint",
                  variant === "inline"
                    ? "border-0 bg-transparent outline-none"
                    : [
                        "border-2 border-kg-ink bg-kg-surface [--_shadow:3px_3px_0_var(--kg-ink)]",
                        "aria-invalid:border-kg-danger aria-invalid:[--_shadow:3px_3px_0_var(--kg-danger)]",
                        "transition-[border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
                        "focus-visible:shadow-(--_shadow) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                      ],
                )}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                placeholder={placeholder}
                readOnly={state === "submitting"}
                aria-invalid={state === "error" || undefined}
                aria-describedby={
                  [state === "error" ? messageId : null, hint != null ? hintId : null]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
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
              <p id={messageId} className="kg-newsletter-form__error m-0 text-kg-sm text-kg-danger">
                {message}
              </p>
            )}
            {hint != null && (
              <p id={hintId} className="kg-newsletter-form__hint m-0 text-kg-sm text-kg-fg-muted">
                {hint}
              </p>
            )}
          </>
        )}
        <span className="kg-newsletter-form__status kg-visually-hidden" role="status">
          {state === "success" ? message : ""}
        </span>
      </form>
    )
  },
)

NewsletterForm.displayName = "NewsletterForm"
