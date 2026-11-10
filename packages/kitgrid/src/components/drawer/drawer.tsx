"use client"

import {
  type DialogHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useRef,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"
import {
  createModalClose,
  createModalTrigger,
  type ModalButtonProps,
  ModalCloseButton,
  ModalRoot,
  type ModalRootProps,
  useModalContext,
  useModalPart,
  useModalSurface,
} from "../dialog/modal.js"

export type DrawerSide = "left" | "right" | "top" | "bottom"
export type DrawerSize = "sm" | "md" | "lg" | "full"

export interface DrawerProps extends ModalRootProps {}

/** Owns the open state. Renders no element of its own. */
export const Drawer = (props: DrawerProps) => <ModalRoot {...props} />

Drawer.displayName = "Drawer"

export interface DrawerTriggerProps extends ModalButtonProps {}

export const DrawerTrigger = createModalTrigger("DrawerTrigger")

export interface DrawerCloseProps extends ModalButtonProps {}

export const DrawerClose = createModalClose("DrawerClose")

// Elements that keep their own pointer behaviour instead of starting a drag.
const NO_DRAG =
  "button, a, input, select, textarea, label, [contenteditable], [role='slider'], [data-kg-no-drag]"
const DISTANCE_THRESHOLD = 0.35
const VELOCITY_THRESHOLD = 0.5

/** Resistance past the open position: fast at first, approaching `size` asymptotically. */
const rubberBand = (distance: number, size: number): number =>
  size > 0 ? (1 - 1 / ((distance * 0.55) / size + 1)) * size : 0

interface DragState {
  pointerId: number
  start: number
  offset: number
  dragging: boolean
  samples: { time: number; position: number }[]
}

const useDragToDismiss = (
  ref: RefObject<HTMLDialogElement | null>,
  side: DrawerSide,
  enabled: boolean,
  onDismiss: () => void,
) => {
  const drag = useRef<DragState | null>(null)
  const horizontal = side === "left" || side === "right"
  const direction = side === "right" || side === "bottom" ? 1 : -1

  const apply = (node: HTMLElement, offset: number, size: number) => {
    const shift = offset * direction
    node.style.translate = horizontal ? `${shift}px 0` : `0 ${shift}px`
    node.style.setProperty(
      "--_fade",
      String(1 - (size > 0 ? clamp(offset / size, 0, 1) : 0)),
    )
  }

  const reset = (node: HTMLElement) => {
    node.style.removeProperty("translate")
    node.style.removeProperty("--_fade")
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDialogElement>) => {
    if (!enabled || event.button !== 0 || !event.isPrimary) return
    const target = event.target as HTMLElement
    if (target.closest(NO_DRAG)) return
    // On vertical sheets a scrollable body owns vertical gestures, so drags start elsewhere.
    const scroller = target.closest<HTMLElement>(".kg-drawer__body")
    if (!horizontal && scroller && scroller.scrollHeight > scroller.clientHeight) return
    drag.current = {
      pointerId: event.pointerId,
      start: horizontal ? event.clientX : event.clientY,
      offset: 0,
      dragging: false,
      samples: [],
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDialogElement>) => {
    const state = drag.current
    const node = ref.current
    if (!state || !node || state.pointerId !== event.pointerId) return
    const position = horizontal ? event.clientX : event.clientY
    const delta = (position - state.start) * direction
    if (!state.dragging) {
      if (Math.abs(delta) < 4) return
      state.dragging = true
      node.setPointerCapture?.(event.pointerId)
      node.dataset.dragging = ""
    }
    const size = horizontal ? node.offsetWidth : node.offsetHeight
    state.offset = delta >= 0 ? delta : -rubberBand(-delta, size)
    state.samples.push({ time: event.timeStamp, position: delta })
    while (
      state.samples.length > 2 &&
      event.timeStamp - (state.samples[0]?.time ?? 0) > 100
    ) {
      state.samples.shift()
    }
    apply(node, state.offset, size)
  }

  const finish = (event: ReactPointerEvent<HTMLDialogElement>, cancelled: boolean) => {
    const state = drag.current
    const node = ref.current
    if (!state || !node || state.pointerId !== event.pointerId) return
    drag.current = null
    if (!state.dragging) return
    delete node.dataset.dragging
    node.releasePointerCapture?.(event.pointerId)

    const size = horizontal ? node.offsetWidth : node.offsetHeight
    const first = state.samples[0]
    const last = state.samples.at(-1)
    const elapsed = first && last ? last.time - first.time : 0
    const velocity =
      first && last && elapsed > 0 ? (last.position - first.position) / elapsed : 0
    const flung = velocity > VELOCITY_THRESHOLD && state.offset > 0
    // The inline translate stays while closing, so the exit animation continues from the finger.
    if (!cancelled && (state.offset > size * DISTANCE_THRESHOLD || flung)) onDismiss()
    else reset(node)
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: ReactPointerEvent<HTMLDialogElement>) => finish(event, false),
    onPointerCancel: (event: ReactPointerEvent<HTMLDialogElement>) =>
      finish(event, true),
  }
}

/* Paper Layers: a solid sheet edged in ink on its inner side, sliding in from a screen edge. */
const drawerClass = [
  "kg-drawer fixed m-0 overflow-visible p-0 text-kg-fg bg-kg-surface border-solid border-kg-ink shadow-kg-lg outline-none open:flex open:flex-col",
  "transition-[translate,scale,filter] duration-(--kg-duration-slow) ease-kg-out",
  // The surface continues past the screen edge, so overshoot and rubber-banding never show a gap.
  "after:pointer-events-none after:absolute after:bg-inherit",
  "data-dragging:transition-none data-dragging:cursor-grabbing data-dragging:select-none",
  "data-[state=open]:animate-[kg-drawer-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-drawer-out_var(--kg-duration-base)_var(--kg-ease-in)_forwards]",
  "backdrop:bg-kg-overlay backdrop:opacity-(--_fade,1) backdrop:animate-[kg-fade-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "data-[state=closed]:backdrop:animate-[kg-fade-out_var(--kg-duration-base)_var(--kg-ease-in)_forwards]",
]

const sideClass: Record<DrawerSide, string> = {
  right: "inset-[0_0_0_auto] [border-width:0_0_0_2px] [--_hide:translateX(100%)] after:left-full",
  left: "inset-[0_auto_0_0] [border-width:0_2px_0_0] [--_hide:translateX(-100%)] after:right-full",
  bottom: "inset-[auto_0_0_0] [border-width:2px_0_0_0] [--_hide:translateY(100%)] after:top-full",
  top: "inset-[0_0_auto_0] [border-width:0_0_2px_0] [--_hide:translateY(-100%)] after:bottom-full",
}

const axisClass = {
  x: "h-full max-h-full max-w-full touch-pan-y after:inset-y-0 after:w-full",
  y: "w-full max-w-full touch-none after:inset-x-0 after:h-full",
}

/* Set --_drawer-size on the panel to replace the preset width (left/right) or maximum height (top/bottom). */
const sizeClass: Record<"x" | "y", Record<DrawerSize, string>> = {
  x: {
    sm: "w-[min(var(--_drawer-size,20rem),100%)]",
    md: "w-[min(var(--_drawer-size,24rem),100%)]",
    lg: "w-[min(var(--_drawer-size,32rem),100%)]",
    full: "w-[min(var(--_drawer-size,100%),100%)]",
  },
  y: {
    sm: "h-auto max-h-(--_drawer-size,40dvh)",
    md: "h-auto max-h-(--_drawer-size,60dvh)",
    lg: "h-auto max-h-(--_drawer-size,85dvh)",
    full: "h-dvh max-h-dvh",
  },
}

const handleClass =
  "kg-drawer__handle mx-auto h-[0.3125rem] w-11 shrink-0 cursor-grab rounded-full bg-kg-border-strong transition-[background-color,scale] duration-(--kg-duration-fast) ease-kg-out hover:scale-x-[1.12] hover:bg-kg-fg-muted"

export interface DrawerContentProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  "open"
> {
  side?: DrawerSide
  /** Width for left/right drawers, maximum height for top/bottom sheets. */
  size?: DrawerSize
  /** Close on a backdrop click or a drag toward the closing edge. Escape always closes. */
  dismissible?: boolean
  /** Show a grab handle. Defaults to true for top and bottom sheets. */
  handle?: boolean
  initialFocus?: RefObject<HTMLElement | null>
  finalFocus?: RefObject<HTMLElement | null>
  closeButton?: boolean
  closeLabel?: string
}

export const DrawerContent = forwardRef<HTMLDialogElement, DrawerContentProps>(
  (
    {
      side = "right",
      size = "md",
      dismissible = true,
      handle,
      initialFocus,
      finalFocus,
      closeButton = true,
      closeLabel = "Close",
      onCancel,
      onClose,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClick,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
      className,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const context = useModalContext("DrawerContent")
    const surface = useModalSurface(context, {
      dismissible,
      initialFocus,
      finalFocus,
      onCancel,
      onClose,
      onPointerDown,
      onClick,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
    })
    const drag = useDragToDismiss(surface.ref, side, dismissible && context.open, () =>
      context.setOpen(false),
    )
    const ref = useComposedRefs(surface.ref, forwardedRef)
    if (!surface.present) return null

    const showHandle = handle ?? (side === "top" || side === "bottom")
    const grip = showHandle && (
      <div
        className={cx(handleClass, side === "top" ? "-mt-1 mb-3" : "mt-3 -mb-1")}
        aria-hidden="true"
      />
    )
    const axis = side === "left" || side === "right" ? "x" : "y"
    const radius =
      size === "full" ? "" : side === "bottom" ? "rounded-t-kg-2xl" : side === "top" ? "rounded-b-kg-2xl" : ""

    return (
      <dialog
        ref={ref}
        className={cx(
          drawerClass,
          sideClass[side],
          axisClass[axis],
          sizeClass[axis][size],
          radius,
          className,
        )}
        data-side={side}
        data-size={size}
        data-state={surface.state}
        {...props}
        {...surface.props}
        onPointerDown={(event) => {
          surface.props.onPointerDown?.(event)
          drag.onPointerDown(event)
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event)
          drag.onPointerMove(event)
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event)
          drag.onPointerUp(event)
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event)
          drag.onPointerCancel(event)
        }}
      >
        {side !== "top" && grip}
        {children}
        {side === "top" && grip}
        {closeButton && (
          <div className="absolute end-3.5 top-3.5 z-1">
            <ModalCloseButton label={closeLabel} className="kg-drawer__close" />
          </div>
        )}
      </dialog>
    )
  },
)

DrawerContent.displayName = "DrawerContent"

export interface DrawerHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const DrawerHeader = forwardRef<HTMLDivElement, DrawerHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx(
        "kg-drawer__header grid shrink-0 gap-1 border-b-2 border-kg-ink py-5 ps-6 pe-14",
        className,
      )} {...props} />
  ),
)

DrawerHeader.displayName = "DrawerHeader"

export interface DrawerTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const DrawerTitle = forwardRef<HTMLHeadingElement, DrawerTitleProps>(
  ({ className, ...props }, ref) => {
    const context = useModalContext("DrawerTitle")
    useModalPart(context.setHasTitle)
    return (
      <h2
        ref={ref}
        className={cx(
          "kg-drawer__title m-0 text-kg-lg leading-[1.3] font-semibold tracking-[-0.015em] text-kg-fg",
          className,
        )}
        {...props}
        id={context.titleId}
      />
    )
  },
)

DrawerTitle.displayName = "DrawerTitle"

export interface DrawerDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const DrawerDescription = forwardRef<
  HTMLParagraphElement,
  DrawerDescriptionProps
>(({ className, ...props }, ref) => {
  const context = useModalContext("DrawerDescription")
  useModalPart(context.setHasDescription)
  return (
    <p
      ref={ref}
      className={cx(
        "kg-drawer__description m-0 text-kg-sm leading-normal text-kg-fg-muted",
        className,
      )}
      {...props}
      id={context.descriptionId}
    />
  )
})

DrawerDescription.displayName = "DrawerDescription"

export interface DrawerBodyProps extends HTMLAttributes<HTMLDivElement> {}

/** The only scrolling region; header and footer stay pinned around it. */
export const DrawerBody = forwardRef<HTMLDivElement, DrawerBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cx(
        "kg-drawer__body min-h-0 flex-[1_1_auto] touch-pan-y overflow-y-auto overscroll-contain px-6 py-5 text-kg-base leading-[1.55]",
        className,
      )}
      {...props}
    />
  ),
)

DrawerBody.displayName = "DrawerBody"

export interface DrawerFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Wrap the footer's children and stretch them to share the row. */
  stretch?: boolean
}

export const DrawerFooter = forwardRef<HTMLDivElement, DrawerFooterProps>(
  ({ stretch = true, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cx(
        "kg-drawer__footer mt-auto flex shrink-0 gap-2 border-t-2 border-kg-ink bg-kg-surface px-6 pt-4 pb-[max(calc(var(--kg-space)*4),env(safe-area-inset-bottom))]",
        stretch && "flex-wrap *:flex-[1_1_auto]",
        className,
      )}
      {...props}
    />
  ),
)

DrawerFooter.displayName = "DrawerFooter"
