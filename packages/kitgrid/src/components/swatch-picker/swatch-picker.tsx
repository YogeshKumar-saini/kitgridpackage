"use client"

import { type CSSProperties, type FieldsetHTMLAttributes, forwardRef, useId } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export interface SwatchPickerOption {
  value: string
  /** Color name, shown in the legend once selected and announced for the swatch. */
  label: string
  /** Any CSS background: a color, gradient or `url()` texture. */
  color: string
  available?: boolean
}

export type SwatchPickerSize = "sm" | "md" | "lg"

export interface SwatchPickerProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "defaultValue" | "onChange"
> {
  label: string
  options: readonly SwatchPickerOption[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string) => void
  size?: SwatchPickerSize
  /** Print each color name under its swatch. */
  showNames?: boolean
  name?: string
  /** Appended to unavailable swatches' names. */
  unavailableLabel?: string
}

/*
 * Paper Layers: a swatch is a round chip with a soft edge. The chosen one takes an ink edge and
 * an offset, so the choice never rests on colour alone.
 */
export const swatchPickerVariants = variants({
  base: "kg-swatch-picker m-0 grid min-w-0 gap-2.5 border-0 p-0 text-kg-fg",
  variants: {
    size: {
      sm: "[--_size:1.75rem]",
      md: "[--_size:2.25rem]",
      lg: "[--_size:2.875rem]",
    },
  },
  defaults: { size: "md" },
})

/**
 * Round color swatches as native radios. The legend reads "Color: Sage" so the choice is never
 * conveyed by color alone, and sold-out colors keep a diagonal strike but stay focusable.
 */
export const SwatchPicker = forwardRef<HTMLFieldSetElement, SwatchPickerProps>(
  (
    {
      label,
      options,
      value: valueProp,
      defaultValue = null,
      onValueChange,
      size = "md",
      showNames = false,
      name,
      unavailableLabel = "sold out",
      className,
      ...props
    },
    ref,
  ) => {
    const generated = useId()
    const groupName = name ?? generated
    const [value, setValue] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((value: string | null) => void) | undefined,
    })
    const selected = options.find((option) => option.value === value)

    return (
      <fieldset
        ref={ref}
        className={swatchPickerVariants({ size, className })}
        data-size={size}
        {...props}
      >
        <legend className="kg-swatch-picker__legend mb-2.5 p-0 text-kg-sm font-semibold">
          {label}
          {selected && (
            <>
              {": "}
              <span className="kg-swatch-picker__selected font-normal text-kg-fg-muted">{selected.label}</span>
            </>
          )}
        </legend>
        <div className="kg-swatch-picker__options flex flex-wrap gap-3">
          {options.map((option) => {
            const unavailable = option.available === false
            return (
              <label
                key={option.value}
                className="kg-swatch-picker__option group/option relative grid cursor-pointer justify-items-center gap-1.5"
                data-unavailable={unavailable || undefined}
              >
                <input
                  type="radio"
                  className="kg-swatch-picker__input peer absolute inset-0 m-0 cursor-[inherit] opacity-0"
                  name={groupName}
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => setValue(option.value)}
                />
                <span
                  className={cx(
                    "kg-swatch-picker__swatch relative block size-(--_size) rounded-full border-2 border-kg-border",
                    "transition-[scale,translate,box-shadow,border-color] duration-(--kg-duration-base) ease-kg-out",
                    "group-hover/option:scale-105",
                    "peer-checked:-translate-px peer-checked:border-kg-ink peer-checked:shadow-kg-sm",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-kg-ring",
                    "group-data-unavailable/option:opacity-60",
                    "group-data-unavailable/option:after:absolute group-data-unavailable/option:after:inset-x-[-2px] group-data-unavailable/option:after:top-1/2 group-data-unavailable/option:after:h-0.5 group-data-unavailable/option:after:-translate-y-1/2 group-data-unavailable/option:after:-rotate-45 group-data-unavailable/option:after:bg-kg-ink",
                  )}
                  style={
                    {
                      "--_swatch": option.color,
                      background: `${option.color} center / cover`,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                />
                <span
                  className={
                    showNames
                      ? "kg-swatch-picker__name max-w-[calc(var(--_size)+2rem)] text-center text-kg-xs text-kg-fg-muted peer-checked:font-semibold peer-checked:text-kg-fg"
                      : "kg-visually-hidden"
                  }
                >
                  {option.label}
                  {unavailable && (
                    <span className="kg-visually-hidden">, {unavailableLabel}</span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
    )
  },
)

SwatchPicker.displayName = "SwatchPicker"
