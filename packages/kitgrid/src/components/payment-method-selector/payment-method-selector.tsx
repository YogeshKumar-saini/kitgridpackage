"use client"

import {
  type FieldsetHTMLAttributes,
  forwardRef,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"

export interface PaymentMethodSelectorMethod {
  id: string
  label: string
  /** One short line, e.g. "Visa ending 4242" or "Pay in 4". */
  description?: ReactNode
  /** Announced text at the end of the row, such as a price. */
  aside?: ReactNode
  /** Brand marks or an icon, shown at the end of the row. Decorative. */
  icon?: ReactNode
  /** Revealed under the row while selected, such as card fields. */
  content?: ReactNode
  disabled?: boolean
}

export interface PaymentMethodSelectorProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "defaultValue" | "onChange"
> {
  methods: readonly PaymentMethodSelectorMethod[]
  value?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  /** The group's legend. */
  label?: string
  showLabel?: boolean
  name?: string
}

// `inert` is set imperatively: React 18 and 19 disagree on how the attribute is passed.
const Reveal = ({ open, children }: { open: boolean; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.toggleAttribute("inert", !open)
  }, [open])
  return (
    <div
      ref={ref}
      className="kg-payment-methods__reveal grid grid-rows-[0fr] transition-[grid-template-rows] duration-[var(--kg-duration-slow)] ease-kg-out group-data-[state=checked]/method:grid-rows-[1fr]"
    >
      <div className="kg-payment-methods__content min-h-0 overflow-hidden px-4 opacity-0 transition-opacity duration-(--kg-duration-base) ease-kg-out group-data-[state=checked]/method:pb-4 group-data-[state=checked]/method:opacity-100">
        {children}
      </div>
    </div>
  )
}

/**
 * Payment options as a stack of radio rows. The chosen row expands to reveal its fields, the
 * way Shopify and Stripe present cards, wallets and pay-later side by side.
 */
export const PaymentMethodSelector = forwardRef<HTMLFieldSetElement, PaymentMethodSelectorProps>(
  (
    {
      methods,
      value: valueProp,
      defaultValue,
      onValueChange,
      label = "Payment method",
      showLabel = false,
      name,
      className,
      ...props
    },
    ref,
  ) => {
    const generated = useId()
    const groupName = name ?? generated
    const [value, setValue] = useControllableState<string | undefined>({
      value: valueProp,
      defaultValue: defaultValue ?? methods.find((method) => !method.disabled)?.id,
      onChange: onValueChange as ((id: string | undefined) => void) | undefined,
    })

    return (
      <fieldset ref={ref} className={cx("kg-payment-methods m-0 min-w-0 border-0 p-0 text-kg-fg", className)} {...props}>
        <legend
          className={
            showLabel
              ? "kg-payment-methods__legend mb-3 p-0 text-kg-md font-semibold"
              : "kg-visually-hidden"
          }
        >
          {label}
        </legend>
        <div className="kg-payment-methods__stack grid gap-2">
          {methods.map((method) => {
            const selected = value === method.id
            const inputId = `${generated}-${method.id}`
            return (
              <div
                key={method.id}
                className={cx(
                  "kg-payment-methods__method group/method relative rounded-kg-lg border-2 bg-kg-surface",
                  "transition-[border-color,box-shadow,background-color] duration-(--kg-duration-fast) ease-kg-out",
                  "data-[state=unchecked]:border-kg-border data-disabled:opacity-50",
                  "data-[state=checked]:border-kg-ink data-[state=checked]:bg-kg-paper-sage data-[state=checked]:shadow-kg-sm",
                )}
                data-state={selected ? "checked" : "unchecked"}
                data-disabled={method.disabled || undefined}
              >
                <label
                  className="kg-payment-methods__row flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 group-data-disabled/method:cursor-not-allowed"
                  htmlFor={inputId}
                >
                  <input
                    id={inputId}
                    type="radio"
                    className="kg-payment-methods__input peer absolute m-0 size-px opacity-0"
                    name={groupName}
                    value={method.id}
                    checked={selected}
                    disabled={method.disabled}
                    onChange={() => setValue(method.id)}
                  />
                  <span
                    className={cx(
                      "kg-payment-methods__radio grid size-[1.125rem] shrink-0 place-items-center rounded-full border-2 border-kg-ink bg-kg-surface",
                      "after:size-2 after:scale-0 after:rounded-full after:bg-kg-accent-fg after:transition-[scale] after:duration-(--kg-duration-base) after:ease-kg-out",
                      "peer-checked:bg-kg-accent peer-checked:after:scale-100",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-kg-ring",
                    )}
                    aria-hidden="true"
                  />
                  <span className="kg-payment-methods__text grid min-w-0 flex-1">
                    <span className="kg-payment-methods__label text-kg-sm font-semibold">{method.label}</span>
                    {method.description != null && (
                      <span className="kg-payment-methods__description text-kg-xs text-kg-fg-muted">
                        {method.description}
                      </span>
                    )}
                  </span>
                  {method.aside != null && (
                    <span className="kg-payment-methods__aside text-kg-sm font-semibold tabular-nums">{method.aside}</span>
                  )}
                  {method.icon != null && (
                    <span
                      className="kg-payment-methods__icon inline-flex gap-1 text-kg-fg-muted [&_svg]:h-5 [&_svg]:w-auto"
                      aria-hidden="true"
                    >
                      {method.icon}
                    </span>
                  )}
                </label>
                {method.content != null && (
                  <Reveal open={selected}>{method.content}</Reveal>
                )}
              </div>
            )
          })}
        </div>
      </fieldset>
    )
  },
)

PaymentMethodSelector.displayName = "PaymentMethodSelector"
