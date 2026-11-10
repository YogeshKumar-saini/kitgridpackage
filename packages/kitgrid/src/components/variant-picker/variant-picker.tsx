"use client"

import {
  type CSSProperties,
  type FieldsetHTMLAttributes,
  forwardRef,
  type ReactElement,
  type Ref,
  useId,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import type { VariantPickerValue } from "./variant-availability.js"

export type VariantPickerType = "swatch" | "chip" | "image"
export type VariantPickerSize = "sm" | "md" | "lg"

export interface VariantOption<V extends VariantPickerValue = string> {
  value: V
  label: string
  /** Swatch paint: any CSS color or gradient. */
  color?: string
  /** Image URL: the tile for `type="image"`, or a fabric/pattern fill for swatches. */
  image?: string
  /** `false` marks the option sold out. Defaults to `true`. */
  available?: boolean
  /** Secondary text such as "Low stock" or "+$10": on chips, and in the tooltip otherwise. */
  hint?: string
}

export interface VariantPickerLabels {
  /** Appended to unavailable options for screen readers, in parentheses. */
  soldOut?: string
  /** Between the option name and the chosen value in the legend. */
  separator?: string
}

export interface VariantPickerProps<V extends VariantPickerValue = string> extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "defaultValue" | "onChange"
> {
  /** The option name, e.g. "Color". The legend reads "Color: Sage" once one is chosen. */
  label: string
  options: readonly VariantOption<V>[]
  type?: VariantPickerType
  value?: V | null
  defaultValue?: V | null
  onValueChange?: (value: V, option: VariantOption<V>) => void
  /** Let shoppers pick sold-out options, e.g. to join a waitlist or back-order. */
  allowUnavailable?: boolean
  size?: VariantPickerSize
  /** Lay chips out in a fixed grid instead of wrapping. */
  columns?: number
  /** Show the chosen option's name in the legend. */
  showSelection?: boolean
  required?: boolean
  labels?: VariantPickerLabels
}

const defaultLabels: Required<VariantPickerLabels> = {
  soldOut: "sold out",
  separator: ":",
}

const pickerVariants = variants({
  base: "kg-variant-picker m-0 min-w-0 border-0 p-0 text-(length:--_text) disabled:opacity-55",
  variants: {
    size: {
      sm: "[--_chip-height:var(--kg-control-sm)] [--_swatch-size:1.5rem] [--_text:var(--kg-text-sm)] [--_tile-size:3.25rem]",
      md: "[--_chip-height:var(--kg-control-md)] [--_swatch-size:2rem] [--_text:var(--kg-text-base)] [--_tile-size:4rem]",
      lg: "[--_chip-height:var(--kg-control-lg)] [--_swatch-size:2.5rem] [--_text:var(--kg-text-md)] [--_tile-size:5rem]",
    },
  },
  defaults: { size: "md" },
})

/* A ring that scales in around the checked swatch or tile. */
const ring =
  "before:pointer-events-none before:absolute before:rounded-[inherit] before:border-2 before:border-kg-ink before:opacity-0 before:scale-[0.86] before:transition-[opacity,scale] before:duration-(--kg-duration-base) before:ease-kg-out before:content-[''] data-checked:before:opacity-100 data-checked:before:scale-100"

const optionClass = {
  swatch: [ring, "rounded-full before:-inset-1 [&[data-unavailable]_.kg-variant-picker__swatch]:opacity-45"],
  image: [ring, "rounded-kg-md before:-inset-[5px] before:rounded-[calc(var(--kg-radius-md)+5px)] [&[data-unavailable]_.kg-variant-picker__media]:opacity-50"],
  chip: [
    "min-h-(--_chip-height) min-w-12 rounded-kg-md border-2 border-kg-ink bg-kg-surface px-3.5 py-1.5",
    "transition-[background-color,color,box-shadow,translate] duration-(--kg-duration-fast) ease-kg-out",
    "hover:bg-kg-paper-sage data-checked:bg-kg-accent data-checked:text-kg-accent-fg data-checked:shadow-kg-xs data-checked:hover:bg-kg-accent",
    "data-unavailable:border-dashed data-unavailable:bg-kg-surface-sunken data-unavailable:text-kg-fg-muted",
  ],
}

const VariantPickerImpl = <V extends VariantPickerValue = string>(
  {
    label,
    options,
    type = "chip",
    value: valueProp,
    defaultValue = null,
    onValueChange,
    allowUnavailable = false,
    size = "md",
    columns,
    showSelection = true,
    required,
    disabled,
    name,
    labels,
    className,
    ...props
  }: VariantPickerProps<V>,
  ref: Ref<HTMLFieldSetElement>,
) => {
  const text = { ...defaultLabels, ...labels }
  const autoName = useId()
  const [value, setValue] = useControllableState<V | null>({
    value: valueProp,
    defaultValue,
  })
  const selected = options.find((option) => Object.is(option.value, value))

  const choose = (option: VariantOption<V>) => {
    if (Object.is(option.value, value)) return
    setValue(option.value)
    onValueChange?.(option.value, option)
  }

  return (
    <fieldset
      ref={ref}
      className={pickerVariants({ size, className })}
      data-type={type}
      data-size={size}
      disabled={disabled}
      {...props}
    >
      <legend className="kg-variant-picker__legend float-start mb-2.5 w-full p-0 text-kg-sm leading-[1.3] text-kg-fg-muted [&+*]:clear-both">
        <span className="kg-variant-picker__label font-semibold text-kg-fg">{label}</span>
        {showSelection && selected && (
          // The radio already announces its name, so the echo in the legend is visual only.
          <span
            className="kg-variant-picker__selection [&>span]:inline-block [&>span]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)] [&>span]:[--kg-enter-y:2px]"
            aria-hidden="true"
          >
            {`${text.separator} `}
            <span key={String(selected.value)}>{selected.label}</span>
          </span>
        )}
      </legend>
      <div
        className={cx(
          "kg-variant-picker__options gap-2",
          columns ? "grid grid-cols-[repeat(var(--_columns),minmax(0,1fr))]" : "flex flex-wrap",
        )}
        data-columns={columns ? "" : undefined}
        style={columns ? ({ "--_columns": columns } as CSSProperties) : undefined}
      >
        {options.map((option) => {
          const unavailable = option.available === false
          const checked = Object.is(option.value, value)
          const tooltip =
            type === "chip"
              ? undefined
              : option.hint
                ? `${option.label}, ${option.hint}`
                : option.label
          return (
            <label
              key={String(option.value)}
              className={cx(
                "kg-variant-picker__option group/option relative inline-grid cursor-pointer place-items-center text-kg-fg [-webkit-tap-highlight-color:transparent]",
                "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-[5px] has-[input:focus-visible]:outline-kg-ring has-[input:disabled]:cursor-not-allowed",
                "data-unavailable:after:pointer-events-none data-unavailable:after:absolute data-unavailable:after:inset-0 data-unavailable:after:rounded-[inherit] data-unavailable:after:content-['']",
                "data-unavailable:after:bg-[linear-gradient(to_top_right,transparent_calc(50%-0.75px),var(--kg-fg-faint)_calc(50%-0.75px),var(--kg-fg-faint)_calc(50%+0.75px),transparent_calc(50%+0.75px))]",
                optionClass[type],
              )}
              data-checked={checked || undefined}
              data-unavailable={unavailable || undefined}
              title={tooltip}
            >
              <input
                type="radio"
                className="kg-variant-picker__input absolute inset-0 m-0 size-full cursor-[inherit] opacity-0"
                name={name ?? autoName}
                value={String(option.value)}
                checked={checked}
                required={required}
                disabled={unavailable && !allowUnavailable}
                // One computed string reads the same in every screen reader, hint and stock included.
                aria-label={
                  option.label +
                  (option.hint ? `, ${option.hint}` : "") +
                  (unavailable ? ` (${text.soldOut})` : "")
                }
                onChange={() => choose(option)}
              />
              {type === "swatch" && (
                <span
                  className="kg-variant-picker__swatch block size-(--_swatch-size) rounded-[inherit] border-2 border-kg-ink [background:var(--_swatch,var(--kg-muted))] transition-[scale] duration-(--kg-duration-base) ease-kg-out group-hover/option:scale-[1.06] group-data-checked/option:scale-[0.84]"
                  aria-hidden="true"
                  style={
                    {
                      "--_swatch": option.image
                        ? `center / cover url("${option.image.replace(/"/g, "%22")}")`
                        : option.color,
                    } as CSSProperties
                  }
                />
              )}
              {type === "image" && (
                <span
                  className="kg-variant-picker__media block aspect-square w-(--_tile-size) overflow-hidden rounded-[inherit] border-2 border-kg-ink bg-kg-muted data-placeholder:bg-kg-paper-sage [&_img]:block [&_img]:size-full [&_img]:object-cover [&_img]:transition-[scale] [&_img]:duration-(--kg-duration-slow) [&_img]:ease-kg-out group-hover/option:[&_img]:scale-105"
                  aria-hidden="true"
                  data-placeholder={option.image ? undefined : ""}
                >
                  {option.image && (
                    <img src={option.image} alt="" loading="lazy" decoding="async" />
                  )}
                </span>
              )}
              {type === "chip" && (
                <span
                  className="kg-variant-picker__text grid justify-items-center gap-[0.15em] text-center leading-[1.15] font-[550]"
                  aria-hidden="true"
                >
                  {option.label}
                  {option.hint && (
                    <span className="kg-variant-picker__hint text-[0.78em] font-[450] opacity-80">{option.hint}</span>
                  )}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** A single option of a product (color, size, material) as native radios inside a fieldset. */
export const VariantPicker = forwardRef(VariantPickerImpl) as (<
  V extends VariantPickerValue = string,
>(
  props: VariantPickerProps<V> & { ref?: Ref<HTMLFieldSetElement> },
) => ReactElement | null) & { displayName?: string }

VariantPicker.displayName = "VariantPicker"
