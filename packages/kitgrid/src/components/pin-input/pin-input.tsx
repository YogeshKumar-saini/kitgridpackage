"use client"

import {
  type ChangeEvent,
  type ClipboardEvent,
  forwardRef,
  Fragment,
  type HTMLAttributes,
  type KeyboardEvent,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"
import { resolveFieldControl, useField } from "../field/field.js"

export type PinInputSize = "sm" | "md" | "lg"
export type PinInputType = "numeric" | "alphanumeric"

export interface PinInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  /** Number of cells. */
  length?: number
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Called with the full code once every cell is filled. */
  onComplete?: (value: string) => void
  type?: PinInputType
  /** Hide characters as they are typed, like a password. */
  mask?: boolean
  size?: PinInputSize
  invalid?: boolean
  disabled?: boolean
  /** Submits the joined code in a hidden input under this name. */
  name?: string
  /** Visually split the cells into groups of this many, e.g. 3 for "123 456". */
  groupSize?: number
  placeholder?: string
  /** Accessible name per cell. Defaults to "Digit 1 of 6" / "Character 1 of 6". */
  getCellLabel?: (index: number, length: number) => string
  /** Offer one-time codes from SMS or email on the first cell. */
  otp?: boolean
}

const sizeClass: Record<PinInputSize, string> = {
  sm: "gap-1.5 [--_cell:var(--kg-control-sm)] [--_text:var(--kg-text-base)]",
  md: "gap-2 [--_cell:var(--kg-control-md)] [--_text:var(--kg-text-lg)]",
  lg: "gap-2.5 [--_cell:calc(var(--kg-control-lg)+0.5rem)] [--_text:var(--kg-text-xl)]",
}

/* Paper Layers: each cell is Input's white sheet; focus lifts it with an ink offset. */
const cellClass = cx(
  "kg-pin-input__cell w-[calc(var(--_cell)*0.9)] h-(--_cell) p-0 m-0 [font-family:inherit] text-(length:--_text)",
  "font-semibold tabular-nums leading-none text-center text-kg-fg bg-kg-surface border-2 rounded-kg-md",
  "transition-[border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "placeholder:text-kg-fg-faint placeholder:opacity-100",
  "focus:outline-2 focus:outline-offset-2 focus:outline-kg-ring focus:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
  "data-filled:animate-[kg-pin-input-pop_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "motion-reduce:animate-none in-data-[kg-motion=reduce]:animate-none",
  "disabled:cursor-not-allowed disabled:bg-kg-muted",
)

const sanitize = (text: string, type: PinInputType): string =>
  type === "numeric" ? text.replace(/\D/g, "") : text.replace(/[^a-z0-9]/gi, "")

export const PinInput = forwardRef<HTMLDivElement, PinInputProps>(
  (
    {
      length = 6,
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onComplete,
      type = "numeric",
      mask = false,
      size = "md",
      invalid: invalidProp,
      disabled: disabledProp,
      name,
      groupSize,
      placeholder = "",
      getCellLabel,
      otp = true,
      autoFocus = false,
      className,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
      ...props
    },
    ref,
  ) => {
    const field = useField()
    const control = resolveFieldControl(field, {
      disabled: disabledProp,
      invalid: invalidProp,
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
    })
    const [rawValue, setValue] = useControllableState({
      value: valueProp,
      defaultValue: sanitize(defaultValue, type).slice(0, length),
      onChange: onValueChange,
    })
    const value = rawValue.slice(0, length)
    const latest = useRef(value)
    latest.current = value
    const cells = useRef<(HTMLInputElement | null)[]>([])
    const complete = useEventCallback(onComplete)

    const focusCell = (index: number) => {
      const cell = cells.current[clamp(index, 0, length - 1)]
      cell?.focus()
      cell?.select()
    }

    const update = (next: string, focusIndex?: number) => {
      const trimmed = next.slice(0, length)
      if (trimmed !== latest.current) {
        latest.current = trimmed
        setValue(trimmed)
        if (trimmed.length === length) complete(trimmed)
      }
      if (focusIndex !== undefined) focusCell(focusIndex)
    }

    const removeAt = (index: number) => {
      const current = latest.current
      return current.slice(0, index) + current.slice(index + 1)
    }

    // Cells fill left to right without gaps, so the code always behaves like one text field.
    const handleFocus = (index: number) => {
      const firstEmpty = Math.min(latest.current.length, length - 1)
      if (index > firstEmpty) focusCell(firstEmpty)
      else cells.current[index]?.select()
    }

    const handleChange = (event: ChangeEvent<HTMLInputElement>, index: number) => {
      const raw = event.currentTarget.value
      const current = latest.current
      if (raw === "") {
        update(removeAt(index))
        return
      }
      const clean = sanitize(raw, type)
      if (!clean) return
      const previous = current[index] ?? ""
      // Without a selection the browser appends to the existing character; keep the new one.
      const incoming =
        previous && clean.length === 2
          ? clean.startsWith(previous)
            ? clean.slice(1)
            : clean.slice(0, 1)
          : clean
      if (incoming.length === 1) {
        update(current.slice(0, index) + incoming + current.slice(index + 1), index + 1)
      } else {
        // Autofill and IME commits can deliver the whole code into a single cell.
        const next =
          incoming.length >= length ? incoming : current.slice(0, index) + incoming
        update(next, Math.min(next.length, length - 1))
      }
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
      const current = latest.current
      switch (event.key) {
        case "Backspace":
          event.preventDefault()
          if (current[index]) update(removeAt(index), index)
          else if (index > 0)
            update(current.slice(0, index - 1) + current.slice(index), index - 1)
          return
        case "Delete":
          event.preventDefault()
          update(removeAt(index), index)
          return
        case "ArrowLeft":
          event.preventDefault()
          focusCell(index - 1)
          return
        case "ArrowRight":
          event.preventDefault()
          focusCell(index + 1)
          return
        case "Home":
          event.preventDefault()
          focusCell(0)
          return
        case "End":
          event.preventDefault()
          focusCell(current.length)
          return
      }
      // Retyping the same character fires no change event, so advance here instead.
      const plain =
        event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
      if (plain && current[index] === event.key && index < length - 1) {
        event.preventDefault()
        focusCell(index + 1)
      }
    }

    const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
      event.preventDefault()
      const text = sanitize(event.clipboardData.getData("text"), type)
      if (!text) return
      const next = text.length >= length ? text : latest.current.slice(0, index) + text
      update(next, Math.min(next.slice(0, length).length, length - 1))
    }

    const labelFor =
      getCellLabel ??
      ((index: number, total: number) =>
        `${type === "numeric" ? "Digit" : "Character"} ${index + 1} of ${total}`)

    return (
      <div
        ref={ref}
        role="group"
        // Codes read left to right even in right-to-left interfaces.
        dir="ltr"
        className={cx(
          "kg-pin-input inline-flex items-center max-w-full data-disabled:opacity-50",
          "data-invalid:animate-[kg-pin-input-shake_var(--kg-duration-slower)_var(--kg-ease-out)]",
          "motion-reduce:animate-none in-data-[kg-motion=reduce]:animate-none",
          sizeClass[size],
          className,
        )}
        data-size={size}
        data-invalid={control.invalid || undefined}
        data-disabled={control.disabled || undefined}
        data-complete={value.length === length || undefined}
        aria-labelledby={ariaLabelledBy ?? control.labelId}
        aria-describedby={control.describedBy}
        {...props}
      >
        {Array.from({ length }, (_, index) => {
          const char = value[index] ?? ""
          const separated = !!groupSize && index > 0 && index % groupSize === 0
          return (
            // Cells are positional; their identity is their index.
            <Fragment key={index}>
              {separated && (
                <span
                  className="kg-pin-input__separator shrink-0 w-[0.5rem] h-[2px] mx-0.5 bg-kg-ink rounded-full"
                  aria-hidden="true"
                />
              )}
              <input
                ref={(node) => {
                  cells.current[index] = node
                }}
                id={index === 0 ? control.id : undefined}
                className={cx(
                  cellClass,
                  control.invalid
                    ? "border-kg-danger caret-kg-danger [--_lift:var(--kg-danger)]"
                    : "border-kg-ink caret-kg-accent-strong",
                )}
                type={mask ? "password" : "text"}
                inputMode={type === "numeric" ? "numeric" : "text"}
                pattern={type === "numeric" ? "[0-9]*" : undefined}
                autoComplete={index === 0 && otp ? "one-time-code" : "off"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus={index === 0 && autoFocus}
                value={char}
                placeholder={placeholder}
                disabled={control.disabled}
                data-filled={char ? "" : undefined}
                aria-label={labelFor(index, length)}
                aria-invalid={control.invalid || undefined}
                aria-errormessage={control.errorMessage}
                aria-describedby={index === 0 ? control.describedBy : undefined}
                onFocus={() => handleFocus(index)}
                onChange={(event) => handleChange(event, index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPaste={(event) => handlePaste(event, index)}
              />
            </Fragment>
          )
        })}
        {name !== undefined && <input type="hidden" name={name} value={value} />}
      </div>
    )
  },
)

PinInput.displayName = "PinInput"
