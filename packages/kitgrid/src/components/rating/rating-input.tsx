"use client"

import {
  type FieldsetHTMLAttributes,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"
import {
  RatingGlyph,
  type RatingLabels,
  type RatingSize,
  ratingVariants,
  resolveRatingLabels,
  starsClass,
} from "./rating-glyph.js"

export interface RatingInputProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "defaultValue" | "onChange"
> {
  value?: number | undefined
  defaultValue?: number | undefined
  onValueChange?: ((value: number) => void) | undefined
  max: number
  precision: 0.5 | 1
  size: RatingSize
  icon?: ReactNode
  clearable: boolean
  required?: boolean | undefined
  label?: string | undefined
  locale?: string | undefined
  labels?: RatingLabels | undefined
}

export const RatingInput = forwardRef<HTMLFieldSetElement, RatingInputProps>(
  (
    {
      value: valueProp,
      defaultValue = 0,
      onValueChange,
      max,
      precision,
      size,
      icon,
      clearable,
      required,
      label,
      locale,
      labels,
      name,
      disabled,
      className,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [hover, setHover] = useState<number | null>(null)
    const [touched, setTouched] = useState(false)
    const autoName = useId()
    const groupName = name ?? autoName
    const resolvedLocale = useLocale(locale)
    const text = resolveRatingLabels(labels, resolvedLocale)
    const shown = hover ?? value
    const steps = precision === 0.5 ? [0.5, 1] : [1]
    const previewIndex = hover === null ? -1 : Math.ceil(hover) - 1

    const select = (next: number) => {
      setTouched(true)
      setValue(next)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLFieldSetElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented || !clearable) return
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault()
        select(0)
      }
    }

    return (
      <fieldset
        ref={ref}
        className={ratingVariants({ mode: "input", size, className })}
        data-mode="input"
        data-size={size}
        data-touched={touched || undefined}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <legend className="kg-visually-hidden">{label ?? text.group}</legend>
        <span className={starsClass} onPointerLeave={() => setHover(null)}>
          {Array.from({ length: max }, (_, index) => (
            <RatingGlyph
              key={index}
              fill={clamp(shown - index, 0, 1)}
              icon={icon}
              preview={index === previewIndex}
            >
              {steps.map((step) => {
                const option = index + step
                return (
                  <label
                    key={option}
                    className={cx(
                      "kg-rating__hit absolute inset-y-0 group-enabled/rating:cursor-pointer",
                      step === 1 && steps.length === 2 ? "start-1/2 end-0" : steps.length === 2 ? "start-0 end-1/2" : "inset-x-0",
                    )}
                    data-part={
                      steps.length === 1 ? "full" : step === 1 ? "end" : "start"
                    }
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") setHover(option)
                    }}
                  >
                    <input
                      type="radio"
                      className="kg-rating__radio absolute inset-0 m-0 size-full cursor-[inherit] opacity-0"
                      name={groupName}
                      value={option}
                      checked={value === option}
                      required={required}
                      onChange={() => select(option)}
                      onClick={() => {
                        // Clicking the chosen star again is the familiar way to clear a rating.
                        if (clearable && value === option) select(0)
                      }}
                    />
                    <span className="kg-visually-hidden">
                      {text.option(option, max)}
                    </span>
                  </label>
                )
              })}
            </RatingGlyph>
          ))}
        </span>
        {clearable && (
          <button
            type="button"
            className="kg-rating__clear cursor-pointer rounded-kg-xs border-0 bg-transparent px-1.5 py-1 font-[inherit] text-kg-xs font-[550] text-kg-fg-muted transition-[opacity] duration-(--kg-duration-fast) ease-kg-out hover:text-kg-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring data-hidden:invisible data-hidden:opacity-0"
            data-hidden={value === 0 || undefined}
            tabIndex={value === 0 ? -1 : undefined}
            aria-hidden={value === 0 || undefined}
            onClick={() => select(0)}
          >
            {text.clear}
          </button>
        )}
      </fieldset>
    )
  },
)

RatingInput.displayName = "RatingInput"
