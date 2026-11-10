"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { clamp, roundToStep } from "../../utils/math.js"
import { useField } from "../field/field.js"

export type KnobSize = "sm" | "md" | "lg"

export interface KnobProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** Called once a drag or key press settles. */
  onValueCommit?: (value: number) => void
  min?: number
  max?: number
  step?: number
  size?: KnobSize
  /** Shows the value in the centre. */
  showValue?: boolean
  formatValue?: (value: number) => string
  /** Pixels of vertical drag that cover the full range. */
  dragRange?: number
  disabled?: boolean
}

const SWEEP = 270
const ARC = "M 21.716 78.284 A 40 40 0 1 1 78.284 78.284"

const knobVariants = variants({
  base: [
    "kg-knob group relative inline-grid place-items-center shrink-0 rounded-full",
    "cursor-ns-resize touch-none select-none [-webkit-tap-highlight-color:transparent]",
    "*:col-start-1 *:row-start-1",
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kg-ring",
    "data-disabled:cursor-not-allowed data-disabled:opacity-50",
  ],
  variants: {
    size: {
      sm: "size-[3.75rem]",
      md: "size-[5.5rem]",
      lg: "size-[7.5rem]",
    },
  },
  defaults: { size: "md" },
})

/**
 * A rotary control on the WAI-ARIA slider pattern. Drag up or down to turn it, or use the
 * arrow, Page, Home and End keys. The arc fills along a 270 degree sweep.
 */
export const Knob = forwardRef<HTMLDivElement, KnobProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      onValueCommit,
      min = 0,
      max = 100,
      step = 1,
      size = "md",
      showValue = true,
      formatValue = (v) => String(v),
      dragRange = 180,
      disabled: disabledProp,
      className,
      style,
      onKeyDown,
      onKeyUp,
      "aria-labelledby": labelledBy,
      ...props
    },
    ref,
  ) => {
    const field = useField()
    const disabled = disabledProp ?? field?.disabled ?? false
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? min,
      onChange: onValueChange,
    })
    const drag = useRef<{ y: number; start: number } | null>(null)
    const latest = useRef(value)
    latest.current = value

    const set = (next: number) => {
      const snapped = clamp(roundToStep(next, step, min), min, max)
      latest.current = snapped
      setValue(snapped)
      return snapped
    }
    const fraction = (value - min) / (max - min || 1)

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented || disabled) return
      const page = Math.max(step, (max - min) / 10)
      const moves: Record<string, number> = {
        ArrowUp: value + step,
        ArrowRight: value + step,
        ArrowDown: value - step,
        ArrowLeft: value - step,
        PageUp: value + page,
        PageDown: value - page,
        Home: min,
        End: max,
      }
      const next = moves[event.key]
      if (next === undefined) return
      event.preventDefault()
      set(next)
    }

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0) return
      event.preventDefault()
      event.currentTarget.focus()
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { y: event.clientY, start: value }
    }
    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = drag.current
      if (!state) return
      // Shift slows the turn for fine adjustment.
      const scale = event.shiftKey ? 0.2 : 1
      const delta = ((state.y - event.clientY) / dragRange) * (max - min) * scale
      set(state.start + delta)
    }
    const endDrag = () => {
      if (!drag.current) return
      drag.current = null
      onValueCommit?.(latest.current)
    }

    return (
      <div
        ref={ref}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        aria-disabled={disabled || undefined}
        aria-labelledby={labelledBy ?? field?.labelId}
        aria-orientation="vertical"
        className={knobVariants({ size, className })}
        data-size={size}
        data-disabled={disabled || undefined}
        style={
          {
            ...style,
            "--_turn": `${-SWEEP / 2 + fraction * SWEEP}deg`,
          } as CSSProperties
        }
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => {
          onKeyUp?.(event)
          if (event.key.startsWith("Arrow") || event.key.startsWith("Page") || event.key === "Home" || event.key === "End")
            onValueCommit?.(latest.current)
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        {...props}
      >
        <svg
          className="kg-knob__dial size-full overflow-visible fill-none [stroke-linecap:round]"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <path className="kg-knob__edge stroke-kg-ink [stroke-width:10]" d={ARC} />
          <path className="kg-knob__track stroke-kg-surface [stroke-width:6]" d={ARC} pathLength={100} />
          <path
            className={cx(
              "kg-knob__fill stroke-kg-ink [stroke-width:6]",
              "transition-[stroke-dasharray] duration-(--kg-duration-fast) ease-kg-out",
            )}
            d={ARC}
            pathLength={100}
            strokeDasharray={`${fraction * 100} 100`}
          />
        </svg>
        <span
          className={cx(
            "kg-knob__cap relative size-[64%] rounded-full border-2 border-kg-ink bg-kg-surface shadow-kg-xs",
            "transition-[box-shadow,translate] duration-(--kg-duration-fast) ease-kg-out",
            "group-[:active:not([data-disabled])]:shadow-none group-[:active:not([data-disabled])]:[translate:2px_2px]",
          )}
          aria-hidden="true"
        >
          {/* The notch turns, not the cap, so the cap's offset shadow stays put. */}
          <span
            className={cx(
              "kg-knob__notch absolute inset-0 rotate-(--_turn) transition-[rotate] duration-(--kg-duration-fast) ease-kg-out",
              "before:absolute before:top-[9%] before:left-1/2 before:w-[3px] before:h-[22%] before:-translate-x-1/2",
              "before:rounded-full before:bg-kg-ink",
            )}
          />
        </span>
        {showValue && (
          <span
            className={cx(
              "kg-knob__value self-end -mb-[0.2rem] px-[0.45em] py-[0.1em] pointer-events-none",
              "rounded-full border border-kg-ink bg-kg-surface text-kg-xs font-semibold tabular-nums text-kg-fg",
              "[[data-size=sm]>&]:text-[0.65rem]",
            )}
            aria-hidden="true"
          >
            {formatValue(value)}
          </span>
        )}
      </div>
    )
  },
)

Knob.displayName = "Knob"
