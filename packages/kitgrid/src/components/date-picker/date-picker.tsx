"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId, useRef, useState } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { Layer } from "../../primitives/layer.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { Calendar, type CalendarRange } from "../calendar/calendar.js"
import { formatDay } from "../calendar/dates.js"
import { triggerLabelledBy, usePopup, XIcon } from "../combobox/internal.js"
import { resolveFieldControl, useField } from "../field/field.js"
import {
  type InputGroupSize,
  inputGroupButton,
  inputGroupVariants,
} from "../input-group/input-group.js"

interface DatePickerBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  min?: string
  max?: string
  isDateDisabled?: (day: string) => boolean
  locale?: string
  weekStartsOn?: number
  months?: 1 | 2
  placeholder?: string
  /** How the chosen day is written in the field. */
  formatOptions?: Intl.DateTimeFormatOptions
  size?: InputGroupSize
  invalid?: boolean
  disabled?: boolean
  required?: boolean
  clearable?: boolean
  clearLabel?: string
  /** Accessible name of the popup. */
  dialogLabel?: string
  icon?: ReactNode
  /** Submits `yyyy-mm-dd` (or `start/end`) through a hidden input. */
  name?: string
  id?: string
}

export interface DatePickerSingleProps extends DatePickerBaseProps {
  mode?: "single"
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
}

export interface DatePickerRangeProps extends DatePickerBaseProps {
  mode: "range"
  value?: CalendarRange | null
  defaultValue?: CalendarRange | null
  onValueChange?: (value: CalendarRange | null) => void
}

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps

/* The trigger reaches back over the group's start padding so the whole field opens the popup. */
const triggerClass = cx(
  "kg-date-picker__trigger flex items-center gap-2 flex-1 self-stretch min-w-0 -ms-(--_px) ps-(--_px) pe-0 py-0",
  "[font:inherit] text-start text-inherit bg-transparent border-0 rounded-[inherit] outline-none cursor-pointer",
  "disabled:cursor-not-allowed",
)

const iconClass = cx(
  "kg-date-picker__icon inline-grid shrink-0 text-kg-fg-faint [&_svg]:size-4",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "[.kg-date-picker:focus-within_&]:text-kg-accent-strong [.kg-date-picker[data-state=open]_&]:text-kg-accent-strong",
)

/** Popup sheet motion shared with DateTimeField; the Calendar inside is the sheet. */
export const calendarPopupClass = cx(
  "origin-(--kg-origin,top_left) data-[side=bottom]:[--kg-enter-y:-4px] data-[side=top]:[--kg-enter-y:4px]",
  "data-[state=open]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-pop-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
)

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
)

/** A field that opens a Calendar in a popover. Single days or ranges. */
export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>((props, ref) => {
  const {
    mode = "single",
    value: valueProp,
    defaultValue = null,
    onValueChange,
    min,
    max,
    isDateDisabled,
    locale,
    weekStartsOn,
    months = 1,
    placeholder = mode === "range" ? "Pick dates" : "Pick a date",
    formatOptions = { dateStyle: "medium" },
    size = "md",
    invalid,
    disabled,
    required,
    clearable,
    clearLabel = "Clear date",
    dialogLabel = mode === "range" ? "Choose dates" : "Choose date",
    icon,
    name,
    id,
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": describedBy,
    ...rest
  } = props
  const control = resolveFieldControl(useField(), {
    id,
    disabled,
    required,
    invalid,
    "aria-describedby": describedBy,
  })
  const [value, setValue] = useControllableState<string | CalendarRange | null>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange as ((value: string | CalendarRange | null) => void) | undefined,
  })
  const [open, setOpen] = useState(false)
  const groupRef = useRef<HTMLDivElement>(null)
  const rootRef = useComposedRefs(groupRef, ref)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogId = useId()
  const triggerId = control.id ?? `${dialogId}-trigger`

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }
  const { ref: layerRef, present, state } = usePopup({
    open,
    anchorRef: groupRef,
    onDismiss: () => close(),
    matchWidth: false,
  })

  const write = (day: string) => formatDay(day, locale, formatOptions)
  const text =
    typeof value === "string"
      ? write(value)
      : value
        ? value.start === value.end
          ? write(value.start)
          : `${write(value.start)} - ${write(value.end)}`
        : ""
  const submitted =
    typeof value === "string" ? value : value ? `${value.start}/${value.end}` : ""

  return (
    <>
      <div
        ref={rootRef}
        className={inputGroupVariants({
          size,
          className: cx("kg-date-picker not-data-disabled:cursor-default", className),
        })}
        data-size={size}
        data-state={open ? "open" : "closed"}
        data-invalid={control.invalid || undefined}
        data-disabled={control.disabled || undefined}
        {...rest}
      >
        <button
          ref={triggerRef}
          type="button"
          id={triggerId}
          className={triggerClass}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={present ? dialogId : undefined}
          aria-label={ariaLabel}
          aria-labelledby={triggerLabelledBy({
            labelledBy: ariaLabelledBy,
            labelId: control.labelId,
            ariaLabel,
            selfId: triggerId,
            valueId: `${dialogId}-value`,
            hasValue: text !== "",
          })}
          aria-describedby={control.describedBy}
          aria-invalid={control.invalid || undefined}
          aria-required={control.required || undefined}
          disabled={control.disabled}
          data-placeholder={text ? undefined : ""}
          onClick={() => (open ? close(false) : setOpen(true))}
        >
          <span className={iconClass} aria-hidden="true">
            {icon ?? <CalendarIcon />}
          </span>
          <span id={`${dialogId}-value`} className={cx("kg-date-picker__text truncate tabular-nums", !text && "text-kg-fg-faint")}>{text || placeholder}</span>
        </button>
        {clearable && value && !control.disabled && (
          <button
            type="button"
            className={inputGroupButton}
            aria-label={clearLabel}
            onClick={() => {
              setValue(null)
              triggerRef.current?.focus()
            }}
          >
            <XIcon />
          </button>
        )}
      </div>
      {name !== undefined && <input type="hidden" name={name} value={submitted} />}
      {present && (
        <Layer
          ref={layerRef}
          id={dialogId}
          role="dialog"
          aria-label={dialogLabel}
          className={cx("kg-date-picker__popup", calendarPopupClass)}
          data-state={state}
        >
          {mode === "range" ? (
            <Calendar
              mode="range"
              autoFocus
              value={value && typeof value === "object" ? value : null}
              onValueChange={(range) => {
                setValue(range)
                close()
              }}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              locale={locale}
              weekStartsOn={weekStartsOn}
              months={months}
            />
          ) : (
            <Calendar
              autoFocus
              value={typeof value === "string" ? value : null}
              onValueChange={(day) => {
                setValue(day)
                close()
              }}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              locale={locale}
              weekStartsOn={weekStartsOn}
              months={months}
            />
          )}
        </Layer>
      )}
    </>
  )
})

DatePicker.displayName = "DatePicker"
