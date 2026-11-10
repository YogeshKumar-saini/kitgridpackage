"use client"

import { type KeyboardEvent as ReactKeyboardEvent, useRef } from "react"
import { cx } from "../../utils/cx.js"

/* A typed numeric spinbutton used by TimePicker and DateTimeField. Unexported. */

export const segmentsClass =
  "kg-time-picker__segments inline-flex items-center tabular-nums whitespace-nowrap"

export const separatorClass = "kg-time-picker__separator px-[0.05em] text-kg-fg-faint"

const segmentClass = cx(
  "kg-time-picker__segment inline-grid place-items-center min-w-[2.2ch] px-[0.2em] py-[0.15em]",
  "rounded-kg-xs text-kg-fg caret-transparent outline-none cursor-text",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "not-focus:data-placeholder:text-kg-fg-faint focus:bg-kg-accent focus:text-kg-accent-fg",
  "aria-disabled:cursor-not-allowed",
)

export interface SegmentProps {
  value: number | null
  min: number
  max: number
  label: string
  placeholder: string
  /** Text shown and announced for a value. */
  display?: (value: number) => string
  /** Characters typed into a text segment such as AM/PM, mapped to a value. */
  letters?: Record<string, number>
  step?: number
  disabled?: boolean
  readOnly?: boolean
  onChange: (value: number | null) => void
  /** Focus moves on once a typed value can't take another digit. */
  onFilled?: () => void
  id?: string
  describedBy?: string
  invalid?: boolean
}

const wrap = (value: number, min: number, max: number) => {
  const span = max - min + 1
  return ((((value - min) % span) + span) % span) + min
}

export const focusSibling = (from: HTMLElement, delta: 1 | -1): void => {
  const group = from.closest("[data-segment-group]")
  if (!group) return
  const all = Array.from(group.querySelectorAll<HTMLElement>("[data-segment]"))
  all[all.indexOf(from) + delta]?.focus()
}

export const Segment = ({
  value,
  min,
  max,
  label,
  placeholder,
  display = (v) => String(v).padStart(String(max).length, "0"),
  letters,
  step = 1,
  disabled,
  readOnly,
  onChange,
  onFilled,
  id,
  describedBy,
  invalid,
}: SegmentProps) => {
  const typed = useRef("")

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return
    const { key } = event
    const target = event.currentTarget
    if (key === "ArrowLeft" || key === "ArrowRight") {
      event.preventDefault()
      typed.current = ""
      const rtl = getComputedStyle(target).direction === "rtl"
      focusSibling(target, (key === "ArrowRight") !== rtl ? 1 : -1)
      return
    }
    if (readOnly) return
    const nudge = (delta: number) => {
      event.preventDefault()
      typed.current = ""
      const base = value ?? (delta > 0 ? min - step : max + step)
      // Steps snap to the grid, e.g. 07 → 15 → 30 with a 15-minute step.
      const snapped = delta > 0 ? Math.floor(base / step) * step + step : Math.ceil(base / step) * step - step
      onChange(wrap(step > 1 ? snapped : base + delta, min, max))
    }
    switch (key) {
      case "ArrowUp":
        return nudge(1)
      case "ArrowDown":
        return nudge(-1)
      case "PageUp":
        return nudge(Math.max(step, Math.round((max - min) / 6)))
      case "PageDown":
        return nudge(-Math.max(step, Math.round((max - min) / 6)))
      case "Home":
        event.preventDefault()
        return onChange(min)
      case "End":
        event.preventDefault()
        return onChange(max)
      case "Backspace":
      case "Delete":
        event.preventDefault()
        typed.current = ""
        return onChange(null)
    }
    if (letters) {
      const match = letters[key.toLowerCase()]
      if (match !== undefined) {
        event.preventDefault()
        onChange(match)
        onFilled?.()
      }
      return
    }
    if (/^\d$/.test(key)) {
      event.preventDefault()
      let next = typed.current + key
      if (Number(next) > max) next = key
      const number = Number(next)
      typed.current = next
      if (number >= min || next.length > 1) onChange(Math.max(min, Math.min(max, number)))
      else onChange(null)
      if (number * 10 > max || next.length >= String(max).length) {
        typed.current = ""
        onFilled?.()
      }
    }
  }

  return (
    <span
      id={id}
      role="spinbutton"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={letters ? undefined : min}
      aria-valuemax={letters ? undefined : max}
      aria-valuenow={value ?? undefined}
      aria-valuetext={value === null ? "Empty" : display(value)}
      aria-disabled={disabled || undefined}
      aria-readonly={readOnly || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      inputMode={letters ? "text" : "numeric"}
      data-segment=""
      data-placeholder={value === null ? "" : undefined}
      className={segmentClass}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        typed.current = ""
      }}
    >
      {value === null ? placeholder : display(value)}
    </span>
  )
}
