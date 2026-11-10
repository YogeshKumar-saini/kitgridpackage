"use client"

import {
  type ChangeEvent,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { clamp, roundToStep } from "../../utils/math.js"
import { IconButton } from "../icon-button/icon-button.js"
import { RollingDigits } from "./rolling-digits.js"

export type QuantityStepperSize = "sm" | "md" | "lg"
export type QuantityStepperVariant = "outline" | "soft"

export interface QuantityStepperLabels {
  /** Receives the `label` prop (the product name) when there is one. */
  decrease?: (label?: string) => string
  increase?: (label?: string) => string
  remove?: (label?: string) => string
  input?: (label?: string) => string
}

export interface QuantityStepperProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  value?: number
  defaultValue?: number
  /** Fires on every step, including each auto-repeat while a button is held. */
  onValueChange?: (value: number) => void
  /** Fires once an interaction settles (button released, typing committed): sync the cart here. */
  onValueCommit?: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** The product name, used in every control's accessible name. */
  label?: string
  /** A cart update is in flight: controls stay focusable but inert and a spinner shows. */
  loading?: boolean
  disabled?: boolean
  /** When set, the decrease button becomes a remove button at `min`. */
  onRemove?: () => void
  size?: QuantityStepperSize
  variant?: QuantityStepperVariant
  /** Name of the input for native form submission. */
  name?: string
  labels?: QuantityStepperLabels
}

const defaultLabels: Required<QuantityStepperLabels> = {
  decrease: (label) => (label ? `Decrease quantity of ${label}` : "Decrease quantity"),
  increase: (label) => (label ? `Increase quantity of ${label}` : "Increase quantity"),
  remove: (label) => (label ? `Remove ${label}` : "Remove item"),
  input: (label) => (label ? `Quantity of ${label}` : "Quantity"),
}

const HOLD_DELAY = 400
const REPEAT_START = 120
const REPEAT_MIN = 35

const MinusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    className="animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]"
  >
    <path d="M5 12h14" strokeLinecap="round" />
  </svg>
)

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    className="animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]"
  >
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
)

const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]"
  >
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
)

const buttonClass =
  "kg-quantity-stepper__button touch-manipulation select-none [-webkit-touch-callout:none] aria-disabled:cursor-not-allowed aria-disabled:opacity-40"

/* Retunes the ghost IconButton: inset in the sheet, ink glyphs, sage on hover (rose to remove). */
const buttonStyle = (remove: boolean) =>
  ({
    "--_size": "calc(var(--_height) - 8px)",
    "--_fg": "var(--kg-fg)",
    "--_fg-hover": "var(--kg-fg)",
    "--_bg-hover": remove ? "var(--kg-paper-rose)" : "var(--kg-paper-sage)",
    borderRadius: "calc(var(--kg-radius-md) - 4px)",
  }) as CSSProperties

/* Paper Layers: one ink-edged sheet holding − / value / +; focus on the value lifts it. */
const stepperVariants = variants({
  base: [
    "kg-quantity-stepper inline-flex h-(--_height) items-center rounded-kg-md border-2 p-0.5 text-(length:--_text) text-kg-fg",
    "transition-[border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
    "has-[input:focus-visible]:shadow-kg-sm has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-kg-ring",
    "data-disabled:opacity-50",
  ],
  variants: {
    size: {
      sm: "rounded-kg-sm [--_height:var(--kg-control-sm)] [--_text:var(--kg-text-sm)]",
      md: "[--_height:var(--kg-control-md)] [--_text:var(--kg-text-base)]",
      lg: "[--_height:var(--kg-control-lg)] [--_text:var(--kg-text-md)]",
    },
    variant: {
      outline: "border-kg-ink bg-kg-surface",
      soft: "border-transparent bg-kg-paper-sage has-[input:focus-visible]:border-kg-ink",
    },
  },
  defaults: { size: "md", variant: "outline" },
})

/** An APG spinbutton flanked by − / + buttons that auto-repeat, accelerating, while held. */
export const QuantityStepper = forwardRef<HTMLDivElement, QuantityStepperProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      onValueCommit,
      min = 1,
      max = Number.POSITIVE_INFINITY,
      step = 1,
      label,
      loading = false,
      disabled = false,
      onRemove,
      size = "md",
      variant = "outline",
      name,
      labels,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? min,
      onChange: onValueChange,
    })
    const [draft, setDraft] = useState<string | null>(null)
    const latest = useRef(value)
    latest.current = value
    const hold = useRef<{ timer: ReturnType<typeof setTimeout>; delta: number } | null>(
      null,
    )
    // Pointer presses step on pointerdown; this stops the click that follows from stepping again.
    const pointerPress = useRef(false)
    const commitCallback = useEventCallback(onValueCommit)

    const inert = disabled || loading
    const atMin = value <= min
    const atMax = value >= max
    const removeMode = atMin && onRemove !== undefined
    const bigStep = step * 10

    const normalize = (next: number) => clamp(roundToStep(next, step, min), min, max)

    const apply = (next: number) => {
      const resolved = normalize(next)
      latest.current = resolved
      setValue(resolved)
      return resolved
    }

    const stopHold = useEventCallback(() => {
      if (!hold.current) return
      clearTimeout(hold.current.timer)
      hold.current = null
      commitCallback(latest.current)
    })

    useEffect(() => stopHold, [stopHold])

    useEffect(() => {
      if (!hold.current) return
      if (
        (hold.current.delta < 0 && atMin) ||
        (hold.current.delta > 0 && atMax) ||
        inert
      ) {
        stopHold()
      }
    }, [atMin, atMax, inert, stopHold])

    const startHold = (delta: number) => {
      apply(latest.current + delta)
      let delay = REPEAT_START
      const repeat = () => {
        apply(latest.current + delta)
        delay = Math.max(REPEAT_MIN, delay * 0.85)
        if (hold.current) hold.current.timer = setTimeout(repeat, delay)
      }
      hold.current = { delta, timer: setTimeout(repeat, HOLD_DELAY) }
    }

    const buttonHandlers = (delta: number, blocked: boolean, remove: boolean) => ({
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return
        pointerPress.current = false
        if (blocked || remove) return
        pointerPress.current = true
        startHold(delta)
      },
      onPointerUp: stopHold,
      onPointerLeave: stopHold,
      onPointerCancel: stopHold,
      onContextMenu: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault(),
      onClick: () => {
        if (pointerPress.current) {
          pointerPress.current = false
          return
        }
        if (inert) return
        if (remove) {
          onRemove?.()
          return
        }
        if (blocked) return
        commitCallback(apply(latest.current + delta))
      },
    })

    const draftValue = () => {
      const parsed = draft === null ? Number.NaN : Number.parseInt(draft, 10)
      return Number.isNaN(parsed) ? latest.current : parsed
    }

    const commitDraft = () => {
      if (draft === null) return
      setDraft(null)
      const parsed = Number.parseInt(draft, 10)
      if (!Number.isNaN(parsed)) commitCallback(apply(parsed))
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (inert) return
      const targets: Record<string, number | undefined> = {
        ArrowUp: draftValue() + step,
        ArrowDown: draftValue() - step,
        PageUp: draftValue() + bigStep,
        PageDown: draftValue() - bigStep,
        Home: min,
        End: Number.isFinite(max) ? max : undefined,
      }
      const next = targets[event.key]
      if (next !== undefined) {
        event.preventDefault()
        setDraft(null)
        commitCallback(apply(next))
      } else if (event.key === "Enter") {
        commitDraft()
      } else if (event.key === "Escape" && draft !== null) {
        event.preventDefault()
        setDraft(null)
      }
    }

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const pattern = min < 0 ? /[^\d-]/g : /\D/g
      setDraft(event.target.value.replace(pattern, ""))
    }

    const display = String(value)
    const chars = Math.max(
      2,
      display.length,
      Number.isFinite(max) ? String(max).length : 2,
    )

    return (
      <div
        ref={ref}
        className={stepperVariants({ size, variant, className })}
        data-size={size}
        data-variant={variant}
        data-loading={loading || undefined}
        data-disabled={disabled || undefined}
        aria-busy={loading || undefined}
        style={{ "--_chars": chars, ...style } as CSSProperties}
        {...props}
      >
        <IconButton
          className={buttonClass}
          style={buttonStyle(removeMode)}
          data-action={removeMode ? "remove" : "decrease"}
          label={removeMode ? text.remove(label) : text.decrease(label)}
          icon={removeMode ? <TrashIcon /> : <MinusIcon />}
          size={size}
          disabled={disabled}
          aria-disabled={
            (!disabled && (loading || (atMin && !removeMode))) || undefined
          }
          {...buttonHandlers(-step, inert || atMin, removeMode)}
        />
        <span
          className="kg-quantity-stepper__field relative grid place-items-center self-stretch"
          data-editing={draft !== null || undefined}
        >
          <input
            className={cx(
              "kg-quantity-stepper__input h-full w-[calc(var(--_chars)*1ch+1.25em)] [appearance:textfield] rounded-kg-xs border-0 bg-transparent p-0 text-center font-[inherit] font-semibold tabular-nums caret-kg-fg outline-none",
              "selection:bg-kg-paper-sage",
              draft === null ? "text-transparent selection:text-transparent" : "text-kg-fg selection:text-kg-fg",
            )}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            role="spinbutton"
            name={name}
            aria-label={text.input(label)}
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={Number.isFinite(max) ? max : undefined}
            value={draft ?? display}
            disabled={disabled}
            readOnly={loading}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={(event) => event.currentTarget.select()}
            onBlur={() => commitDraft()}
          />
          {draft === null && !loading && (
            <RollingDigits
              value={display}
              className="kg-quantity-stepper__digits pointer-events-none absolute font-semibold"
            />
          )}
          {loading && (
            <span
              className="kg-quantity-stepper__spinner pointer-events-none absolute size-[1em] animate-spin rounded-full border-2 border-current border-e-transparent opacity-70 [animation-duration:0.7s] motion-reduce:[animation-duration:1.6s]"
              aria-hidden="true"
            />
          )}
        </span>
        <IconButton
          className={buttonClass}
          style={buttonStyle(false)}
          data-action="increase"
          label={text.increase(label)}
          icon={<PlusIcon />}
          size={size}
          disabled={disabled}
          aria-disabled={(!disabled && (loading || atMax)) || undefined}
          {...buttonHandlers(step, inert || atMax, false)}
        />
      </div>
    )
  },
)

QuantityStepper.displayName = "QuantityStepper"
