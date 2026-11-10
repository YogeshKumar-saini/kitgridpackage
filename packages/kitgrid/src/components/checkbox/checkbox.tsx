"use client"

import {
  type ChangeEvent,
  createContext,
  type FieldsetHTMLAttributes,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useContext,
  useId,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"
import { FieldContext, joinIds, resolveFieldControl, useField } from "../field/field.js"

export const checkboxVariants = variants({
  base: [
    "kg-checkbox flex items-start gap-2.5 w-fit max-w-full leading-[1.45] text-kg-fg",
    "[--_edge:var(--kg-ink)] [--_on:var(--kg-accent)] [--_on-fg:var(--kg-accent-fg)]",
    "data-invalid:[--_edge:var(--kg-danger)] data-invalid:[--_on:var(--kg-danger)] data-invalid:[--_on-fg:var(--kg-danger-fg)]",
    "has-[input:disabled]:opacity-50",
  ],
  variants: {
    size: {
      sm: "text-kg-sm [--_box:1rem]",
      md: "text-kg-base [--_box:1.125rem]",
      lg: "text-kg-md [--_box:1.375rem]",
    },
  },
  defaults: { size: "md" },
})

export type CheckboxSize = NonNullable<VariantProps<typeof checkboxVariants>["size"]>

// The mark draws on along its length once the input before the box is checked.
const mark = cx(
  "[stroke-dasharray:1] [stroke-dashoffset:1]",
  "transition-[stroke-dashoffset] duration-(--kg-duration-base) ease-kg-out",
)

interface CheckboxGroupContextValue {
  value: readonly string[]
  setChecked: (value: string, checked: boolean) => void
  name: string | undefined
  size: CheckboxSize
  invalid: boolean
}

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null)

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size" | "children" | "value"
> {
  size?: CheckboxSize
  label?: ReactNode
  description?: ReactNode
  /** Shows a dash and reports `aria-checked="mixed"`. Cleared by the browser on click. */
  indeterminate?: boolean
  invalid?: boolean
  /** Identifies the checkbox inside a CheckboxGroup, and is its submitted form value. */
  value?: string
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      size: sizeProp,
      label,
      description,
      indeterminate = false,
      invalid: invalidProp,
      value,
      checked: checkedProp,
      defaultChecked,
      onChange,
      onCheckedChange,
      className,
      style,
      id: idProp,
      name,
      disabled: disabledProp,
      required: requiredProp,
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
      ...props
    },
    forwardedRef,
  ) => {
    const group = useContext(CheckboxGroupContext)
    const field = useField()
    const control = resolveFieldControl(field, {
      id: idProp,
      disabled: disabledProp,
      required: requiredProp,
      invalid: invalidProp ?? (group?.invalid || undefined),
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
    })
    const generated = useId()
    const id = control.id ?? `${generated}-input`
    const descriptionId = description != null ? `${generated}-description` : undefined
    const local = useRef<HTMLInputElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const grouped = group !== null && value !== undefined
    const size = sizeProp ?? group?.size ?? "md"

    // `indeterminate` exists only as a DOM property. Re-applied on every render because a
    // click clears it natively, and the prop should keep winning while it is set.
    useIsomorphicLayoutEffect(() => {
      if (local.current) local.current.indeterminate = indeterminate
    })

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.currentTarget.checked
      if (grouped) group.setChecked(value, next)
      onChange?.(event)
      onCheckedChange?.(next)
    }

    return (
      <div
        className={checkboxVariants({ size, className })}
        style={style}
        data-size={size}
        data-invalid={control.invalid || undefined}
      >
        <span className="kg-checkbox__control relative grid place-items-center shrink-0 h-[1.45em]">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={cx(
              "kg-checkbox__input peer absolute top-1/2 left-1/2 z-1 m-0 -translate-x-1/2 -translate-y-1/2",
              "size-[calc(var(--_box)+0.5rem)] opacity-0 cursor-pointer disabled:cursor-not-allowed",
            )}
            name={name ?? group?.name}
            value={value}
            checked={grouped ? group.value.includes(value) : checkedProp}
            defaultChecked={grouped ? undefined : defaultChecked}
            disabled={control.disabled}
            required={control.required}
            onChange={handleChange}
            aria-invalid={control.invalid || undefined}
            aria-describedby={joinIds(descriptionId, control.describedBy)}
            aria-errormessage={control.errorMessage}
            {...props}
          />
          <span
            className={cx(
              "kg-checkbox__box grid place-items-center size-(--_box) rounded-kg-xs",
              "border-2 border-(--_edge) bg-kg-surface text-(--_on-fg)",
              "transition-[background-color,border-color,box-shadow,scale] duration-(--kg-duration-fast) ease-kg-out",
              "peer-[:hover:enabled]:shadow-[2px_2px_0_var(--_edge)] peer-[:active:enabled]:scale-90",
              "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-kg-ring",
              "peer-checked:border-(--_on) peer-checked:bg-(--_on)",
              "peer-indeterminate:border-(--_on) peer-indeterminate:bg-(--_on)",
            )}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 16 16"
              focusable="false"
              className="size-full overflow-visible fill-none stroke-current [stroke-width:2.5] [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path
                className={cx(
                  "kg-checkbox__check",
                  mark,
                  "[.peer:checked:not(:indeterminate)~*_&]:[stroke-dashoffset:0]",
                )}
                d="M3.75 8.4 6.6 11.2 12.25 5.1"
                pathLength={1}
              />
              <path
                className={cx(
                  "kg-checkbox__dash",
                  mark,
                  "[.peer:indeterminate~*_&]:[stroke-dashoffset:0]",
                )}
                d="M4.25 8h7.5"
                pathLength={1}
              />
            </svg>
          </span>
        </span>
        {(label != null || description != null) && (
          <span className="kg-checkbox__text grid gap-0.5 min-w-0">
            {label != null && (
              <label
                htmlFor={id}
                className={cx(
                  "kg-checkbox__label font-medium select-none",
                  control.disabled ? "cursor-not-allowed" : "cursor-pointer",
                )}
              >
                {label}
              </label>
            )}
            {description != null && (
              <span
                id={descriptionId}
                className="kg-checkbox__description text-[0.93em] text-kg-fg-muted"
              >
                {description}
              </span>
            )}
          </span>
        )}
      </div>
    )
  },
)

Checkbox.displayName = "Checkbox"

export interface CheckboxGroupProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "defaultValue" | "onChange"
> {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** Rendered as the fieldset's legend. */
  label?: ReactNode
  description?: ReactNode
  orientation?: "horizontal" | "vertical"
  size?: CheckboxSize
  invalid?: boolean
  /** Shared `name` for every checkbox, so the form submits each checked value. */
  name?: string
}

const EMPTY: string[] = []

export const CheckboxGroup = forwardRef<HTMLFieldSetElement, CheckboxGroupProps>(
  (
    {
      value: valueProp,
      defaultValue = EMPTY,
      onValueChange,
      label,
      description,
      orientation = "vertical",
      size = "md",
      invalid: invalidProp,
      name,
      disabled: disabledProp,
      className,
      children,
      "aria-describedby": ariaDescribedBy,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref,
  ) => {
    const field = useField()
    const control = resolveFieldControl(field, {
      disabled: disabledProp,
      invalid: invalidProp,
      "aria-describedby": ariaDescribedBy,
    })
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const generated = useId()
    const descriptionId = description != null ? `${generated}-description` : undefined

    const context: CheckboxGroupContextValue = {
      value,
      name,
      size,
      invalid: control.invalid,
      setChecked: (item, checked) =>
        setValue((previous) =>
          checked
            ? previous.includes(item)
              ? previous
              : [...previous, item]
            : previous.filter((entry) => entry !== item),
        ),
    }

    return (
      <fieldset
        ref={ref}
        className={cx("kg-checkbox-group grid gap-3 min-w-0 m-0 p-0 border-0", className)}
        data-orientation={orientation}
        data-invalid={control.invalid || undefined}
        disabled={control.disabled}
        aria-labelledby={
          ariaLabelledBy ?? (label == null ? control.labelId : undefined)
        }
        aria-describedby={joinIds(descriptionId, control.describedBy)}
        {...props}
      >
        {label != null && (
          <legend className="kg-checkbox-group__legend float-left w-full p-0 mb-1 text-kg-sm font-semibold leading-[1.35] text-kg-fg">
            {label}
          </legend>
        )}
        {description != null && (
          <p
            id={descriptionId}
            className="kg-checkbox-group__description m-0 -mt-2 text-kg-sm text-kg-fg-muted"
          >
            {description}
          </p>
        )}
        <FieldContext.Provider value={null}>
          <CheckboxGroupContext.Provider value={context}>
            <div
              className={cx(
                "kg-checkbox-group__items flex",
                orientation === "horizontal" ? "flex-row flex-wrap gap-x-6 gap-y-3" : "flex-col gap-3",
              )}
            >
              {children}
            </div>
          </CheckboxGroupContext.Provider>
        </FieldContext.Provider>
      </fieldset>
    )
  },
)

CheckboxGroup.displayName = "CheckboxGroup"
