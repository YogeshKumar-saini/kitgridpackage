"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { OptionTile } from "../option-tile/option-tile.js"

export interface FontPickerOption {
  value: string
  label: string
  /** CSS `font-family` the option is previewed in. */
  family: string
  /** A short line on its character, shown in the interface font. */
  note?: ReactNode
}

export interface FontPickerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  options: readonly FontPickerOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** The glyphs each option is previewed with. */
  sample?: string
  /** Native radio `name`, to submit the choice with a form. Generated when omitted. */
  name?: string
}

/** Typefaces as a native radio list, each previewed in its own face. */
export const FontPicker = forwardRef<HTMLDivElement, FontPickerProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue,
      onValueChange,
      sample = "Aa",
      name,
      className,
      "aria-label": ariaLabel = "Typeface",
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

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label={ariaLabel}
        className={cx("kg-font-picker grid min-w-0 gap-1.5", className)}
        {...props}
      >
        {options.map((option) => (
          <OptionTile
            key={option.value}
            layout="row"
            name={name ?? generatedName}
            value={option.value}
            checked={option.value === value}
            onChange={(event) => {
              if (event.currentTarget.checked) setValue(option.value)
            }}
            preview={
              <span
                className="kg-font-picker__sample text-[length:var(--kg-text-xl)] leading-none tracking-[-0.02em] text-kg-fg"
                style={{ fontFamily: option.family }}
              >
                {sample}
              </span>
            }
            label={<span className="text-kg-md" style={{ fontFamily: option.family }}>{option.label}</span>}
            description={option.note}
          />
        ))}
      </div>
    )
  },
)

FontPicker.displayName = "FontPicker"
