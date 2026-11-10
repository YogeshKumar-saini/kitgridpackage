"use client"

import {
  type ChangeEvent,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useContext,
  useId,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { FieldContext, joinIds, resolveFieldControl, useField } from "../field/field.js"

export type RadioGroupVariant = "default" | "card"
export type RadioGroupSize = "sm" | "md" | "lg"

interface RadioGroupContextValue {
  name: string
  value: string | null
  select: (value: string) => void
  disabled: boolean
  required: boolean
  invalid: boolean
  variant: RadioGroupVariant
  size: RadioGroupSize
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

export interface RadioGroupProps<T extends string = string> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  /** The selected value, or `null` for none. Leave undefined for an uncontrolled group. */
  value?: T | null
  defaultValue?: T | null
  onValueChange?: (value: T) => void
  /** Shared native `name`. Generated when omitted; set it to submit the value with a form. */
  name?: string
  orientation?: "horizontal" | "vertical"
  /** `card` turns every item into a rich selectable card. */
  variant?: RadioGroupVariant
  size?: RadioGroupSize
  disabled?: boolean
  required?: boolean
  invalid?: boolean
}

const RadioGroupImpl = forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      value: valueProp,
      defaultValue = null,
      onValueChange,
      name,
      orientation = "vertical",
      variant = "default",
      size = "md",
      disabled: disabledProp,
      required: requiredProp,
      invalid: invalidProp,
      className,
      children,
      "aria-describedby": ariaDescribedBy,
      "aria-labelledby": ariaLabelledBy,
      "aria-errormessage": ariaErrorMessage,
      ...props
    },
    ref,
  ) => {
    const field = useField()
    const control = resolveFieldControl(field, {
      disabled: disabledProp,
      required: requiredProp,
      invalid: invalidProp,
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
    })
    const generatedName = useId()
    const [value, setValue] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: (next) => {
        if (next !== null) onValueChange?.(next)
      },
    })

    const context: RadioGroupContextValue = {
      name: name ?? generatedName,
      value,
      select: setValue,
      disabled: control.disabled,
      required: control.required,
      invalid: control.invalid,
      variant,
      size,
    }

    return (
      <div
        ref={ref}
        role="radiogroup"
        id={control.id}
        className={cx(
          "kg-radio-group min-w-0",
          variant === "card"
            ? cx(
                "grid gap-2.5",
                orientation === "vertical"
                  ? "grid-cols-[minmax(0,1fr)]"
                  : "grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]",
              )
            : orientation === "horizontal"
              ? "flex flex-row flex-wrap gap-x-6 gap-y-3"
              : "flex flex-col gap-3",
          className,
        )}
        data-orientation={orientation}
        data-variant={variant}
        data-disabled={control.disabled || undefined}
        aria-orientation={orientation}
        aria-labelledby={ariaLabelledBy ?? control.labelId}
        aria-describedby={control.describedBy}
        aria-required={control.required || undefined}
        aria-invalid={control.invalid || undefined}
        aria-errormessage={control.errorMessage}
        aria-disabled={control.disabled || undefined}
        {...props}
      >
        <FieldContext.Provider value={null}>
          <RadioGroupContext.Provider value={context}>
            {children}
          </RadioGroupContext.Provider>
        </FieldContext.Provider>
      </div>
    )
  },
)

RadioGroupImpl.displayName = "RadioGroup"

/**
 * Native radios sharing one `name`, so arrow keys, Tab-to-selected and form submission come
 * from the browser. Pass a string union as `T` to type `value` and `onValueChange`.
 */
export const RadioGroup = RadioGroupImpl as unknown as (<T extends string = string>(
  props: RadioGroupProps<T> & RefAttributes<HTMLDivElement>,
) => ReactElement | null) & { displayName?: string }

export interface RadioGroupItemProps<T extends string = string> extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "size" | "children" | "name" | "checked" | "defaultChecked"
> {
  value: T
  /** The item's name; the title in the card variant. */
  label?: ReactNode
  description?: ReactNode
  /** Leading visual in the card variant, such as an icon or logo. */
  icon?: ReactNode
  /** Extra content in the card variant, such as a price, aligned to the end. */
  children?: ReactNode
}

const radioSize: Record<RadioGroupSize, string> = {
  sm: "[--_dot:1rem] [--_text:var(--kg-text-sm)]",
  md: "[--_dot:1.125rem] [--_text:var(--kg-text-base)]",
  lg: "[--_dot:1.375rem] [--_text:var(--kg-text-md)]",
}

const RadioGroupItemImpl = forwardRef<HTMLInputElement, RadioGroupItemProps>(
  (
    {
      value,
      label,
      description,
      icon,
      children,
      disabled: disabledProp,
      className,
      style,
      onChange,
      id: idProp,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const group = useContext(RadioGroupContext)
    if (!group) throw new Error("RadioGroupItem must be rendered inside a RadioGroup.")
    const generated = useId()
    const id = idProp ?? `${generated}-input`
    const labelId = label != null ? `${generated}-label` : undefined
    const descriptionId = description != null ? `${generated}-description` : undefined
    const disabled = disabledProp ?? group.disabled
    const checked = group.value === value
    const card = group.variant === "card"

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event)
      if (event.currentTarget.checked) group.select(value)
    }

    return (
      <label
        htmlFor={id}
        className={cx(
          "kg-radio relative flex items-start max-w-full leading-[1.45] text-kg-fg cursor-pointer select-none",
          "[-webkit-tap-highlight-color:transparent] text-(length:--_text)",
          "[--_edge:var(--kg-ink)] [--_on:var(--kg-accent)] [--_on-fg:var(--kg-accent-fg)]",
          "data-invalid:[--_edge:var(--kg-danger)] data-invalid:[--_on:var(--kg-danger)] data-invalid:[--_on-fg:var(--kg-danger-fg)]",
          "data-disabled:cursor-not-allowed data-disabled:opacity-50",
          radioSize[group.size],
          card
            ? cx(
                "w-auto gap-3 px-4 py-3.5 rounded-kg-xl border-2 border-(--_edge)",
                "transition-[translate,scale,box-shadow,background-color] duration-(--kg-duration-fast) ease-kg-out",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-kg-ring",
                "not-data-disabled:hover:-translate-px not-data-disabled:hover:shadow-[3px_3px_0_var(--_edge)]",
                "not-data-disabled:active:translate-x-0 not-data-disabled:active:translate-y-0 not-data-disabled:active:shadow-none",
                checked ? "bg-kg-paper-sage shadow-[3px_3px_0_var(--_edge)]" : "bg-kg-surface",
              )
            : "w-fit gap-2.5",
          className,
        )}
        style={style}
        data-variant={group.variant}
        data-size={group.size}
        data-state={checked ? "checked" : "unchecked"}
        data-disabled={disabled || undefined}
        data-invalid={group.invalid || undefined}
      >
        <span
          className={cx(
            "kg-radio__control relative grid place-items-center shrink-0 h-[1.45em]",
            card && cx("order-3 self-center", children == null && "ms-auto"),
          )}
        >
          <input
            ref={ref}
            type="radio"
            id={id}
            className={cx(
              "kg-radio__input peer absolute top-1/2 left-1/2 m-0 -translate-x-1/2 -translate-y-1/2",
              "size-[calc(var(--_dot)+0.5rem)] opacity-0 cursor-[inherit]",
            )}
            name={group.name}
            value={value}
            checked={checked}
            disabled={disabled}
            required={group.required}
            onChange={handleChange}
            aria-labelledby={labelId}
            aria-describedby={joinIds(descriptionId, ariaDescribedBy)}
            {...props}
          />
          <span
            className={cx(
              "kg-radio__indicator grid place-items-center size-(--_dot) rounded-full border-2 border-(--_edge) bg-kg-surface",
              "transition-[background-color,border-color,box-shadow,scale] duration-(--kg-duration-fast) ease-kg-out",
              "peer-[:hover:enabled]:shadow-[2px_2px_0_var(--_edge)] peer-[:active:enabled]:scale-90",
              !card && "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-kg-ring",
              "peer-checked:border-(--_on) peer-checked:bg-(--_on)",
              "after:size-[42%] after:rounded-full after:bg-(--_on-fg) after:scale-0",
              "after:transition-[scale] after:duration-(--kg-duration-base) after:ease-kg-out peer-checked:after:scale-100",
            )}
            aria-hidden="true"
          />
        </span>
        {card && icon != null && (
          <span
            className={cx(
              "kg-radio__icon grid place-items-center shrink-0 size-[2.25rem] rounded-kg-md [&_svg]:size-[1.15rem]",
              "transition-[color,background-color] duration-(--kg-duration-fast) ease-kg-out",
              checked ? "text-(--_on-fg) bg-(--_on)" : "text-kg-fg-muted bg-kg-muted",
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        {(label != null || description != null) && (
          <span className="kg-radio__text grid gap-0.5 min-w-0">
            {label != null && (
              <span
                id={labelId}
                className={cx("kg-radio__label", card ? "font-semibold tracking-[-0.005em]" : "font-medium")}
              >
                {label}
              </span>
            )}
            {description != null && (
              <span id={descriptionId} className="kg-radio__description text-[0.93em] text-kg-fg-muted">
                {description}
              </span>
            )}
          </span>
        )}
        {children != null && (
          <span className="kg-radio__extra order-2 ms-auto self-center font-[550] tabular-nums text-kg-fg">
            {children}
          </span>
        )}
      </label>
    )
  },
)

RadioGroupItemImpl.displayName = "RadioGroupItem"

export const RadioGroupItem = RadioGroupItemImpl as unknown as (<
  T extends string = string,
>(
  props: RadioGroupItemProps<T> & RefAttributes<HTMLInputElement>,
) => ReactElement | null) & { displayName?: string }
