"use client"

import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

export type RowSplitterOrientation = "horizontal" | "vertical"

export interface RowSplitterProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "defaultValue" | "onChange"
> {
  /** Exactly two panes. */
  children: ReactNode
  /** `horizontal` puts the panes side by side; `vertical` stacks them. */
  orientation?: RowSplitterOrientation
  /** Size of the first pane, in percent. */
  value?: number
  defaultValue?: number
  /** Called when a drag ends or a key moves the split. */
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  /** Arrow-key step, in percent. Shift multiplies it by five. */
  step?: number
  /** Names the separator. */
  label?: string
}

const handleClass = {
  horizontal: [
    "kg-row-splitter__handle group/handle relative grid cursor-col-resize touch-none place-items-center rounded-kg-sm",
    "before:absolute before:inset-y-0 before:start-1/2 before:w-px before:-translate-x-1/2 rtl:before:translate-x-1/2 before:bg-kg-border before:content-['']",
  ],
  vertical: [
    "kg-row-splitter__handle group/handle relative grid cursor-row-resize touch-none place-items-center rounded-kg-sm",
    "before:absolute before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-kg-border before:content-['']",
  ],
}

/* The hairline is always there; the ink grip only appears while the handle is in use. */
const gripClass = [
  "kg-row-splitter__grip relative rounded-full bg-kg-ink shadow-[0_0_0_1px_var(--kg-surface)]",
  "transition-[opacity,scale] duration-(--kg-duration-base) ease-kg-out",
]

const paneClass = "kg-row-splitter__pane min-h-0 min-w-0 overflow-auto"

const round = (value: number) => Math.round(value * 10) / 10

/**
 * Two panes with a draggable, keyboard-operable separator between them (the WAI-ARIA window
 * splitter pattern). Arrows move it, Home and End jump to the limits, Enter or a double-click
 * restores the default. Dragging writes to a CSS variable, so the panes re-layout without a
 * React render per frame.
 */
export const RowSplitter = forwardRef<HTMLDivElement, RowSplitterProps>(
  (
    {
      children,
      orientation = "horizontal",
      value: valueProp,
      defaultValue = 50,
      onValueChange,
      min = 20,
      max = 80,
      step = 2,
      label = "Resize panes",
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const root = useRef<HTMLDivElement>(null)
    const handle = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(root, forwardedRef)
    const paneId = useId()
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [dragging, setDragging] = useState(false)
    const live = useRef(value)
    const frame = useRef(0)
    const [first, second] = Children.toArray(children)
    const split = clamp(value, min, max)
    const horizontal = orientation === "horizontal"

    useEffect(() => () => cancelAnimationFrame(frame.current), [])

    const paint = (next: number) => {
      root.current?.style.setProperty("--_split", `${next}%`)
      handle.current?.setAttribute("aria-valuenow", String(Math.round(next)))
    }

    const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
      const box = root.current?.getBoundingClientRect()
      if (!box || box.width === 0 || box.height === 0) return live.current
      const rtl = horizontal && getComputedStyle(root.current as Element).direction === "rtl"
      const ratio = horizontal
        ? (rtl ? box.right - event.clientX : event.clientX - box.left) / box.width
        : (event.clientY - box.top) / box.height
      return clamp(round(ratio * 100), min, max)
    }

    const end = (event: PointerEvent<HTMLDivElement>) => {
      if (!dragging) return
      cancelAnimationFrame(frame.current)
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId)
      setDragging(false)
      setValue(live.current)
    }

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      const amount = event.shiftKey ? step * 5 : step
      const back = horizontal ? "ArrowLeft" : "ArrowUp"
      const forward = horizontal ? "ArrowRight" : "ArrowDown"
      const rtl =
        horizontal && root.current && getComputedStyle(root.current).direction === "rtl"
      const next: Record<string, number> = {
        [back]: split + (rtl ? amount : -amount),
        [forward]: split + (rtl ? -amount : amount),
        Home: min,
        End: max,
        Enter: clamp(defaultValue, min, max),
      }
      const target = next[event.key]
      if (target === undefined) return
      event.preventDefault()
      setValue(clamp(round(target), min, max))
    }

    return (
      <div
        ref={ref}
        className={cx(
          "kg-row-splitter grid min-h-0 min-w-0 [--_handle:calc(var(--kg-space)*4)]",
          horizontal
            ? "grid-cols-[minmax(0,var(--_split,50%))_var(--_handle)_minmax(0,1fr)]"
            : "grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,var(--_split,50%))_var(--_handle)_minmax(0,1fr)]",
          dragging && (horizontal ? "cursor-col-resize select-none" : "cursor-row-resize select-none"),
          className,
        )}
        data-orientation={orientation}
        data-dragging={dragging || undefined}
        style={{ ...style, "--_split": `${split}%` } as CSSProperties}
        {...props}
      >
        <div className={paneClass} id={paneId}>
          {first}
        </div>
        <div
          ref={handle}
          role="separator"
          tabIndex={0}
          aria-label={label}
          aria-controls={paneId}
          aria-orientation={horizontal ? "vertical" : "horizontal"}
          aria-valuenow={Math.round(split)}
          aria-valuemin={min}
          aria-valuemax={max}
          className={cx(
            handleClass[orientation],
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          )}
          onKeyDown={onKeyDown}
          onDoubleClick={() => setValue(clamp(defaultValue, min, max))}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            event.currentTarget.focus()
            live.current = split
            setDragging(true)
          }}
          onPointerMove={(event) => {
            if (!dragging) return
            const next = fromPointer(event)
            live.current = next
            cancelAnimationFrame(frame.current)
            frame.current = requestAnimationFrame(() => paint(next))
          }}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <span
            className={cx(
              gripClass,
              horizontal ? "h-[3rem] w-[4px]" : "h-[4px] w-[3rem]",
              dragging
                ? horizontal
                  ? "scale-y-150 opacity-100"
                  : "scale-x-150 opacity-100"
                : cx(
                    "opacity-0 group-hover/handle:scale-100 group-hover/handle:opacity-100",
                    "group-focus-visible/handle:scale-100 group-focus-visible/handle:opacity-100",
                    horizontal ? "scale-y-70" : "scale-x-70",
                  ),
            )}
            aria-hidden="true"
          />
        </div>
        <div className={paneClass}>{second}</div>
      </div>
    )
  },
)

RowSplitter.displayName = "RowSplitter"
