"use client"

import { forwardRef, type HTMLAttributes, useId } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { useField } from "../field/field.js"

export interface TimeSlotPickerSlot {
  /** Submitted value, e.g. `09:30`. */
  value: string
  /** Shown text. Defaults to `value`. */
  label?: string
  disabled?: boolean
}

export interface TimeSlotPickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  slots: readonly TimeSlotPickerSlot[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string) => void
  /** Names the group for assistive tech. */
  label?: string
  name?: string
  disabled?: boolean
}

/* Each slot is a small sheet; the native radio sits invisibly on top and drives the face. */
const faceClass = cx(
  "kg-time-slot-picker__face grid place-items-center h-kg-md pointer-events-none",
  "text-kg-sm font-[550] tabular-nums text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-md",
  "transition-[background-color,color,translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "peer-enabled:group-hover:-translate-y-px peer-enabled:group-hover:shadow-kg-xs",
  "peer-checked:bg-kg-accent peer-checked:text-kg-accent-fg peer-checked:font-semibold",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-kg-ring",
  "peer-disabled:text-kg-fg-muted peer-disabled:bg-kg-surface-sunken peer-disabled:border-dashed",
  "peer-disabled:border-kg-border-strong peer-disabled:line-through",
)

/** Bookable times as a grid of native radios: arrow keys move, taken slots stay visible. */
export const TimeSlotPicker = forwardRef<HTMLDivElement, TimeSlotPickerProps>(
  (
    {
      slots,
      value: valueProp,
      defaultValue = null,
      onValueChange,
      label,
      name,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    const field = useField()
    const [value, setValue] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((value: string | null) => void) | undefined,
    })
    const generated = useId()
    const group = name ?? generated
    const isDisabled = disabled ?? field?.disabled

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label={label}
        aria-labelledby={label ? undefined : field?.labelId}
        aria-describedby={field?.describedBy}
        className={cx(
          "kg-time-slot-picker grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2 w-full",
          className,
        )}
        {...props}
      >
        {slots.map((slot) => (
          <label
            key={slot.value}
            className="kg-time-slot-picker__slot group relative grid cursor-pointer data-disabled:cursor-not-allowed"
            data-disabled={slot.disabled || isDisabled || undefined}
          >
            <input
              type="radio"
              name={group}
              value={slot.value}
              className="kg-time-slot-picker__input peer absolute inset-0 m-0 opacity-0 cursor-[inherit]"
              checked={value === slot.value}
              disabled={slot.disabled || isDisabled}
              onChange={() => setValue(slot.value)}
            />
            <span className={faceClass}>{slot.label ?? slot.value}</span>
          </label>
        ))}
      </div>
    )
  },
)

TimeSlotPicker.displayName = "TimeSlotPicker"
