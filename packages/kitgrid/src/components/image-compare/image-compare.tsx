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
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

export type ImageCompareOrientation = "horizontal" | "vertical"

export interface ImageCompareProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Image or any element shown on the leading side. */
  before: ReactNode
  after: ReactNode
  beforeLabel?: string
  afterLabel?: string
  /** Divider position in percent. */
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  orientation?: ImageCompareOrientation
  /** Moves the divider on hover instead of drag. */
  hover?: boolean
  /** Accessible name of the divider. */
  label?: string
  /** CSS aspect ratio of the frame. */
  aspectRatio?: string
}

/**
 * A before/after reveal. The divider is a `slider`: drag it, click anywhere, or use arrows,
 * Page keys, Home and End. Position is written to a CSS variable, not React state.
 */
export const ImageCompare = forwardRef<HTMLDivElement, ImageCompareProps>(
  (
    {
      before,
      after,
      beforeLabel,
      afterLabel,
      value,
      defaultValue = 50,
      onValueChange,
      orientation = "horizontal",
      hover = false,
      label = "Comparison position",
      aspectRatio = "16 / 10",
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const root = useRef<HTMLDivElement>(null)
    const handle = useRef<HTMLDivElement>(null)
    const composed = useComposedRefs(root, forwardedRef)
    const position = useRef(value ?? defaultValue)
    const dragging = useRef(false)
    const emit = useEventCallback(onValueChange)
    const vertical = orientation === "vertical"

    const paint = (next: number) => {
      position.current = next
      root.current?.style.setProperty("--_p", String(next))
      const node = handle.current
      if (node) {
        node.setAttribute("aria-valuenow", String(Math.round(next)))
        node.setAttribute("aria-valuetext", `${Math.round(next)}%`)
      }
    }

    const set = (next: number) => {
      const clamped = clamp(next, 0, 100)
      if (clamped === position.current) return
      if (value === undefined) paint(clamped)
      emit(clamped)
    }

    useEffect(() => {
      if (value !== undefined) paint(clamp(value, 0, 100))
    }, [value])

    const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
      const rect = root.current?.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) return
      const ratio = vertical
        ? (event.clientY - rect.top) / rect.height
        : (event.clientX - rect.left) / rect.width
      const rtl = !vertical && getComputedStyle(root.current as Element).direction === "rtl"
      set((rtl ? 1 - ratio : ratio) * 100)
    }

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      const big = event.shiftKey ? 10 : 1
      const rtl = !vertical && getComputedStyle(event.currentTarget).direction === "rtl"
      const map: Record<string, number> = {
        ArrowRight: rtl ? -big : big,
        ArrowLeft: rtl ? big : -big,
        ArrowUp: vertical ? -big : big,
        ArrowDown: vertical ? big : -big,
        PageUp: 10,
        PageDown: -10,
      }
      if (event.key === "Home") set(0)
      else if (event.key === "End") set(100)
      else if (event.key in map) set(position.current + (map[event.key] as number))
      else return
      event.preventDefault()
    }

    const initial = clamp(value ?? defaultValue, 0, 100)
    const layer =
      "kg-image-compare__layer absolute inset-0 [&>img,&>picture,&>svg,&>video]:pointer-events-none [&>img,&>picture,&>svg,&>video]:block [&>img,&>picture,&>svg,&>video]:size-full [&>img,&>picture,&>svg,&>video]:object-cover [&>img,&>picture,&>svg,&>video]:[-webkit-user-drag:none]"

    return (
      <div
        ref={composed}
        className={cx(
          "kg-image-compare @container-[size] relative w-full cursor-ew-resize touch-pan-y overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface-sunken shadow-kg-sm select-none",
          vertical && "cursor-ns-resize touch-pan-x",
          className,
        )}
        data-orientation={orientation}
        style={{ "--_p": initial, aspectRatio, ...style } as CSSProperties}
        onPointerDown={(event) => {
          if (hover || event.button !== 0) return
          dragging.current = true
          event.currentTarget.setPointerCapture?.(event.pointerId)
          fromPointer(event)
          handle.current?.focus({ preventScroll: true })
        }}
        onPointerMove={(event) => {
          if (dragging.current || (hover && event.pointerType === "mouse")) fromPointer(event)
        }}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
        {...props}
      >
        <div className={layer} data-side="before">
          {before}
          {beforeLabel && <span className="kg-image-compare__tag absolute top-3 rounded-full border-2 border-kg-ink bg-kg-surface px-2 py-[0.1875rem] text-kg-xs font-semibold text-kg-fg start-3" data-side="before">{beforeLabel}</span>}
        </div>
        <div
          className={cx(
            layer,
            vertical
              ? "[clip-path:inset(calc(var(--_p)*1%)_0_0_0)]"
              : "[clip-path:inset(0_0_0_calc(var(--_p)*1%))] rtl:[clip-path:inset(0_calc(var(--_p)*1%)_0_0)]",
          )}
          data-side="after"
        >
          {after}
          {afterLabel && <span className={cx("kg-image-compare__tag absolute top-3 rounded-full border-2 border-kg-ink bg-kg-surface px-2 py-[0.1875rem] text-kg-xs font-semibold text-kg-fg end-3", vertical && "top-auto bottom-3")} data-side="after">{afterLabel}</span>}
        </div>
        <div
          ref={handle}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-orientation={orientation}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(initial)}
          aria-valuetext={`${Math.round(initial)}%`}
          className={cx(
            "kg-image-compare__handle absolute top-0 left-0 bg-kg-surface shadow-[0_0_0_1px_var(--kg-ink)] outline-none",
            vertical
              ? "right-0 -mt-px h-0.5 [translate:0_calc(var(--_p)*1cqh)]"
              : "bottom-0 -ml-px w-0.5 [translate:calc(var(--_p)*1cqw)_0] rtl:[translate:calc((var(--_p)*-1+100)*1cqw)_0]",
          )}
          onKeyDown={onKeyDown}
        >
          <span className={cx(
              "kg-image-compare__knob absolute top-1/2 left-1/2 grid size-9 -translate-1/2 place-items-center rounded-full border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-sm transition-[scale] duration-(--kg-duration-base) ease-kg-spring [&_svg]:size-4",
              "[.kg-image-compare:active_&]:scale-108 [:focus-visible>&]:outline-2 [:focus-visible>&]:outline-offset-2 [:focus-visible>&]:outline-kg-ring",
              vertical && "[&_svg]:rotate-90",
            )} aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path
                d="M6 4L2 8l4 4M10 4l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    )
  },
)
ImageCompare.displayName = "ImageCompare"
