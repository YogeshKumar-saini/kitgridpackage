"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  useId,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type ChoiceListLayout = "list" | "grid"
export type ChoiceListSize = "sm" | "md"

export interface ChoiceListOption<V extends string = string> {
  value: V
  label: ReactNode
  description?: ReactNode
  /** Decorative, shown in a tile before the text. */
  icon?: ReactNode
  /** Trailing detail such as a price, a count or a badge. */
  aside?: ReactNode
  disabled?: boolean
}

export interface ChoiceListProps<V extends string = string> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  options: readonly ChoiceListOption<V>[]
  value?: V | null
  defaultValue?: V | null
  onValueChange?: (value: V) => void
  /** Names the group for assistive tech. */
  label?: string
  /** Groups the inputs in forms. Generated when omitted. */
  name?: string
  /** `list` stacks the cards, `grid` flows them into columns that fit. */
  layout?: ChoiceListLayout
  size?: ChoiceListSize
  disabled?: boolean
  required?: boolean
}

const listVariants = variants({
  base: "kg-choice-list grid min-w-0",
  variants: {
    layout: {
      list: "",
      grid: "grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))]",
    },
    size: {
      sm: "gap-1.5 [--_pad:calc(var(--kg-space)*2.5)] [--_tile:1.75rem]",
      md: "gap-2 [--_pad:calc(var(--kg-space)*3.5)] [--_tile:2.25rem]",
    },
  },
})

/*
 * Paper Layers: each choice is a sheet in an ink frame. The picked one lifts onto sage with an
 * ink offset and its ring fills with ink, so the choice never rests on colour alone.
 */
const optionClass = [
  "kg-choice-list__option group/choice relative flex min-w-0 cursor-pointer items-center gap-3",
  "rounded-kg-lg border-2 border-kg-ink bg-kg-surface p-(--_pad) pe-[calc(var(--_pad)+1.75rem)] text-kg-fg",
  "[-webkit-tap-highlight-color:transparent] transition-[translate,box-shadow,background-color] duration-(--kg-duration-fast) ease-kg-out",
  "hover:not-data-disabled:not-data-checked:-translate-px hover:not-data-disabled:not-data-checked:shadow-kg-xs",
  "data-checked:-translate-px data-checked:bg-kg-paper-sage data-checked:shadow-kg-sm",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-kg-ring",
  "data-disabled:cursor-not-allowed data-disabled:opacity-55",
].join(" ")

const markClass = [
  "kg-choice-list__mark absolute end-(--_pad) top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-kg-ink",
  "transition-[background-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "group-data-checked/choice:bg-kg-ink group-data-checked/choice:shadow-[inset_0_0_0_3px_var(--kg-paper-sage)]",
].join(" ")

const ChoiceListImpl = <V extends string = string>(
  {
    options,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    label,
    name: nameProp,
    layout = "list",
    size = "md",
    disabled = false,
    required = false,
    className,
    ...props
  }: ChoiceListProps<V>,
  ref: Ref<HTMLDivElement>,
) => {
  const fallbackName = useId()
  const name = nameProp ?? fallbackName
  const [value, setValue] = useControllableState<V | null>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange as ((value: V | null) => void) | undefined,
  })

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      aria-required={required || undefined}
      aria-disabled={disabled || undefined}
      className={listVariants({ layout, size, className })}
      data-layout={layout}
      data-size={size}
      {...props}
    >
      {options.map((option) => {
        const id = `${name}-${option.value}`
        const checked = value === option.value
        const off = disabled || option.disabled
        return (
          <label
            key={option.value}
            className={optionClass}
            data-checked={checked || undefined}
            data-disabled={off || undefined}
          >
            <input
              type="radio"
              className="kg-choice-list__input absolute inset-0 m-0 size-full cursor-[inherit] opacity-0"
              name={name}
              value={option.value}
              checked={checked}
              disabled={off}
              required={required}
              aria-describedby={option.description != null ? `${id}-description` : undefined}
              onChange={() => setValue(option.value)}
            />
            {option.icon != null && (
              <span
                className={cx(
                  "kg-choice-list__icon grid size-(--_tile) shrink-0 place-items-center rounded-kg-md border-2 border-kg-ink [&_svg]:size-1/2",
                  checked ? "bg-kg-surface text-kg-fg" : "bg-kg-surface-sunken text-kg-fg-muted",
                )}
                aria-hidden="true"
              >
                {option.icon}
              </span>
            )}
            <span className="kg-choice-list__text grid min-w-0 flex-auto gap-0.5">
              <span className="kg-choice-list__label text-kg-base font-[580] leading-[1.35]">
                {option.label}
              </span>
              {option.description != null && (
                <span
                  className={cx(
                    "kg-choice-list__description text-kg-sm leading-[1.45]",
                    checked ? "text-kg-fg" : "text-kg-fg-muted",
                  )}
                  id={`${id}-description`}
                >
                  {option.description}
                </span>
              )}
            </span>
            {option.aside != null && (
              <span className="kg-choice-list__aside shrink-0 text-kg-sm font-[560] tabular-nums">{option.aside}</span>
            )}
            <span className={markClass} aria-hidden="true" />
          </label>
        )
      })}
    </div>
  )
}

/**
 * A single choice presented as cards: plans, report periods, export formats. Native radio
 * inputs underneath, so arrow keys, forms and validation behave as the platform does.
 */
export const ChoiceList = forwardRef(ChoiceListImpl) as (<V extends string = string>(
  props: ChoiceListProps<V> & { ref?: Ref<HTMLDivElement> },
) => ReactElement | null) & { displayName?: string }

ChoiceList.displayName = "ChoiceList"
