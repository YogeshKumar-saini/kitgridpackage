"use client"

import {
  type ChangeEvent,
  forwardRef,
  type InputHTMLAttributes,
  type PointerEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"
import { joinIds, resolveFieldControl, useField } from "../field/field.js"

/*
 * Paper Layers: a white sheet with an ink edge. Focus lifts it off the page with an offset in
 * ink, or in danger while invalid.
 */
const sheet = [
  "rounded-kg-md px-(--_px)",
  "focus-within:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
]

export const inputVariants = variants({
  base: [
    "kg-input relative flex items-center gap-2 w-full min-w-0 text-kg-fg cursor-text",
    "border-2 border-(--_border) bg-(--_bg)",
    "transition-[background-color,border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
    "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kg-ring",
    "data-invalid:border-kg-danger data-invalid:[--_lift:var(--kg-danger)]",
    "data-readonly:bg-kg-surface-sunken",
    "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:shadow-none",
  ],
  variants: {
    variant: {
      outline: [sheet, "[--_border:var(--kg-ink)] [--_bg:var(--kg-surface)]"],
      filled: [
        sheet,
        "[--_border:transparent] [--_bg:var(--kg-muted)]",
        "focus-within:[--_border:var(--kg-ink)] focus-within:[--_bg:var(--kg-surface)]",
      ],
      underline: [
        "rounded-none border-x-0 border-t-0 px-0.5 [--_border:var(--kg-ink)] [--_bg:transparent]",
        "focus-within:shadow-[0_2px_0_var(--_lift,var(--kg-ink))]",
      ],
    },
    size: {
      sm: "h-kg-sm text-kg-sm [--_px:calc(var(--kg-space)*2.5)]",
      md: "h-kg-md text-kg-base [--_px:calc(var(--kg-space)*3)]",
      lg: "h-kg-lg text-kg-md [--_px:calc(var(--kg-space)*4)]",
    },
  },
  defaults: { variant: "outline", size: "md" },
})

type InputVariantProps = VariantProps<typeof inputVariants>
export type InputSize = NonNullable<InputVariantProps["size"]>
export type InputVariant = NonNullable<InputVariantProps["variant"]>

const adornment = (kind: "text" | "icon") =>
  cx(
    "kg-input__adornment inline-flex items-center shrink-0 leading-none select-none",
    "transition-colors duration-(--kg-duration-fast) ease-kg-out [&_svg]:size-[1.1em]",
    kind === "text"
      ? "text-kg-fg-muted whitespace-nowrap"
      : "text-kg-fg-faint [.kg-input:focus-within_&]:text-kg-fg-muted",
  )

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  size?: InputSize
  variant?: InputVariant
  /** Icon or text before the value, such as a search icon or "$". */
  leading?: ReactNode
  /** Icon or text after the value, such as ".com" or a unit. */
  trailing?: ReactNode
  invalid?: boolean
  /** Shows a clear button while the input has a value. Called after the value is emptied. */
  onClear?: () => void
  /** Accessible name of the clear button. */
  clearLabel?: string
}

const isText = (node: ReactNode): node is string | number =>
  typeof node === "string" || typeof node === "number"

// React tracks the last value it rendered; going through the native setter makes it see the
// change, so the input event below reaches onChange in controlled and uncontrolled mode alike.
const setNativeValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

const ClearIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="size-[0.875rem]">
    <path d="m5 5 6 6m0-6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "md",
      variant = "outline",
      leading,
      trailing,
      invalid: invalidProp,
      onClear,
      clearLabel = "Clear",
      className,
      style,
      id: idProp,
      disabled: disabledProp,
      required: requiredProp,
      readOnly = false,
      value,
      defaultValue,
      onChange,
      type = "text",
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
      ...props
    },
    forwardedRef,
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
    const local = useRef<HTMLInputElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const adornmentId = useId()
    const leadingId = isText(leading) ? `${adornmentId}-leading` : undefined
    const trailingId = isText(trailing) ? `${adornmentId}-trailing` : undefined

    const controlled = value !== undefined
    const [uncontrolledFilled, setUncontrolledFilled] = useState(
      defaultValue !== undefined && String(defaultValue).length > 0,
    )
    const filled = controlled ? String(value ?? "").length > 0 : uncontrolledFilled
    const clearable = Boolean(onClear) && filled && !control.disabled && !readOnly

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (!controlled) setUncontrolledFilled(event.currentTarget.value.length > 0)
      onChange?.(event)
    }

    const clear = () => {
      const input = local.current
      if (!input) return
      setNativeValue(input, "")
      onClear?.()
      input.focus()
    }

    // Clicks on padding or adornments focus the input, like a single native control.
    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement
      if (target === local.current || target.closest("button, a, input, select")) return
      event.preventDefault()
      local.current?.focus()
    }

    return (
      <div
        className={inputVariants({ variant, size, className })}
        style={style}
        data-size={size}
        data-variant={variant}
        data-invalid={control.invalid || undefined}
        data-disabled={control.disabled || undefined}
        data-readonly={readOnly || undefined}
        onPointerDown={handlePointerDown}
      >
        {leading != null && (
          <span
            id={leadingId}
            className={adornment(isText(leading) ? "text" : "icon")}
            data-side="leading"
            data-kind={isText(leading) ? "text" : "icon"}
          >
            {leading}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          id={control.id}
          className={cx(
            "kg-input__control flex-1 self-stretch min-w-0 m-0 p-0 border-0 bg-transparent",
            "[font:inherit] text-inherit caret-kg-accent-strong text-ellipsis outline-none",
            "placeholder:text-kg-fg-faint placeholder:opacity-100 disabled:cursor-not-allowed",
            "[&::-webkit-search-cancel-button]:appearance-none",
            "autofill:[-webkit-text-fill-color:var(--kg-fg)] autofill:[transition:background-color_600000s_0s]",
          )}
          disabled={control.disabled}
          required={control.required}
          readOnly={readOnly}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-invalid={control.invalid || undefined}
          aria-describedby={joinIds(control.describedBy, leadingId, trailingId)}
          aria-errormessage={control.errorMessage}
          {...props}
        />
        {clearable && (
          <button
            type="button"
            className={cx(
              "kg-input__clear relative inline-grid place-items-center shrink-0 size-[1.375rem] -mx-0.5 p-0",
              "border-0 rounded-full bg-kg-muted text-kg-fg-muted cursor-pointer",
              "transition-[background-color,color,scale] duration-(--kg-duration-fast) ease-kg-out",
              "animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
              "before:absolute before:-inset-[5px]",
              "hover:bg-kg-border hover:text-kg-fg active:scale-90",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            )}
            aria-label={clearLabel}
            onClick={clear}
          >
            <ClearIcon />
          </button>
        )}
        {trailing != null && (
          <span
            id={trailingId}
            className={adornment(isText(trailing) ? "text" : "icon")}
            data-side="trailing"
            data-kind={isText(trailing) ? "text" : "icon"}
          >
            {trailing}
          </span>
        )}
      </div>
    )
  },
)

Input.displayName = "Input"
