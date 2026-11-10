"use client"

import { type CSSProperties, forwardRef, type HTMLAttributes, useId } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { joinIds, useField } from "../field/field.js"

export type ScaleInputTone = "plain" | "nps"

export interface ScaleInputProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  min?: number
  max?: number
  value?: number | null
  defaultValue?: number | null
  onValueChange?: (value: number) => void
  /** Caption under the low end, e.g. "Not likely". */
  minLabel?: string
  /** Caption under the high end, e.g. "Very likely". */
  maxLabel?: string
  /** `nps` tints the chosen score by detractor, passive or promoter band. */
  tone?: ScaleInputTone
  /** Names the group for assistive tech. */
  label?: string
  name?: string
  disabled?: boolean
  required?: boolean
}

// Selected fill per band, each paired with the text colour that stays AA on it.
const scoreClass = cx(
  "kg-scale-input__score group relative grid cursor-pointer",
  "[--_on:var(--kg-accent)] [--_on-fg:var(--kg-accent-fg)]",
  "data-[band=low]:[--_on:var(--kg-danger)] data-[band=low]:[--_on-fg:var(--kg-danger-fg)]",
  "data-[band=mid]:[--_on:var(--kg-warning)] data-[band=mid]:[--_on-fg:var(--kg-warning-fg)]",
  "data-[band=high]:[--_on:var(--kg-success)] data-[band=high]:[--_on-fg:var(--kg-success-fg)]",
)

const faceClass = cx(
  "kg-scale-input__face grid place-items-center aspect-square min-h-[2.25rem] pointer-events-none",
  "rounded-kg-md border-2 border-kg-ink bg-kg-surface text-kg-sm font-semibold tabular-nums text-kg-fg",
  "transition-[background-color,color,box-shadow,translate] duration-(--kg-duration-fast) ease-kg-out",
  "peer-[:enabled:not(:checked)]:group-hover:-translate-y-px peer-[:enabled:not(:checked)]:group-hover:shadow-kg-xs",
  "peer-checked:-translate-y-[2px] peer-checked:shadow-kg-sm peer-checked:bg-(--_on) peer-checked:text-(--_on-fg)",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-kg-ring",
  "peer-disabled:opacity-50",
)

const band = (score: number, min: number, max: number) => {
  const t = (score - min) / (max - min || 1)
  return t < 0.65 ? "low" : t < 0.85 ? "mid" : "high"
}

/**
 * A numbered rating scale (NPS, Likert, 1 to 5) built on native radios, so arrow keys,
 * forms and required validation work as they do for any radio group.
 */
export const ScaleInput = forwardRef<HTMLDivElement, ScaleInputProps>(
  (
    {
      min = 0,
      max = 10,
      value: valueProp,
      defaultValue = null,
      onValueChange,
      minLabel,
      maxLabel,
      tone = "plain",
      label,
      name,
      disabled,
      required,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const field = useField()
    const [value, setValue] = useControllableState<number | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((value: number | null) => void) | undefined,
    })
    const generated = useId()
    const group = name ?? generated
    const scores = Array.from({ length: max - min + 1 }, (_, i) => min + i)
    const captionId = `${generated}-captions`
    const isDisabled = disabled ?? field?.disabled

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label={label}
        aria-labelledby={label ? undefined : field?.labelId}
        aria-describedby={joinIds(
          field?.describedBy,
          minLabel ? `${captionId}-min` : undefined,
          maxLabel ? `${captionId}-max` : undefined,
        )}
        aria-required={(required ?? field?.required) || undefined}
        className={cx(
          "kg-scale-input grid gap-2 w-full max-w-[calc(var(--_count)*3rem)]",
          className,
        )}
        data-tone={tone}
        style={{ ...style, "--_count": scores.length } as CSSProperties}
        {...props}
      >
        <div className="kg-scale-input__scores grid grid-cols-[repeat(var(--_count),minmax(0,1fr))] gap-1">
          {scores.map((score) => (
            <label
              key={score}
              className={scoreClass}
              data-band={tone === "nps" ? band(score, min, max) : undefined}
            >
              <input
                type="radio"
                name={group}
                value={score}
                className="kg-scale-input__input peer absolute inset-0 m-0 opacity-0 cursor-[inherit]"
                checked={value === score}
                disabled={isDisabled}
                required={required ?? field?.required}
                onChange={() => setValue(score)}
              />
              <span className={faceClass}>{score}</span>
            </label>
          ))}
        </div>
        {(minLabel || maxLabel) && (
          <div className="kg-scale-input__captions flex justify-between gap-4 text-kg-xs text-kg-fg-muted">
            <span id={`${captionId}-min`}>{minLabel ? `${min}: ${minLabel}` : ""}</span>
            <span id={`${captionId}-max`}>{maxLabel ? `${max}: ${maxLabel}` : ""}</span>
          </div>
        )}
      </div>
    )
  },
)

ScaleInput.displayName = "ScaleInput"
