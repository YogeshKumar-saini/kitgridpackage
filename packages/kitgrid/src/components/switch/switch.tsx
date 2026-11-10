"use client"

import {
  type ChangeEvent,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
} from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"
import { joinIds, resolveFieldControl, useField } from "../field/field.js"

/*
 * Paper Layers: a white track with an ink edge and an ink thumb. On, the track fills with ink
 * and the thumb turns mint.
 */
export const switchVariants = variants({
  base: [
    "kg-switch flex items-start gap-3 max-w-full leading-[1.45] text-kg-fg",
    "[--_edge:var(--kg-ink)] [--_on:var(--kg-accent)] [--_on-fg:var(--kg-accent-fg)]",
    "data-invalid:[--_edge:var(--kg-danger)] data-invalid:[--_on:var(--kg-danger)] data-invalid:[--_on-fg:var(--kg-danger-fg)]",
    "has-[input:disabled]:opacity-50",
  ],
  variants: {
    size: {
      sm: "text-kg-sm [--_w:2rem] [--_h:1.125rem] [--_travel:0.875rem] rtl:[--_travel:-0.875rem]",
      md: "text-kg-base [--_w:2.5rem] [--_h:1.375rem] [--_travel:1.125rem] rtl:[--_travel:-1.125rem]",
      lg: "text-kg-md [--_w:3.125rem] [--_h:1.75rem] [--_travel:1.375rem] rtl:[--_travel:-1.375rem]",
    },
    labelPosition: {
      start: "flex-row-reverse justify-between w-full",
      end: "w-fit",
    },
  },
  defaults: { size: "md", labelPosition: "end" },
})

export type SwitchSize = NonNullable<VariantProps<typeof switchVariants>["size"]>

const icon = cx(
  "kg-switch__icon absolute inset-0 grid place-items-center [&_svg]:size-[70%]",
  "transition-[opacity,scale] duration-(--kg-duration-base) ease-kg-out",
)

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size" | "children" | "role"
> {
  size?: SwitchSize
  label?: ReactNode
  description?: ReactNode
  /** Put the label before the switch, as in settings lists. */
  labelPosition?: "start" | "end"
  /** Icon inside the thumb while on. Decorative. */
  onIcon?: ReactNode
  /** Icon inside the thumb while off. Decorative. */
  offIcon?: ReactNode
  invalid?: boolean
  onCheckedChange?: (checked: boolean) => void
}

/** A native checkbox exposed as `role="switch"`: forms, reset and autofill keep working. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      size = "md",
      label,
      description,
      labelPosition = "end",
      onIcon,
      offIcon,
      invalid: invalidProp,
      onChange,
      onCheckedChange,
      className,
      style,
      id: idProp,
      disabled: disabledProp,
      required: requiredProp,
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
      ...props
    },
    ref,
  ) => {
    const field = useField()
    const control = resolveFieldControl(field, {
      id: idProp,
      disabled: disabledProp,
      required: requiredProp,
      invalid: invalidProp,
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
    })
    const generated = useId()
    const id = control.id ?? `${generated}-input`
    const descriptionId = description != null ? `${generated}-description` : undefined

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event)
      onCheckedChange?.(event.currentTarget.checked)
    }

    return (
      <div
        className={switchVariants({ size, labelPosition, className })}
        style={style}
        data-size={size}
        data-label-position={labelPosition}
        data-invalid={control.invalid || undefined}
      >
        <span className="kg-switch__control relative grid items-center shrink-0 min-h-[1.45em]">
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={id}
            className="kg-switch__input peer absolute inset-0 z-1 size-full m-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
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
              "kg-switch__track relative block w-(--_w) h-(--_h) p-[2px] rounded-full",
              "border-2 border-(--_edge) bg-kg-surface",
              "transition-[background-color,border-color,box-shadow] duration-(--kg-duration-base) ease-kg-out",
              "peer-[:hover:enabled]:shadow-[2px_2px_0_var(--_edge)]",
              "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-kg-ring",
              "peer-checked:border-(--_on) peer-checked:bg-(--_on)",
            )}
            aria-hidden="true"
          >
            <span
              className={cx(
                "kg-switch__thumb relative grid place-items-center size-[calc(var(--_h)-8px)] rounded-full",
                "bg-(--_edge) text-kg-surface",
                "transition-[translate,scale,background-color,color] duration-(--kg-duration-base) ease-kg-out",
                "[.peer:checked~*_&]:translate-x-(--_travel)",
                "[.peer:checked~*_&]:bg-(--_on-fg) [.peer:checked~*_&]:text-(--_on)",
                "[.peer:active:enabled~*_&]:scale-x-110",
              )}
            >
              {onIcon != null && (
                <span
                  className={cx(
                    icon,
                    "opacity-0 scale-50 [.peer:checked~*_&]:opacity-100 [.peer:checked~*_&]:scale-100",
                  )}
                  data-when="on"
                >
                  {onIcon}
                </span>
              )}
              {offIcon != null && (
                <span
                  className={cx(icon, "[.peer:checked~*_&]:opacity-0 [.peer:checked~*_&]:scale-50")}
                  data-when="off"
                >
                  {offIcon}
                </span>
              )}
            </span>
          </span>
        </span>
        {(label != null || description != null) && (
          <span className="kg-switch__text grid gap-0.5 min-w-0">
            {label != null && (
              <label
                htmlFor={id}
                className={cx(
                  "kg-switch__label font-medium select-none",
                  control.disabled ? "cursor-not-allowed" : "cursor-pointer",
                )}
              >
                {label}
              </label>
            )}
            {description != null && (
              <span
                id={descriptionId}
                className="kg-switch__description text-[0.93em] text-kg-fg-muted"
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

Switch.displayName = "Switch"
