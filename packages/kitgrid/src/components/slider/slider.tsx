"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp, roundToStep } from "../../utils/math.js"
import { resolveFieldControl, useField } from "../field/field.js"

export type SliderSize = "sm" | "md" | "lg"
export type SliderOrientation = "horizontal" | "vertical"

export interface SliderMark {
  value: number
  /** Text under the track. Ticks without a label are still drawn. */
  label?: ReactNode
}

const sizeClass: Record<SliderSize, string> = {
  sm: "[--_thumb:0.875rem] [--_rail:0.5rem]",
  md: "[--_thumb:1.125rem] [--_rail:0.625rem]",
  lg: "[--_thumb:1.375rem] [--_rail:0.75rem]",
}

/*
 * Positions are computed here so the CSS stays transform-only: translate to the value, scale
 * the fill to the length. --_glide drops to 0 while dragging, so the thumb follows 1:1.
 */
const glide = "translate var(--_glide) var(--kg-ease-out), scale var(--_glide) var(--kg-ease-out)"

const along = (p: number, vertical: boolean): CSSProperties => ({
  translate: vertical ? `0 calc(${p} * -1cqb)` : `calc(${p} * 1cqi * var(--_dir)) 0`,
})

/* Shown while focused from the keyboard, or while its thumb is dragged. */
const valueShown = (vertical: boolean) =>
  vertical
    ? "[.kg-slider__thumb:focus-visible>&]:opacity-100 [.kg-slider__thumb:focus-visible>&]:translate-x-0 [.kg-slider__thumb:focus-visible>&]:scale-100 [.kg-slider[data-dragging]_.kg-slider__thumb[data-active]>&]:opacity-100 [.kg-slider[data-dragging]_.kg-slider__thumb[data-active]>&]:translate-x-0 [.kg-slider[data-dragging]_.kg-slider__thumb[data-active]>&]:scale-100"
    : "[.kg-slider__thumb:focus-visible>&]:opacity-100 [.kg-slider__thumb:focus-visible>&]:translate-y-0 [.kg-slider__thumb:focus-visible>&]:scale-100 [.kg-slider[data-dragging]_.kg-slider__thumb[data-active]>&]:opacity-100 [.kg-slider[data-dragging]_.kg-slider__thumb[data-active]>&]:translate-y-0 [.kg-slider[data-dragging]_.kg-slider__thumb[data-active]>&]:scale-100"

const valueClass = (vertical: boolean, mode: "auto" | "always") =>
  cx(
    "kg-slider__value kg-tabular absolute px-2 py-1 text-kg-xs font-semibold leading-none whitespace-nowrap",
    "text-kg-accent-fg bg-kg-accent rounded-kg-sm pointer-events-none",
    "transition-[opacity,translate,scale] duration-(--kg-duration-base) ease-kg-out",
    "after:absolute after:size-[0.5rem] after:bg-inherit after:rounded-[1px] after:rotate-45",
    vertical
      ? "bottom-1/2 left-[calc(100%+0.625rem)] translate-y-1/2 origin-left after:top-1/2 after:left-0 after:-mt-1 after:-ml-[0.2rem]"
      : "bottom-[calc(100%+0.625rem)] left-1/2 -translate-x-1/2 origin-bottom after:top-full after:left-1/2 after:-mt-[0.3rem] after:-ml-1",
    mode === "always"
      ? cx("opacity-100 scale-100", vertical ? "translate-x-0" : "translate-y-0")
      : cx("opacity-0 scale-85", vertical ? "-translate-x-1" : "translate-y-1", valueShown(vertical)),
  )

export interface SliderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  /** One number per thumb, ascending. Two or more numbers make a range slider. */
  value?: number[]
  /** Uncontrolled initial value. Defaults to `[min]`. */
  defaultValue?: number[]
  /** Every change: drag frames, key presses, track clicks. */
  onValueChange?: (value: number[]) => void
  /** Once per interaction: pointer release or key press. Use it for expensive work. */
  onValueCommit?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  /** Increment for PageUp / PageDown and Shift+Arrow. Defaults to 10 steps. */
  largeStep?: number
  /** Minimum gap between neighbouring thumbs, in steps. Thumbs never cross either way. */
  minStepsBetweenThumbs?: number
  marks?: SliderMark[]
  orientation?: SliderOrientation
  size?: SliderSize
  disabled?: boolean
  invalid?: boolean
  /** Submits one hidden input per thumb under this name. */
  name?: string
  /** Formats the value bubble and `aria-valuetext`, e.g. as currency. */
  formatValue?: (value: number, index: number) => string
  /** Accessible name per thumb. Range sliders default to "Minimum" / "Maximum". */
  thumbLabels?: string[]
  /** `auto` shows the value bubble while a thumb is dragged or keyboard-focused. */
  showValue?: "auto" | "always" | "never"
}

const defaultThumbLabel = (index: number, count: number): string =>
  count === 2 ? (index === 0 ? "Minimum" : "Maximum") : `Value ${index + 1} of ${count}`

const sameValues = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

/** Index of the thumb nearest `target`; stacked thumbs split by the side the pointer is on. */
const closestThumb = (values: readonly number[], target: number): number => {
  let best = 0
  let distance = Number.POSITIVE_INFINITY
  values.forEach((value, index) => {
    const d = Math.abs(value - target)
    if (d < distance || (d === distance && target > value)) {
      best = index
      distance = d
    }
  })
  return best
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      onValueCommit,
      min = 0,
      max = 100,
      step = 1,
      largeStep,
      minStepsBetweenThumbs = 0,
      marks,
      orientation = "horizontal",
      size = "md",
      disabled: disabledProp,
      invalid: invalidProp,
      name,
      formatValue,
      thumbLabels,
      showValue = "auto",
      className,
      style,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
      ...props
    },
    forwardedRef,
  ) => {
    const field = useField()
    const control = resolveFieldControl(field, {
      disabled: disabledProp,
      invalid: invalidProp,
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
    })
    const disabled = control.disabled
    const vertical = orientation === "vertical"

    const [rawValues, setValues] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? [min],
      onChange: onValueChange,
    })
    const values = rawValues.map((value) => clamp(value, min, max))
    const latest = useRef(values)
    latest.current = values

    const root = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(root, forwardedRef)
    const controlRef = useRef<HTMLDivElement>(null)
    const thumbs = useRef<(HTMLSpanElement | null)[]>([])
    const drag = useRef<{
      index: number
      offset: number
      start: number[]
      rtl: boolean
    } | null>(null)
    const commit = useEventCallback(onValueCommit)

    const span = max - min || 1
    const percent = (value: number) => ((value - min) / span) * 100
    const gap = minStepsBetweenThumbs * step
    const bounds = (list: readonly number[], index: number) => ({
      lower: index > 0 ? (list[index - 1] as number) + gap : min,
      upper: index < list.length - 1 ? (list[index + 1] as number) - gap : max,
    })

    /** Moves one thumb, clamped between its neighbours. Returns the new list, or null if unchanged. */
    const moveThumb = (index: number, target: number): number[] | null => {
      const current = latest.current
      const { lower, upper } = bounds(current, index)
      const next = clamp(roundToStep(target, step, min), lower, upper)
      if (next === current[index]) return null
      const updated = current.slice()
      updated[index] = next
      latest.current = updated
      setValues(updated)
      return updated
    }

    const valueAt = (clientX: number, clientY: number, rtl: boolean): number => {
      const rect = controlRef.current?.getBoundingClientRect()
      if (!rect) return min
      let ratio = vertical
        ? (rect.bottom - clientY) / (rect.height || 1)
        : (clientX - rect.left) / (rect.width || 1)
      if (rtl && !vertical) ratio = 1 - ratio
      return min + clamp(ratio, 0, 1) * span
    }

    const setDragging = (index: number | null) => {
      const node = root.current
      if (!node) return
      // Written to the DOM directly: drag state changes per gesture, and React needn't re-render.
      if (index === null) delete node.dataset.dragging
      else node.dataset.dragging = ""
      thumbs.current.forEach((thumb, i) => {
        if (!thumb) return
        if (i === index) thumb.dataset.active = ""
        else delete thumb.dataset.active
      })
    }

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event)
      if (event.defaultPrevented || disabled || event.button !== 0) return
      const node = root.current
      if (!node) return
      event.preventDefault()
      const rtl = getComputedStyle(node).direction === "rtl"
      const target = event.target as HTMLElement
      const pointerValue = valueAt(event.clientX, event.clientY, rtl)
      const thumbIndex = Number(
        target.closest<HTMLElement>("[data-index]")?.dataset.index,
      )
      const markValue = Number(
        target.closest<HTMLElement>("[data-mark-value]")?.dataset.markValue,
      )
      const current = latest.current

      let index: number
      let offset = 0
      if (Number.isInteger(thumbIndex) && thumbIndex < current.length) {
        // Grabbing a thumb off-centre keeps that offset, so the thumb doesn't jump to the cursor.
        index = thumbIndex
        offset = pointerValue - (current[index] as number)
      } else {
        const jumpTo = Number.isFinite(markValue) ? markValue : pointerValue
        index = closestThumb(current, jumpTo)
        moveThumb(index, jumpTo)
      }

      drag.current = { index, offset, start: current, rtl }
      node.setPointerCapture?.(event.pointerId)
      setDragging(index)
      thumbs.current[index]?.focus({ preventScroll: true })
    }

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event)
      const state = drag.current
      if (!state) return
      moveThumb(
        state.index,
        valueAt(event.clientX, event.clientY, state.rtl) - state.offset,
      )
    }

    const endDrag = (event: PointerEvent<HTMLDivElement>) => {
      const state = drag.current
      if (!state) return
      drag.current = null
      root.current?.releasePointerCapture?.(event.pointerId)
      setDragging(null)
      if (!sameValues(state.start, latest.current)) commit(latest.current)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>, index: number) => {
      if (disabled) return
      const big = largeStep ?? step * 10
      const rtl = !vertical && getComputedStyle(event.currentTarget).direction === "rtl"
      const forward = rtl ? -1 : 1
      const unit = event.shiftKey ? big : step
      const current = latest.current[index] as number
      const { lower, upper } = bounds(latest.current, index)
      let target: number
      switch (event.key) {
        case "ArrowRight":
          target = current + unit * forward
          break
        case "ArrowLeft":
          target = current - unit * forward
          break
        case "ArrowUp":
          target = current + unit
          break
        case "ArrowDown":
          target = current - unit
          break
        case "PageUp":
          target = current + big
          break
        case "PageDown":
          target = current - big
          break
        case "Home":
          target = lower
          break
        case "End":
          target = upper
          break
        default:
          return
      }
      event.preventDefault()
      const next = moveThumb(index, target)
      if (next) commit(next)
    }

    const range = values.length > 1
    const first = values[0] ?? min
    const last = values[values.length - 1] ?? min
    const start = range ? percent(first) : 0
    const end = percent(range ? last : first)

    return (
      <div
        ref={ref}
        className={cx(
          "kg-slider relative flex min-w-0 text-kg-fg cursor-pointer select-none [-webkit-tap-highlight-color:transparent]",
          "[--_dir:1] rtl:[--_dir:-1] [--_on:var(--kg-accent)] [--_edge:var(--kg-ink)]",
          "[--_glide:var(--kg-duration-slow)] data-dragging:[--_glide:0s] data-dragging:cursor-grabbing",
          "data-invalid:[--_on:var(--kg-danger)] data-invalid:[--_edge:var(--kg-danger)]",
          "data-disabled:cursor-not-allowed data-disabled:opacity-50",
          vertical
            ? "flex-row w-auto h-[12rem] py-[calc(var(--_thumb)/2)] touch-pan-x"
            : "flex-col w-full px-[calc(var(--_thumb)/2)] touch-pan-y",
          sizeClass[size],
          className,
        )}
        style={style}
        data-orientation={orientation}
        data-size={size}
        data-show-value={showValue}
        data-disabled={disabled || undefined}
        data-invalid={control.invalid || undefined}
        data-marks={marks?.some((mark) => mark.label != null) || undefined}
        role={range ? "group" : undefined}
        aria-label={range ? ariaLabel : undefined}
        aria-labelledby={range ? (ariaLabelledBy ?? control.labelId) : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          onPointerUp?.(event)
          endDrag(event)
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event)
          endDrag(event)
        }}
        {...props}
      >
        <div
          ref={controlRef}
          className={cx(
            "kg-slider__control relative flex items-center",
            vertical ? "flex-col w-(--_thumb) h-full [container-type:size]" : "h-(--_thumb) @container",
          )}
        >
          <div
            className={cx(
              "kg-slider__track relative flex-1 overflow-hidden bg-kg-surface border-2 border-(--_edge) rounded-full",
              vertical ? "w-(--_rail)" : "h-(--_rail)",
            )}
          >
            <div
              className={cx(
                "kg-slider__range absolute inset-0 bg-(--_on)",
                vertical ? "origin-bottom" : "origin-left rtl:origin-right",
              )}
              style={{
                translate: vertical
                  ? `0 calc(${start} * -1%)`
                  : `calc(${start} * 1% * var(--_dir)) 0`,
                scale: vertical ? `1 ${(end - start) / 100}` : `${(end - start) / 100} 1`,
                transition: glide,
              }}
            />
          </div>
          {marks?.map((mark) => {
            const p = percent(clamp(mark.value, min, max))
            const inRange = range
              ? mark.value >= first && mark.value <= last
              : mark.value <= first
            return (
              <span
                key={mark.value}
                className={cx(
                  "kg-slider__tick absolute size-[0.25rem] rounded-full pointer-events-none transition-colors duration-(--kg-duration-fast) ease-kg-out",
                  vertical
                    ? "bottom-0 left-1/2 -mb-[0.125rem] -ml-[0.125rem]"
                    : "top-1/2 start-0 -mt-[0.125rem] -ms-[0.125rem]",
                  inRange ? "bg-kg-accent-fg" : "bg-kg-fg-muted",
                )}
                data-in-range={inRange || undefined}
                style={along(p, vertical)}
                aria-hidden="true"
              />
            )
          })}
          {values.map((value, index) => {
            const { lower, upper } = bounds(values, index)
            const text = formatValue?.(value, index)
            const label =
              thumbLabels?.[index] ??
              (range ? defaultThumbLabel(index, values.length) : ariaLabel)
            return (
              <span
                // Thumbs are positional: the first is always the lowest value.
                key={index}
                ref={(node) => {
                  thumbs.current[index] = node
                }}
                role="slider"
                tabIndex={disabled ? undefined : 0}
                id={index === 0 ? field?.id : undefined}
                className={cx(
                  "kg-slider__thumb absolute z-1 size-(--_thumb) rounded-full bg-kg-surface border-2 border-(--_edge)",
                  "shadow-[2px_2px_0_var(--_edge)] cursor-grab touch-none",
                  "hover:shadow-[3px_3px_0_var(--_edge)] data-active:scale-110 focus:z-2",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                  "[.kg-slider[data-disabled]_&]:cursor-not-allowed [.kg-slider[data-disabled]_&]:shadow-none",
                  vertical
                    ? "bottom-0 left-1/2 -mb-[calc(var(--_thumb)/2)] -ml-[calc(var(--_thumb)/2)]"
                    : "top-1/2 start-0 -mt-[calc(var(--_thumb)/2)] -ms-[calc(var(--_thumb)/2)]",
                )}
                data-index={index}
                style={{
                  ...along(percent(value), vertical),
                  transition: `${glide}, box-shadow var(--kg-duration-fast) var(--kg-ease-out)`,
                }}
                aria-valuemin={lower}
                aria-valuemax={upper}
                aria-valuenow={value}
                aria-valuetext={text}
                aria-orientation={orientation}
                aria-disabled={disabled || undefined}
                aria-invalid={control.invalid || undefined}
                aria-errormessage={control.errorMessage}
                aria-label={label}
                aria-labelledby={
                  label === undefined && !range
                    ? (ariaLabelledBy ?? control.labelId)
                    : undefined
                }
                aria-describedby={control.describedBy}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                {showValue !== "never" && (
                  <span className={valueClass(vertical, showValue)} aria-hidden="true">
                    {text ?? value}
                  </span>
                )}
              </span>
            )
          })}
        </div>
        {marks?.some((mark) => mark.label != null) && (
          <div
            className={cx(
              "kg-slider__marks relative text-kg-xs text-kg-fg-muted",
              vertical ? "ms-2" : "h-[1.4em] mt-1.5",
            )}
            aria-hidden="true"
          >
            {marks.map((mark) => {
              if (mark.label == null) return null
              const p = percent(clamp(mark.value, min, max))
              const edge = p <= 0 ? "start" : p >= 100 ? "end" : undefined
              return (
                <span
                  key={mark.value}
                  className="kg-slider__mark absolute whitespace-nowrap leading-[1.4]"
                  data-mark-value={mark.value}
                  data-edge={edge}
                  style={
                    vertical
                      ? { bottom: `${p}%`, insetInlineStart: 0, translate: "0 50%" }
                      : {
                          top: 0,
                          insetInlineStart: `${p}%`,
                          translate:
                            edge === "start"
                              ? "0 0"
                              : edge === "end"
                                ? "calc(-100% * var(--_dir)) 0"
                                : "calc(-50% * var(--_dir)) 0",
                        }
                  }
                >
                  {mark.label}
                </span>
              )
            })}
          </div>
        )}
        {name !== undefined &&
          values.map((value, index) => (
            <input
              key={index}
              type="hidden"
              name={name}
              value={value}
              disabled={disabled}
            />
          ))}
      </div>
    )
  },
)

Slider.displayName = "Slider"
