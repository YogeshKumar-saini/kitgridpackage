"use client"

import { type ChangeEvent, forwardRef } from "react"
import { cx } from "../../utils/cx.js"
import { Input, type InputProps } from "../input/input.js"

export interface DateInputProps extends Omit<
  InputProps,
  "type" | "value" | "defaultValue" | "onClear"
> {
  /** `yyyy-mm-dd`, or `""` for none. */
  value?: string
  defaultValue?: string
  /** Called with `yyyy-mm-dd`, or `""` once cleared. */
  onValueChange?: (value: string) => void
  /** Show a clear button while a date is set. */
  clearable?: boolean
}

const dateInputClass = cx(
  "tabular-nums",
  "[&_.kg-input__control::-webkit-datetime-edit]:p-0 [&_.kg-input__control::-webkit-datetime-edit-fields-wrapper]:p-0",
  "[&_.kg-input__control:invalid::-webkit-datetime-edit]:text-kg-fg-faint",
  "[&_.kg-input__control[value='']::-webkit-datetime-edit]:text-kg-fg-faint",
  "[&_.kg-input__control::-webkit-datetime-edit-day-field:focus]:text-kg-accent-fg [&_.kg-input__control::-webkit-datetime-edit-day-field:focus]:bg-kg-accent [&_.kg-input__control::-webkit-datetime-edit-day-field:focus]:rounded-kg-xs",
  "[&_.kg-input__control::-webkit-datetime-edit-month-field:focus]:text-kg-accent-fg [&_.kg-input__control::-webkit-datetime-edit-month-field:focus]:bg-kg-accent [&_.kg-input__control::-webkit-datetime-edit-month-field:focus]:rounded-kg-xs",
  "[&_.kg-input__control::-webkit-datetime-edit-year-field:focus]:text-kg-accent-fg [&_.kg-input__control::-webkit-datetime-edit-year-field:focus]:bg-kg-accent [&_.kg-input__control::-webkit-datetime-edit-year-field:focus]:rounded-kg-xs",
  "[&_.kg-input__control::-webkit-calendar-picker-indicator]:m-0 [&_.kg-input__control::-webkit-calendar-picker-indicator]:p-0.5",
  "[&_.kg-input__control::-webkit-calendar-picker-indicator]:cursor-pointer [&_.kg-input__control::-webkit-calendar-picker-indicator]:opacity-55",
  "[&_.kg-input__control::-webkit-calendar-picker-indicator]:rounded-kg-xs",
  "[&_.kg-input__control::-webkit-calendar-picker-indicator]:transition-opacity [&_.kg-input__control::-webkit-calendar-picker-indicator]:duration-(--kg-duration-fast)",
  "[&_.kg-input__control::-webkit-calendar-picker-indicator:hover]:opacity-100",
  "[&_.kg-input__control::-webkit-calendar-picker-indicator:hover]:bg-kg-muted",
)

/**
 * The browser's own date field, themed: native keyboard entry, locale order and picker on
 * every platform, plus a clear button.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ onValueChange, onChange, clearable = true, className, ...props }, ref) => (
    <Input
      ref={ref}
      type="date"
      className={cx("kg-date-input", dateInputClass, className)}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event)
        onValueChange?.(event.currentTarget.value)
      }}
      onClear={clearable ? () => {} : undefined}
      {...props}
    />
  ),
)

DateInput.displayName = "DateInput"
