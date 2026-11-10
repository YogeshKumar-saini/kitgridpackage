"use client"

import { type CSSProperties, forwardRef, type HTMLAttributes, useId } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { CheckIcon, PlusIcon } from "../chat-message/internal/icons.js"

export interface AccentPickerOption {
  value: string
  /** Spoken and shown as a tooltip; color alone never names a swatch. */
  label: string
  /** The swatch color. Defaults to `value`. */
  color?: string
}

export type AccentPickerSize = "sm" | "md" | "lg"

export interface AccentPickerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  options: readonly AccentPickerOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Adds a native color input for any color. It reports a hex value. */
  allowCustom?: boolean
  customLabel?: string
  /** Native radio `name`, to submit the choice with a form. Generated when omitted. */
  name?: string
  size?: AccentPickerSize
}

const HEX = /^#[\da-f]{6}$/i

const pickerVariants = variants({
  base: "kg-accent-picker flex flex-wrap items-center gap-2",
  variants: {
    size: {
      sm: "[--_size:1.375rem]",
      md: "[--_size:1.75rem]",
      lg: "[--_size:2.25rem]",
    },
  },
  defaults: { size: "md" },
})

/*
 * Paper Layers: each swatch is a small sheet of colour edged in ink. The chosen one lifts off the
 * page on an ink offset; the check is drawn in whichever of dark or light reads on the colour.
 */
const swatchClass = cx(
  "kg-accent-picker__swatch group/swatch relative grid size-(--_size) place-items-center cursor-pointer",
  "rounded-kg-sm border-2 border-kg-ink bg-kg-surface text-kg-accent-fg [-webkit-tap-highlight-color:transparent]",
  "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "hover:-translate-px hover:shadow-kg-xs active:translate-0 active:shadow-none",
  "has-checked:-translate-px has-checked:shadow-kg-sm data-checked:-translate-px data-checked:shadow-kg-sm",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-kg-ring",
  "data-custom:not-data-checked:border-dashed",
)

const inputClass =
  "kg-accent-picker__input absolute inset-0 m-0 size-full border-0 p-0 opacity-0 cursor-[inherit]"

const dotClass = cx(
  "kg-accent-picker__dot pointer-events-none grid size-full place-items-center rounded-[calc(var(--kg-radius-sm)-2px)]",
  "bg-(--_swatch) text-[length:calc(var(--_size)*0.42)]",
  "[&_svg]:scale-40 [&_svg]:opacity-0 [&_svg]:[stroke-width:3]",
  "[&_svg]:transition-[opacity,scale] [&_svg]:duration-(--kg-duration-fast) [&_svg]:ease-kg-out",
  "group-has-checked/swatch:[&_svg]:scale-100 group-has-checked/swatch:[&_svg]:opacity-100",
  "group-data-custom/swatch:[&_svg]:scale-100 group-data-custom/swatch:[&_svg]:opacity-100",
)

/** Dark or light ink, whichever reads on the swatch colour. */
const inkOn = (color: string): CSSProperties => ({
  "--_swatch": color,
  color: `oklch(from ${color} clamp(0.16, (0.62 - l) * 100, 0.98) 0.01 h)`,
}) as CSSProperties

/** Accent swatches as a native radio group, plus an optional custom color. */
export const AccentPicker = forwardRef<HTMLDivElement, AccentPickerProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue,
      onValueChange,
      allowCustom = false,
      customLabel = "Custom color",
      name,
      size = "md",
      className,
      "aria-label": ariaLabel = "Accent color",
      ...props
    },
    ref,
  ) => {
    const generatedName = useId()
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? options[0]?.value ?? "",
      onChange: onValueChange,
    })
    const custom = allowCustom && !options.some((option) => option.value === value)

    return (
      <div
        ref={ref}
        className={pickerVariants({ size, className })}
        data-size={size}
        {...props}
      >
        <div
          role="radiogroup"
          aria-label={ariaLabel}
          className="kg-accent-picker__group contents"
        >
          {options.map((option) => (
            <label
              key={option.value}
              className={swatchClass}
              title={option.label}
              style={inkOn(option.color ?? option.value)}
            >
              <input
                type="radio"
                className={inputClass}
                name={name ?? generatedName}
                value={option.value}
                checked={option.value === value}
                aria-label={option.label}
                onChange={(event) => {
                  if (event.currentTarget.checked) setValue(option.value)
                }}
              />
              <span className={dotClass} aria-hidden="true">
                <CheckIcon />
              </span>
            </label>
          ))}
        </div>
        {allowCustom && (
          <label
            className={swatchClass}
            data-custom=""
            data-checked={custom || undefined}
            title={customLabel}
            style={custom ? inkOn(value) : undefined}
          >
            <input
              type="color"
              className={inputClass}
              aria-label={customLabel}
              value={custom && HEX.test(value) ? value : "#e8762c"}
              onChange={(event) => setValue(event.currentTarget.value)}
            />
            <span
              className={cx(dotClass, !custom && "text-kg-fg")}
              aria-hidden="true"
            >
              {custom ? <CheckIcon /> : <PlusIcon />}
            </span>
          </label>
        )}
      </div>
    )
  },
)

AccentPicker.displayName = "AccentPicker"
