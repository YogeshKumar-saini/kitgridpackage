"use client"

import {
  type CSSProperties,
  type DialogHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useMemo,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import {
  createModalClose,
  createModalTrigger,
  type ModalButtonProps,
  ModalRoot,
  type ModalRootProps,
  useModalContext,
  useModalPart,
  useModalSurface,
} from "../dialog/modal.js"
import { getTabbable } from "../dialog/focus.js"

export interface BottomSheetProps extends ModalRootProps {}

/** Owns the open state. Renders no element of its own. */
export const BottomSheet = (props: BottomSheetProps) => <ModalRoot {...props} />

BottomSheet.displayName = "BottomSheet"

export interface BottomSheetTriggerProps extends ModalButtonProps {}
export const BottomSheetTrigger = createModalTrigger("BottomSheetTrigger")

export interface BottomSheetCloseProps extends ModalButtonProps {}
export const BottomSheetClose = createModalClose("BottomSheetClose")

export interface BottomSheetContentProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open"> {
  /** Resting heights as fractions of the viewport, ascending. */
  snapPoints?: number[]
  /** Index into `snapPoints`. */
  snap?: number
  defaultSnap?: number
  onSnapChange?: (index: number) => void
  /** Allow closing by dragging below the lowest point or clicking the backdrop. */
  dismissible?: boolean
  /** Accessible name of the drag handle. */
  handleLabel?: string
}

/* Resting position: the sheet is max-tall and slides down to show only the snap height. */
const sheetClass = [
  "kg-bottom-sheet group/sheet fixed inset-x-0 bottom-0 top-auto mx-auto my-0 h-[calc(var(--_max)*100dvh)] w-[min(40rem,100%)] max-h-none max-w-none p-0",
  "overflow-hidden text-kg-fg bg-kg-surface border-2 border-b-0 border-kg-ink rounded-t-kg-2xl shadow-kg-lg outline-none touch-none",
  "[translate:0_var(--_rest)] transition-[translate] duration-(--kg-duration-slow) ease-kg-out open:flex open:flex-col",
  "data-dragging:transition-none data-dragging:select-none",
  "data-[state=open]:animate-[kg-bottom-sheet-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-bottom-sheet-out_var(--kg-duration-base)_var(--kg-ease-in)_forwards]",
  "backdrop:bg-kg-overlay backdrop:animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:backdrop:animate-[kg-fade-out_var(--kg-duration-base)_var(--kg-ease-in)_forwards]",
]

const handleClass = [
  "kg-bottom-sheet__handle group/handle mx-auto grid h-[1.75rem] w-[4rem] shrink-0 place-items-center p-0 bg-transparent border-0 rounded-full cursor-grab",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
]

const NO_DRAG = "button:not(.kg-bottom-sheet__handle), a, input, select, textarea, label, [contenteditable]"

/**
 * A bottom sheet that rests at snap points. Drag the handle or header with velocity-aware
 * snapping; the handle is a button, so keyboard users step between points with arrows.
 */
export const BottomSheetContent = forwardRef<HTMLDialogElement, BottomSheetContentProps>(
  (
    {
      snapPoints = [0.45, 0.92],
      snap: snapProp,
      defaultSnap = 0,
      onSnapChange,
      dismissible = true,
      handleLabel = "Resize sheet",
      onCancel,
      onClose,
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const context = useModalContext("BottomSheetContent")
    const node = useRef<HTMLDialogElement | null>(null)
    // The handle is first in DOM order but a poor landing spot, so focus skips past it.
    const initialFocus = useMemo<RefObject<HTMLElement | null>>(
      () => ({
        get current() {
          return node.current
            ? (getTabbable(node.current).find(
                (element) => !element.classList.contains("kg-bottom-sheet__handle"),
              ) ?? null)
            : null
        },
      }),
      [],
    )
    const surface = useModalSurface(context, { dismissible, initialFocus, onCancel, onClose })
    const ref = useComposedRefs(surface.ref, node, forwardedRef)
    const points = snapPoints.length > 0 ? snapPoints : [0.5]
    const [snap, setSnap] = useControllableState({
      value: snapProp,
      defaultValue: defaultSnap,
      onChange: onSnapChange,
    })
    const index = Math.min(Math.max(snap, 0), points.length - 1)
    const max = points.at(-1) ?? 1
    const current = points[index] ?? max
    const drag = useRef<{
      id: number
      start: number
      samples: { t: number; y: number }[]
      moved: boolean
    } | null>(null)

    const onPointerDown = (event: ReactPointerEvent<HTMLDialogElement>) => {
      const target = event.target as HTMLElement
      if (event.button !== 0 || target.closest(NO_DRAG)) return
      const body = target.closest<HTMLElement>(".kg-bottom-sheet__body")
      if (body && body.scrollHeight > body.clientHeight && body.scrollTop > 0) return
      drag.current = { id: event.pointerId, start: event.clientY, samples: [], moved: false }
    }

    const onPointerMove = (event: ReactPointerEvent<HTMLDialogElement>) => {
      const state = drag.current
      const node = surface.ref.current
      if (!state || !node || state.id !== event.pointerId) return
      const dy = event.clientY - state.start
      if (!state.moved) {
        if (Math.abs(dy) < 4) return
        state.moved = true
        node.setPointerCapture?.(event.pointerId)
        node.dataset.dragging = ""
      }
      const height = window.innerHeight
      const base = (max - current) * height
      // Rubber band above the tallest point.
      const offset = base + dy < 0 ? -Math.sqrt(-(base + dy)) * 4 : base + dy
      node.style.translate = `0 ${offset}px`
      state.samples.push({ t: event.timeStamp, y: event.clientY })
      if (state.samples.length > 5) state.samples.shift()
    }

    const finish = (event: ReactPointerEvent<HTMLDialogElement>) => {
      const state = drag.current
      const node = surface.ref.current
      if (!state || !node || state.id !== event.pointerId) return
      drag.current = null
      if (!state.moved) return
      delete node.dataset.dragging
      node.style.removeProperty("translate")
      const height = window.innerHeight
      const first = state.samples[0]
      const last = state.samples.at(-1)
      const velocity =
        first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0
      // Project 120ms ahead so a flick carries to the next point.
      const visible = current * height - (event.clientY - state.start) - velocity * 120
      const lowest = (points[0] ?? 0) * height
      if (dismissible && visible < lowest * 0.55) {
        context.setOpen(false)
        return
      }
      let nearest = 0
      for (let i = 1; i < points.length; i++) {
        const point = points[i] ?? 0
        const best = points[nearest] ?? 0
        if (Math.abs(point * height - visible) < Math.abs(best * height - visible)) nearest = i
      }
      setSnap(nearest)
    }

    if (!surface.present) return null

    return (
      <dialog
        ref={ref}
        className={cx(sheetClass, className)}
        data-state={surface.state}
        data-snap={index}
        style={
          {
            "--_max": max,
            "--_snap": current,
            "--_rest": `${(max - current) * 100}dvh`,
            ...style,
          } as CSSProperties
        }
        {...props}
        {...surface.props}
        onPointerDown={(event) => {
          surface.props.onPointerDown?.(event)
          onPointerDown(event)
        }}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        <button
          type="button"
          className={cx(handleClass)}
          aria-label={handleLabel}
          onClick={() => setSnap((index + 1) % points.length)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault()
              setSnap(Math.min(points.length - 1, index + 1))
            } else if (event.key === "ArrowDown") {
              event.preventDefault()
              setSnap(Math.max(0, index - 1))
            }
          }}
        >
          <span
            className="h-[4px] w-[2.25rem] rounded-full bg-kg-border-strong transition-[background-color,scale] duration-(--kg-duration-base) ease-kg-out group-hover/handle:scale-x-115 group-hover/handle:bg-kg-fg-faint group-data-dragging/sheet:scale-x-115 group-data-dragging/sheet:bg-kg-fg-faint"
            aria-hidden="true"
          />
        </button>
        {children}
      </dialog>
    )
  },
)

BottomSheetContent.displayName = "BottomSheetContent"

export interface BottomSheetHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const BottomSheetHeader = forwardRef<HTMLDivElement, BottomSheetHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx("kg-bottom-sheet__header grid shrink-0 gap-1 px-5 pb-3", className)} {...props} />
  ),
)

BottomSheetHeader.displayName = "BottomSheetHeader"

export interface BottomSheetTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const BottomSheetTitle = forwardRef<HTMLHeadingElement, BottomSheetTitleProps>(
  ({ className, ...props }, ref) => {
    const context = useModalContext("BottomSheetTitle")
    useModalPart(context.setHasTitle)
    return (
      <h2
        ref={ref}
        className={cx("kg-bottom-sheet__title m-0 text-kg-lg font-semibold tracking-[-0.01em]", className)}
        {...props}
        id={context.titleId}
      />
    )
  },
)

BottomSheetTitle.displayName = "BottomSheetTitle"

export interface BottomSheetDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const BottomSheetDescription = forwardRef<
  HTMLParagraphElement,
  BottomSheetDescriptionProps
>(({ className, ...props }, ref) => {
  const context = useModalContext("BottomSheetDescription")
  useModalPart(context.setHasDescription)
  return (
    <p
      ref={ref}
      className={cx("kg-bottom-sheet__description m-0 text-kg-sm text-kg-fg-muted", className)}
      {...props}
      id={context.descriptionId}
    />
  )
})

BottomSheetDescription.displayName = "BottomSheetDescription"

export interface BottomSheetBodyProps extends HTMLAttributes<HTMLDivElement> {}

export const BottomSheetBody = forwardRef<HTMLDivElement, BottomSheetBodyProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx("kg-bottom-sheet__body min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-6 [[data-snap='0']>&]:overflow-y-hidden", className)} {...props} />
  ),
)

BottomSheetBody.displayName = "BottomSheetBody"
