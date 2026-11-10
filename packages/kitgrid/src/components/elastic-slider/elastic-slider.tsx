"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { createSpring, type Spring } from "../../hooks/use-spring.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp, roundToStep } from "../../utils/math.js"

export interface ElasticSliderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  /** Accessible name of the slider. */
  label: string
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Icon at the minimum end, nudged outward when the track is pulled past it. */
  leading?: ReactNode
  /** Icon at the maximum end. */
  trailing?: ReactNode
  /** Show the current value beside the track. */
  showValue?: boolean
  /** Human-readable value for assistive tech, such as "40 percent". */
  getValueText?: (value: number) => string
  disabled?: boolean
}

const MAX_PULL = 28

/**
 * A slider whose track stretches like a rubber band when dragged past either end and springs
 * back on release. Keyboard follows the WAI-ARIA slider pattern; the stretch is off under
 * reduced motion.
 */
export const ElasticSlider = forwardRef<HTMLDivElement, ElasticSliderProps>(
  (
    {
      label,
      value: valueProp,
      defaultValue,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      leading,
      trailing,
      showValue = false,
      getValueText,
      disabled = false,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? min,
      onChange: onValueChange,
    })
    const reduced = useReducedMotion()
    const rootRef = useRef<HTMLDivElement | null>(null)
    const composed = useComposedRefs(rootRef, ref)
    const spring = useRef<Spring | null>(null)
    const dragging = useRef(false)
    const percent = max > min ? (clamp(value, min, max) - min) / (max - min) : 0

    useEffect(() => {
      const root = rootRef.current
      if (!root) return
      // Positive pulls past the max end, negative past the min end.
      const write = (pull: number) => {
        root.style.setProperty("--_pull", pull.toFixed(2))
        root.dataset.pulling = pull > 0.5 ? "max" : pull < -0.5 ? "min" : ""
      }
      spring.current = createSpring(0, write, { stiffness: 320, damping: 14, precision: 0.05 })
      return () => spring.current?.stop()
    }, [])

    const commit = (next: number) => {
      setValue(clamp(roundToStep(next, step, min), min, max))
    }

    const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      commit(min + (clamp(x / (rect.width || 1), 0, 1) * (max - min)))
      if (reduced) return
      const over = x < 0 ? x : x > rect.width ? x - rect.width : 0
      const pull = Math.sign(over) * MAX_PULL * (1 - Math.exp(-Math.abs(over) / 120))
      spring.current?.jump(pull)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      const big = Math.max(step, (max - min) / 10)
      const map: Record<string, number> = {
        ArrowRight: value + step,
        ArrowUp: value + step,
        ArrowLeft: value - step,
        ArrowDown: value - step,
        PageUp: value + big,
        PageDown: value - big,
        Home: min,
        End: max,
      }
      const next = map[event.key]
      if (next === undefined) return
      event.preventDefault()
      commit(next)
    }

    return (
      <div
        ref={composed}
        className={cx(
          "kg-elastic-slider group/elastic flex w-full max-w-[22rem] touch-none items-center gap-3 text-kg-fg-muted [--_abs:max(var(--_pull),_-1_*_var(--_pull))] [--_pull:0] data-disabled:opacity-50",
          className,
        )}
        data-disabled={disabled || undefined}
        style={{ "--_p": percent, ...style } as CSSProperties}
        {...props}
      >
        {leading ? (
          <span
            className="kg-elastic-slider__icon inline-flex shrink-0 transition-transform duration-(--kg-duration-base) ease-kg-out [&_svg]:size-[1.1rem] group-data-[pulling=min]/elastic:text-kg-fg group-data-[pulling=min]/elastic:[transform:translateX(calc(var(--_pull)_*_0.6px))_scale(1.15)]"
            data-end="min"
            aria-hidden="true"
          >
            {leading}
          </span>
        ) : null}
        <div
          className="kg-elastic-slider__hit flex h-[1.75rem] flex-1 cursor-grab items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring active:cursor-grabbing group-data-disabled/elastic:cursor-not-allowed"
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={getValueText?.(value)}
          aria-disabled={disabled || undefined}
          onKeyDown={disabled ? undefined : handleKeyDown}
          onPointerDown={(event) => {
            if (disabled || event.button !== 0) return
            dragging.current = true
            event.currentTarget.setPointerCapture?.(event.pointerId)
            fromPointer(event)
          }}
          onPointerMove={(event) => {
            if (dragging.current) fromPointer(event)
          }}
          onPointerUp={() => {
            dragging.current = false
            spring.current?.set(0)
          }}
          onPointerCancel={() => {
            dragging.current = false
            spring.current?.set(0)
          }}
        >
          <span className="kg-elastic-slider__track relative block h-2 w-full origin-left overflow-hidden rounded-full bg-kg-muted [transform:scale(calc(1_+_var(--_abs)_/_260),calc(1_-_var(--_abs)_/_110))] group-data-[pulling=min]/elastic:origin-right">
            <span className="kg-elastic-slider__fill absolute inset-0 origin-left rounded-[inherit] bg-kg-ink [transform:scaleX(var(--_p))]" />
          </span>
        </div>
        {trailing ? (
          <span
            className="kg-elastic-slider__icon inline-flex shrink-0 transition-transform duration-(--kg-duration-base) ease-kg-out [&_svg]:size-[1.1rem] group-data-[pulling=max]/elastic:text-kg-fg group-data-[pulling=max]/elastic:[transform:translateX(calc(var(--_pull)_*_0.6px))_scale(1.15)]"
            data-end="max"
            aria-hidden="true"
          >
            {trailing}
          </span>
        ) : null}
        {showValue ? (
          <span className="kg-elastic-slider__value min-w-[2.5ch] text-end text-kg-sm text-kg-fg tabular-nums" aria-hidden="true">
            {Math.round(value * 100) / 100}
          </span>
        ) : null}
      </div>
    )
  },
)

ElasticSlider.displayName = "ElasticSlider"
