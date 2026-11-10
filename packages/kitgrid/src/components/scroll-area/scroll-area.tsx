"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

export type ScrollAreaType = "hover" | "scroll" | "always"
export type ScrollAreaOrientation = "vertical" | "horizontal" | "both"

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  /** `hover` shows bars while hovered, `scroll` only while scrolling, `always` keeps them. */
  type?: ScrollAreaType
  orientation?: ScrollAreaOrientation
  /** Ref to the scrolling element, for scroll restoration or programmatic scrolling. */
  viewportRef?: RefObject<HTMLDivElement | null>
}

type Axis = "y" | "x"

const MIN_THUMB = 20

const viewportClass = [
  "kg-scroll-area__viewport size-full max-h-[inherit] overflow-auto overscroll-contain rounded-[inherit]",
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
]

/* Bars fade in while the root is scrolled, dragged or (for type="hover") hovered or focused. */
const barClass = [
  "kg-scroll-area__bar absolute z-1 flex p-[2px] touch-none select-none data-[hidden=true]:hidden",
  "transition-opacity duration-(--kg-duration-slow) ease-kg-out",
  "group-data-scrolling/scroll:opacity-100 group-data-scrolling/scroll:duration-(--kg-duration-fast)",
  "group-data-dragging/scroll:opacity-100 group-data-dragging/scroll:duration-(--kg-duration-fast)",
]

const hoverBarClass =
  "group-hover/scroll:opacity-100 group-hover/scroll:duration-(--kg-duration-fast) group-focus-within/scroll:opacity-100 group-focus-within/scroll:duration-(--kg-duration-fast)"

const thumbClass =
  "kg-scroll-area__thumb shrink-0 rounded-full bg-kg-fg/30 transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-ink group-data-dragging/scroll:bg-kg-ink"

/**
 * Native scrolling with slim, themeable overlay scrollbars. The viewport keeps wheel, touch,
 * keyboard and find-in-page behaviour; only the visual bar is replaced, so it is aria-hidden.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      type = "hover",
      orientation = "vertical",
      viewportRef,
      className,
      children,
      tabIndex,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const viewport = useRef<HTMLDivElement | null>(null)
    const composedViewport = useComposedRefs(viewport, viewportRef)
    const root = useRef<HTMLDivElement>(null)
    const composedRoot = useComposedRefs(root, ref)
    const bars = {
      y: useRef<HTMLDivElement>(null),
      x: useRef<HTMLDivElement>(null),
    }
    const thumbs = {
      y: useRef<HTMLDivElement>(null),
      x: useRef<HTMLDivElement>(null),
    }
    const [scrollable, setScrollable] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const showY = orientation !== "horizontal"
    const showX = orientation !== "vertical"
    const both = orientation === "both"
    const bar = cx(
      barClass,
      type === "always" ? "opacity-100" : "opacity-0",
      type === "hover" && hoverBarClass,
    )

    const measure = () => {
      const node = viewport.current
      if (!node) return
      let any = false
      for (const axis of ["y", "x"] as Axis[]) {
        const bar = bars[axis].current
        const thumb = thumbs[axis].current
        if (!bar || !thumb) continue
        const view = axis === "y" ? node.clientHeight : node.clientWidth
        const total = axis === "y" ? node.scrollHeight : node.scrollWidth
        const offset = axis === "y" ? node.scrollTop : node.scrollLeft
        const track = axis === "y" ? bar.clientHeight : bar.clientWidth
        const overflow = total - view > 1
        bar.dataset.hidden = overflow ? "false" : "true"
        if (!overflow) continue
        any = true
        const size = Math.max(MIN_THUMB, (view / total) * track)
        const position = ((track - size) * offset) / (total - view)
        if (axis === "y") {
          thumb.style.height = `${size}px`
          thumb.style.transform = `translate3d(0, ${position}px, 0)`
        } else {
          thumb.style.width = `${size}px`
          thumb.style.transform = `translate3d(${position}px, 0, 0)`
        }
      }
      setScrollable((current) => (current === any ? current : any))
    }

    useIsomorphicLayoutEffect(() => {
      measure()
      const node = viewport.current
      if (!node) return
      const observer = new ResizeObserver(measure)
      observer.observe(node)
      if (node.firstElementChild) observer.observe(node.firstElementChild)
      return () => observer.disconnect()
    }, [orientation])

    useEffect(() => () => clearTimeout(timer.current), [])

    const onScroll = () => {
      measure()
      const node = root.current
      if (!node) return
      node.dataset.scrolling = ""
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        delete node.dataset.scrolling
      }, 700)
    }

    const startDrag = (axis: Axis) => (event: ReactPointerEvent<HTMLDivElement>) => {
      const node = viewport.current
      const bar = bars[axis].current
      const thumb = thumbs[axis].current
      if (!node || !bar || !thumb || event.button !== 0) return
      event.preventDefault()
      const onThumb = event.target === thumb
      const total = axis === "y" ? node.scrollHeight : node.scrollWidth
      const view = axis === "y" ? node.clientHeight : node.clientWidth
      const track = axis === "y" ? bar.clientHeight : bar.clientWidth
      const size = axis === "y" ? thumb.offsetHeight : thumb.offsetWidth
      const ratio = (total - view) / Math.max(1, track - size)

      if (!onThumb) {
        // A track press pages toward the pointer, as native scrollbars do.
        const rect = bar.getBoundingClientRect()
        const point = axis === "y" ? event.clientY - rect.top : event.clientX - rect.left
        const target = clamp((point - size / 2) * ratio, 0, total - view)
        if (axis === "y") node.scrollTop = target
        else node.scrollLeft = target
        return
      }

      const start = axis === "y" ? event.clientY : event.clientX
      const origin = axis === "y" ? node.scrollTop : node.scrollLeft
      thumb.setPointerCapture?.(event.pointerId)
      root.current?.setAttribute("data-dragging", "")
      const move = (next: PointerEvent) => {
        const delta = (axis === "y" ? next.clientY : next.clientX) - start
        if (axis === "y") node.scrollTop = origin + delta * ratio
        else node.scrollLeft = origin + delta * ratio
      }
      const end = () => {
        root.current?.removeAttribute("data-dragging")
        thumb.removeEventListener("pointermove", move)
        thumb.removeEventListener("pointerup", end)
        thumb.removeEventListener("pointercancel", end)
      }
      thumb.addEventListener("pointermove", move)
      thumb.addEventListener("pointerup", end)
      thumb.addEventListener("pointercancel", end)
    }

    return (
      <div
        ref={composedRoot}
        className={cx("kg-scroll-area group/scroll relative overflow-hidden", className)}
        data-type={type}
        data-orientation={orientation}
        {...props}
      >
        <div
          ref={composedViewport}
          className={cx(
            viewportClass,
            orientation === "vertical" && "overflow-x-hidden",
            orientation === "horizontal" && "overflow-y-hidden",
          )}
          // Scrollable regions must be keyboard reachable (WCAG 2.1.1) when nothing inside is.
          tabIndex={tabIndex ?? (scrollable ? 0 : undefined)}
          role={ariaLabel ? "region" : undefined}
          aria-label={ariaLabel}
          onScroll={onScroll}
        >
          <div className={cx("kg-scroll-area__content", showX && "w-max min-w-full")}>{children}</div>
        </div>
        {showY && (
          <div
            ref={bars.y}
            className={cx(bar, "top-0 right-0 w-[10px]", both ? "bottom-[10px]" : "bottom-0")}
            data-axis="y"
            data-hidden="true"
            aria-hidden="true"
            onPointerDown={startDrag("y")}
          >
            <div ref={thumbs.y} className={cx(thumbClass, "w-full")} />
          </div>
        )}
        {showX && (
          <div
            ref={bars.x}
            className={cx(bar, "bottom-0 left-0 h-[10px]", both ? "right-[10px]" : "right-0")}
            data-axis="x"
            data-hidden="true"
            aria-hidden="true"
            onPointerDown={startDrag("x")}
          >
            <div ref={thumbs.x} className={cx(thumbClass, "h-full")} />
          </div>
        )}
      </div>
    )
  },
)

ScrollArea.displayName = "ScrollArea"
