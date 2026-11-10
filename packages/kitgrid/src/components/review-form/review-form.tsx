"use client"

import {
  type FormEvent,
  forwardRef,
  type FormHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"
import { Field } from "../field/field.js"
import { Input } from "../input/input.js"
import { Rating } from "../rating/rating.js"
import { Textarea } from "../textarea/textarea.js"

export interface ReviewFormValue {
  rating: number
  title: string
  body: string
}

export interface ReviewFormLabels {
  rating?: string
  ratingRequired?: string
  title?: string
  body?: string
  bodyRequired?: string
  submit?: string
  success?: string
  error?: string
  /** Shown under the stars once chosen, indexed by whole star (1 to 5). */
  ratingWords?: readonly string[]
}

export interface ReviewFormProps extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
> {
  onSubmit: (review: ReviewFormValue) => void | Promise<void>
  /** Minimum characters for the body. */
  minLength?: number
  maxLength?: number
  /** Ask for a title as well. */
  withTitle?: boolean
  labels?: ReviewFormLabels
}

const defaultLabels: Required<ReviewFormLabels> = {
  rating: "Your rating",
  ratingRequired: "Choose a star rating.",
  title: "Title",
  body: "Your review",
  bodyRequired: "Write a few words.",
  submit: "Post review",
  success: "Thanks, your review is posted.",
  error: "We couldn't post that. Try again.",
  ratingWords: ["Poor", "Fair", "Good", "Great", "Excellent"],
}

/** Star rating, optional title and body with validation, a busy state and confirmation. */
export const ReviewForm = forwardRef<HTMLFormElement, ReviewFormProps>(
  (
    { onSubmit, minLength = 10, maxLength = 1000, withTitle = true, labels, className, ...props },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const mounted = useRef(true)
    const ratingRef = useRef<HTMLDivElement>(null)
    const bodyRef = useRef<HTMLTextAreaElement>(null)
    const [rating, setRating] = useState(0)
    const [title, setTitle] = useState("")
    const [body, setBody] = useState("")
    const [errors, setErrors] = useState<{ rating?: string; body?: string; form?: string }>({})
    const [state, setState] = useState<"idle" | "submitting" | "success">("idle")

    useEffect(
      () => () => {
        mounted.current = false
      },
      [],
    )

    const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (state === "submitting") return
      const next: typeof errors = {}
      if (rating < 1) next.rating = text.ratingRequired
      if (body.trim().length < minLength) next.body = text.bodyRequired
      setErrors(next)
      if (next.rating) {
        ratingRef.current?.querySelector<HTMLInputElement>("input")?.focus()
        return
      }
      if (next.body) {
        bodyRef.current?.focus()
        return
      }
      setState("submitting")
      try {
        await onSubmit({ rating, title: title.trim(), body: body.trim() })
        if (mounted.current) setState("success")
      } catch {
        if (!mounted.current) return
        setState("idle")
        setErrors({ form: text.error })
      }
    }

    if (state === "success") {
      return (
        <form
          ref={ref}
          className={cx("kg-review-form grid gap-4 w-full max-w-lg text-kg-fg", className)}
          data-state="success"
          {...props}
        >
          <p className="kg-review-form__success m-0 p-4 rounded-kg-lg border-2 border-kg-ink bg-kg-paper-sage text-center font-semibold text-kg-fg shadow-kg-sm animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)]" role="status">
            {text.success}
          </p>
        </form>
      )
    }

    const word = rating > 0 ? text.ratingWords[Math.ceil(rating) - 1] : undefined

    return (
      <form
        ref={ref}
        noValidate
        className={cx("kg-review-form grid gap-4 w-full max-w-lg text-kg-fg", className)}
        data-state={state}
        onSubmit={submit}
        {...props}
      >
        <div className="kg-review-form__rating grid gap-1.5" ref={ratingRef}>
          <span className="kg-review-form__label text-kg-sm font-semibold" aria-hidden="true">
            {text.rating}
          </span>
          <div className="kg-review-form__stars flex items-center gap-3">
            <Rating
              label={text.rating}
              value={rating}
              onValueChange={(value) => {
                setRating(value)
                if (value > 0) setErrors((current) => ({ ...current, rating: undefined }))
              }}
              size="lg"
              aria-describedby={errors.rating ? `${id}-rating-error` : undefined}
            />
            {word && (
              <span className="kg-review-form__word text-kg-sm font-semibold text-kg-accent-strong animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]" aria-hidden="true">
                {word}
              </span>
            )}
          </div>
          {errors.rating && (
            <p id={`${id}-rating-error`} className="kg-review-form__error m-0 text-kg-sm text-kg-danger">
              {errors.rating}
            </p>
          )}
        </div>
        {withTitle && (
          <Field label={text.title}>
            <Input
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
        )}
        <Field label={text.body} error={errors.body} required>
          <Textarea
            ref={bodyRef}
            value={body}
            minRows={4}
            autoGrow
            maxLength={maxLength}
            onChange={(event) => {
              setBody(event.target.value)
              if (errors.body && event.target.value.trim().length >= minLength) {
                setErrors((current) => ({ ...current, body: undefined }))
              }
            }}
          />
        </Field>
        {errors.form && (
          <p className="kg-review-form__error m-0 text-kg-sm text-kg-danger" role="alert">
            {errors.form}
          </p>
        )}
        <div className="kg-review-form__actions flex justify-end">
          <Button type="submit" loading={state === "submitting"}>
            {text.submit}
          </Button>
        </div>
      </form>
    )
  },
)

ReviewForm.displayName = "ReviewForm"
