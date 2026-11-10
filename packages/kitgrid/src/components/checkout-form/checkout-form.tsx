"use client"

import {
  type FormEvent,
  forwardRef,
  type FormHTMLAttributes,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { formatMoney } from "../../utils/money.js"
import {
  AddressForm,
  type AddressFormCountry,
  type AddressFormField,
  type AddressFormValue,
  emptyAddress,
} from "../address-form/address-form.js"
import { Button } from "../button/button.js"
import { Checkbox } from "../checkbox/checkbox.js"
import { Field } from "../field/field.js"
import { Input } from "../input/input.js"
import { PaymentMethodSelector } from "../payment-method-selector/payment-method-selector.js"

export interface CheckoutFormShippingOption {
  id: string
  label: string
  /** e.g. "2-4 business days". */
  detail?: string
  /** 0 renders as `labels.free`. */
  price: number
}

export interface CheckoutFormValue {
  email: string
  marketing: boolean
  address: AddressFormValue
  shippingOption: string | undefined
}

export interface CheckoutFormLabels {
  contact?: string
  email?: string
  emailInvalid?: string
  marketing?: string
  shipping?: string
  delivery?: string
  payment?: string
  free?: string
  required?: string
  /** Submit button text, given the formatted total. */
  submit?: (total: string) => string
}

export interface CheckoutFormProps extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "onSubmit" | "defaultValue"
> {
  onSubmit: (value: CheckoutFormValue) => void | Promise<void>
  /** Order total before shipping; the chosen shipping price is added on the button. */
  subtotal: number
  currency?: string
  locale?: string
  shippingOptions?: readonly CheckoutFormShippingOption[]
  countries?: readonly AddressFormCountry[]
  defaultValue?: Partial<CheckoutFormValue>
  /** The payment section's content, e.g. a PaymentMethodSelector or provider element. */
  payment?: ReactNode
  labels?: CheckoutFormLabels
}

const defaultLabels: Required<CheckoutFormLabels> = {
  contact: "Contact",
  email: "Email",
  emailInvalid: "Enter a valid email address.",
  marketing: "Email me with news and offers",
  shipping: "Shipping address",
  delivery: "Delivery",
  payment: "Payment",
  free: "Free",
  required: "Required",
  submit: (total) => `Pay ${total}`,
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REQUIRED: AddressFormField[] = ["name", "line1", "city", "postalCode"]

/**
 * One-page checkout in numbered sections: contact, shipping address, delivery speed and payment.
 * Errors are shown inline after a submit attempt and focus moves to the first one.
 */
export const CheckoutForm = forwardRef<HTMLFormElement, CheckoutFormProps>(
  (
    {
      onSubmit,
      subtotal,
      currency = "USD",
      locale,
      shippingOptions = [],
      countries,
      defaultValue,
      payment,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const formRef = useRef<HTMLFormElement>(null)
    const composedRef = useComposedRefs(formRef, ref)
    const [email, setEmail] = useState(defaultValue?.email ?? "")
    const [marketing, setMarketing] = useState(defaultValue?.marketing ?? false)
    const [address, setAddress] = useState<AddressFormValue>(
      defaultValue?.address ?? emptyAddress(countries?.[0]?.code),
    )
    const [shippingOption, setShippingOption] = useState(
      defaultValue?.shippingOption ?? shippingOptions[0]?.id,
    )
    const [attempted, setAttempted] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const money = { currency, locale }
    const shipping = shippingOptions.find((option) => option.id === shippingOption)?.price ?? 0
    const total = subtotal + shipping

    const emailError = attempted && !EMAIL.test(email.trim()) ? text.emailInvalid : undefined
    const addressErrors = attempted
      ? Object.fromEntries(
          REQUIRED.filter((field) => !address[field].trim()).map((field) => [field, text.required]),
        )
      : {}

    const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setAttempted(true)
      const valid =
        EMAIL.test(email.trim()) && REQUIRED.every((field) => address[field].trim())
      if (!valid) {
        requestAnimationFrame(() =>
          formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        )
        return
      }
      setSubmitting(true)
      try {
        await onSubmit({ email: email.trim(), marketing, address, shippingOption })
      } finally {
        setSubmitting(false)
      }
    }

    const section = (index: number, title: string, children: ReactNode) => (
      <section className="kg-checkout-form__section grid gap-4" aria-labelledby={`${id}-s${index}`}>
        <h2 id={`${id}-s${index}`} className="kg-checkout-form__heading flex items-center gap-2.5 m-0 text-kg-md font-[650]">
          <span
            className="kg-checkout-form__step inline-grid place-items-center size-6 shrink-0 rounded-full border-2 border-kg-ink bg-kg-accent text-kg-xs font-bold text-kg-accent-fg"
            aria-hidden="true"
          >
            {index}
          </span>
          {title}
        </h2>
        {children}
      </section>
    )

    let step = 0
    return (
      <form
        ref={composedRef}
        noValidate
        className={cx("kg-checkout-form grid gap-7 w-full max-w-xl text-kg-fg", className)}
        onSubmit={submit}
        {...props}
      >
        {section(
          ++step,
          text.contact,
          <div className="kg-checkout-form__fields grid gap-3">
            <Field label={text.email} error={emailError} required>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Checkbox
              size="sm"
              label={text.marketing}
              checked={marketing}
              onCheckedChange={setMarketing}
            />
          </div>,
        )}
        {section(
          ++step,
          text.shipping,
          <AddressForm
            value={address}
            onValueChange={setAddress}
            countries={countries}
            errors={addressErrors}
            labels={{ legend: text.shipping }}
          />,
        )}
        {shippingOptions.length > 0 &&
          section(
            ++step,
            text.delivery,
            <PaymentMethodSelector
              label={text.delivery}
              name="shipping-option"
              value={shippingOption}
              onValueChange={setShippingOption}
              methods={shippingOptions.map((option) => ({
                id: option.id,
                label: option.label,
                description: option.detail,
                aside: option.price === 0 ? text.free : formatMoney(option.price, money),
              }))}
            />,
          )}
        {payment != null && section(++step, text.payment, payment)}
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {text.submit(formatMoney(total, money))}
        </Button>
      </form>
    )
  },
)

CheckoutForm.displayName = "CheckoutForm"
