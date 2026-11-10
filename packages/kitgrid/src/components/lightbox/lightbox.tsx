"use client"

import {
  type DialogHTMLAttributes,
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  type WheelEvent as ReactWheelEvent,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"
import { ModalRoot, useModalContext, useModalSurface } from "../dialog/modal.js"

/* The viewer lays the image on the paper ground as one lifted sheet; controls are paper chips. */
const dialogClass = [
  "kg-lightbox fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden overscroll-contain p-0",
  "text-kg-fg bg-kg-bg border-0 outline-none open:grid open:grid-rows-[auto_1fr_auto] backdrop:bg-transparent",
  "data-[state=open]:animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-fade-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
]

const chipClass = [
  "grid place-items-center p-0 text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-full shadow-kg-xs cursor-pointer",
  "transition-[background-color,scale] duration-(--kg-duration-base) ease-kg-out interactive:hover:bg-kg-paper-sage interactive:active:scale-[0.92]",
  "disabled:cursor-default disabled:opacity-35 [&_svg]:size-[1.125rem]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

const imageClass = [
  "kg-lightbox__image max-h-full max-w-full object-contain origin-center will-change-transform",
  "bg-kg-surface-sunken border-2 border-kg-ink rounded-kg-lg shadow-kg-lg transition-transform duration-(--kg-duration-slow) ease-kg-out",
].join(" ")

const placeholderClass = [
  "aspect-[4/3] w-[min(100%,60rem)] animate-[kg-pulse_1.8s_var(--kg-ease-in-out)_infinite]",
  "motion-reduce:[animation-duration:3.6s] [[data-kg-motion=reduce]_&]:[animation-duration:3.6s]",
].join(" ")

const thumbClass = [
  "kg-lightbox__thumb h-[2.5rem] w-[3.5rem] shrink-0 overflow-hidden p-0 bg-kg-surface-sunken border-2 border-kg-ink rounded-kg-sm cursor-pointer opacity-60",
  "transition-[opacity,translate] duration-(--kg-duration-base) ease-kg-out hover:opacity-85 aria-[current=true]:hover:opacity-100",
  "aria-[current=true]:-translate-y-[2px] aria-[current=true]:opacity-100 aria-[current=true]:shadow-kg-xs",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  "[&_img]:size-full [&_img]:object-cover",
].join(" ")

export interface LightboxImage {
  /** Omit to show a neutral skeleton surface in place of the picture. */
  src?: string
  alt: string
  caption?: ReactNode
  /** Smaller source for the filmstrip. Falls back to `src`. */
  thumbnail?: string
}

export interface LightboxProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open" | "onChange"> {
  images: LightboxImage[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  /** Wrap from the last image to the first. */
  loop?: boolean
  /** Show the filmstrip of thumbnails. */
  thumbnails?: boolean
  maxZoom?: number
  /** Accessible name of the viewer. */
  label?: string
}

const MIN = 1
const STEP = 1.6

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

interface View {
  x: number
  y: number
  scale: number
}

/**
 * A full-screen image viewer on the native <dialog>: wheel, double-click and keyboard zoom
 * around the pointer, drag to pan while zoomed, swipe or arrow keys between images.
 */
export const Lightbox = forwardRef<HTMLDialogElement, LightboxProps>(
  ({ open, defaultOpen = false, onOpenChange, ...props }, ref) => (
    <ModalRoot open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <LightboxSurface ref={ref} {...props} />
    </ModalRoot>
  ),
)

Lightbox.displayName = "Lightbox"

type SurfaceProps = Omit<LightboxProps, "open" | "defaultOpen" | "onOpenChange">

const LightboxSurface = forwardRef<HTMLDialogElement, SurfaceProps>(
  (
    {
      images,
      index: indexProp,
      defaultIndex = 0,
      onIndexChange,
      loop = true,
      thumbnails = true,
      maxZoom = 4,
      label = "Image viewer",
      className,
      onKeyDown,
      ...props
    },
    forwardedRef,
  ) => {
    const context = useModalContext("Lightbox")
    const surface = useModalSurface(context, { dismissible: true })
    const ref = useComposedRefs(surface.ref, forwardedRef)
    const [index, setIndex] = useControllableState({
      value: indexProp,
      defaultValue: defaultIndex,
      onChange: onIndexChange,
    })
    const count = images.length
    const image = images[clamp(index, 0, Math.max(0, count - 1))]
    const stage = useRef<HTMLDivElement>(null)
    const picture = useRef<HTMLElement>(null)
    const view = useRef<View>({ x: 0, y: 0, scale: 1 })
    const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(
      null,
    )

    const apply = (animate: boolean) => {
      const node = picture.current
      const holder = stage.current
      if (!node || !holder) return
      const { x, y, scale } = view.current
      node.style.transition = animate ? "" : "none"
      node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
      holder.dataset.zoomed = scale > 1 ? "true" : "false"
    }

    const bound = (next: View): View => {
      const node = picture.current
      if (!node || next.scale <= 1) return { x: 0, y: 0, scale: Math.max(MIN, next.scale) }
      const limitX = ((next.scale - 1) * node.offsetWidth) / 2
      const limitY = ((next.scale - 1) * node.offsetHeight) / 2
      return {
        scale: next.scale,
        x: clamp(next.x, -limitX, limitX),
        y: clamp(next.y, -limitY, limitY),
      }
    }

    /** Zooms to `scale` keeping the image point under (cx, cy) in place. */
    const zoomTo = (scale: number, cx?: number, cy?: number) => {
      const holder = stage.current
      const current = view.current
      const target = clamp(scale, MIN, maxZoom)
      if (!holder) return
      const rect = holder.getBoundingClientRect()
      const px = (cx ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2)
      const py = (cy ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2)
      const ratio = target / current.scale
      view.current = bound({
        scale: target,
        x: px - ratio * (px - current.x),
        y: py - ratio * (py - current.y),
      })
      apply(true)
    }

    const go = (step: number) => {
      if (count < 2) return
      const next = index + step
      if (!loop && (next < 0 || next >= count)) return
      setIndex((next + count) % count)
    }

    useEffect(() => {
      view.current = { x: 0, y: 0, scale: 1 }
      apply(false)
    }, [index, surface.present])

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const keys: Record<string, () => void> = {
        ArrowRight: () => go(1),
        ArrowLeft: () => go(-1),
        Home: () => setIndex(0),
        End: () => setIndex(count - 1),
        "+": () => zoomTo(view.current.scale * STEP),
        "=": () => zoomTo(view.current.scale * STEP),
        "-": () => zoomTo(view.current.scale / STEP),
        "0": () => zoomTo(1),
      }
      const action = keys[event.key]
      if (!action) return
      event.preventDefault()
      action()
    }

    const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
      const factor = Math.exp(-event.deltaY * 0.0022)
      zoomTo(view.current.scale * factor, event.clientX, event.clientY)
    }

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        ox: view.current.x,
        oy: view.current.y,
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = drag.current
      if (!state || state.id !== event.pointerId) return
      const dx = event.clientX - state.x
      const dy = event.clientY - state.y
      if (view.current.scale > 1) {
        view.current = bound({ scale: view.current.scale, x: state.ox + dx, y: state.oy + dy })
      } else {
        // Unzoomed drags preview the swipe, following the finger horizontally.
        view.current = { scale: 1, x: dx * 0.6, y: 0 }
      }
      apply(false)
    }

    const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = drag.current
      if (!state || state.id !== event.pointerId) return
      drag.current = null
      const dx = event.clientX - state.x
      if (view.current.scale <= 1) {
        view.current = { x: 0, y: 0, scale: 1 }
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
        else apply(true)
      }
    }

    if (!surface.present || !image) return null

    const toolButton = (name: string, icon: string, onClick: () => void, disabled = false) => (
      <button
        type="button"
        className={`kg-lightbox__tool size-[2.5rem] ${chipClass}`}
        aria-label={name}
        onClick={onClick}
        disabled={disabled}
      >
        <Icon d={icon} />
      </button>
    )

    return (
      <dialog
        ref={ref}
        aria-label={label}
        className={cx(dialogClass, className)}
        data-state={surface.state}
        {...props}
        {...surface.props}
        aria-labelledby={undefined}
        onKeyDown={handleKeyDown}
      >
        <div className="kg-lightbox__bar flex items-center justify-between px-4 py-3">
          <span className="kg-lightbox__count text-kg-sm tabular-nums text-kg-fg-muted" aria-hidden="true">
            {index + 1} / {count}
          </span>
          <div className="kg-lightbox__tools flex gap-1">
            {toolButton("Zoom out", "M5 12h14", () => zoomTo(view.current.scale / STEP))}
            {toolButton("Zoom in", "M12 5v14M5 12h14", () =>
              zoomTo(view.current.scale * STEP),
            )}
            {toolButton("Close", "M18 6 6 18M6 6l12 12", () => context.setOpen(false))}
          </div>
        </div>

        <div
          ref={stage}
          className="kg-lightbox__stage grid min-h-0 cursor-zoom-in touch-none place-items-center overflow-hidden px-18 select-none data-[zoomed=true]:cursor-grab data-[zoomed=true]:active:cursor-grabbing max-[40rem]:px-2"
          data-zoomed="false"
          onWheel={onWheel}
          onDoubleClick={(event) =>
            zoomTo(view.current.scale > 1 ? 1 : 2.5, event.clientX, event.clientY)
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {image.src ? (
            <img
              key={`${index}-${image.src}`}
              ref={picture as RefObject<HTMLImageElement>}
              src={image.src}
              alt={image.alt}
              className={cx(
                imageClass,
                surface.state === "open" &&
                  "animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
              )}
              draggable={false}
            />
          ) : (
            <div
              key={index}
              ref={picture as RefObject<HTMLDivElement>}
              role="img"
              aria-label={image.alt}
              className={cx(imageClass, placeholderClass)}
              data-placeholder=""
            />
          )}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              className={`kg-lightbox__nav absolute top-1/2 size-[3rem] -translate-y-1/2 data-[dir=next]:right-4 data-[dir=prev]:left-4 max-[40rem]:hidden ${chipClass}`}
              data-dir="prev"
              aria-label="Previous image"
              disabled={!loop && index === 0}
              onClick={() => go(-1)}
            >
              <Icon d="m15 18-6-6 6-6" />
            </button>
            <button
              type="button"
              className={`kg-lightbox__nav absolute top-1/2 size-[3rem] -translate-y-1/2 data-[dir=next]:right-4 data-[dir=prev]:left-4 max-[40rem]:hidden ${chipClass}`}
              data-dir="next"
              aria-label="Next image"
              disabled={!loop && index === count - 1}
              onClick={() => go(1)}
            >
              <Icon d="m9 18 6-6-6-6" />
            </button>
          </>
        )}

        <div className="kg-lightbox__foot grid justify-items-center gap-3 px-4 pt-3 pb-5">
          {image.caption != null && <p className="kg-lightbox__caption m-0 text-kg-sm text-kg-fg">{image.caption}</p>}
          {thumbnails && count > 1 && (
            <div className="kg-lightbox__strip flex max-w-full gap-2 overflow-x-auto p-[4px] [scrollbar-width:none]">
              {images.map((item, position) => (
                <button
                  key={position}
                  type="button"
                  className={thumbClass}
                  aria-label={`Show image ${position + 1}: ${item.alt}`}
                  aria-current={position === index || undefined}
                  onClick={() => setIndex(position)}
                >
                  {item.thumbnail ?? item.src ? (
                    <img src={item.thumbnail ?? item.src} alt="" draggable={false} />
                  ) : (
                    <span className="kg-lightbox__thumb-placeholder block size-full bg-kg-muted" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="kg-lightbox__live sr-only" aria-live="polite">
          {`Image ${index + 1} of ${count}: ${image.alt}`}
        </p>
      </dialog>
    )
  },
)

LightboxSurface.displayName = "LightboxSurface"
