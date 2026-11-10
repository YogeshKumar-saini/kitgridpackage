"use client"

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  createContext,
  type FocusEvent as ReactFocusEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { ROVING_ITEM_SELECTOR, useRovingFocus } from "../../hooks/use-roving-focus.js"
import { createSpring } from "../../hooks/use-spring.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export type DockOrientation = "horizontal" | "vertical"

export interface DockProps extends HTMLAttributes<HTMLDivElement> {
  /** Scale of the item right under the pointer. 1 turns magnification off. */
  magnification?: number
  /** How far from the pointer items still grow, in px. */
  distance?: number
  /** Resting item size, in px. */
  baseSize?: number
  orientation?: DockOrientation
  /** Accessible name of the toolbar. */
  label?: string
}

export interface DockItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Shown as a tooltip on hover and focus, and used as the accessible name. */
  label: string
  icon?: ReactNode
  /** Shows the indicator dot, e.g. for an open app or the current page. */
  active?: boolean
  /** Render the child element (e.g. a link) as the item instead of a <button>. */
  asChild?: boolean
}

export type DockSeparatorProps = HTMLAttributes<HTMLDivElement>

const OrientationContext = createContext<DockOrientation>("horizontal")

interface Part {
  node: HTMLElement
  item: boolean
  center: number
}

/** Cosine falloff: 1 under the pointer, easing to 0 at `distance`. */
const falloff = (offset: number, distance: number) =>
  offset >= distance ? 0 : (Math.cos((offset / distance) * Math.PI) + 1) / 2

/**
 * A macOS-style dock. Items grow with pointer proximity through springs; neighbours are pushed
 * aside with transforms, and the backdrop widens with a clip-path, so nothing triggers layout.
 */
export const Dock = forwardRef<HTMLDivElement, DockProps>(
  (
    {
      magnification = 1.8,
      distance = 140,
      baseSize = 48,
      orientation = "horizontal",
      label,
      className,
      style,
      onKeyDown,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const backdrop = useRef<HTMLSpanElement>(null)
    const reduced = useReducedMotion()
    const vertical = orientation === "vertical"
    const roving = useRovingFocus({ orientation })
    const enabled = !reduced && magnification > 1
    // Upper bound on how far the row can grow per side, so the backdrop is pre-sized for it.
    const reserve = Math.max(0, ((magnification - 1) * (distance + baseSize)) / 2)

    // A toolbar is a single tab stop: only the most recently focused item is tabbable.
    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (!node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>(ROVING_ITEM_SELECTOR))
      const current =
        items.find((item) => item.dataset.dockCurrent !== undefined) ?? items[0]
      for (const item of items) item.tabIndex = item === current ? 0 : -1
    })

    const handleFocus = (event: ReactFocusEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement
      if (!target.matches(ROVING_ITEM_SELECTOR)) return
      const items =
        event.currentTarget.querySelectorAll<HTMLElement>(ROVING_ITEM_SELECTOR)
      for (const item of items) {
        if (item === target) {
          item.dataset.dockCurrent = ""
          item.tabIndex = 0
        } else {
          delete item.dataset.dockCurrent
          item.tabIndex = -1
        }
      }
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (!event.defaultPrevented) roving(event)
    }

    useEffect(() => {
      const node = local.current
      if (!node || !enabled) return
      let parts: Part[] = []

      const measure = () => {
        const found = node.querySelectorAll<HTMLElement>(":scope > [data-dock-part]")
        parts = Array.from(found, (part) => ({
          node: part,
          item: part.dataset.dockPart === "item",
          // Offsets ignore transforms, so these are the resting centres.
          center: vertical
            ? part.offsetTop + part.offsetHeight / 2
            : part.offsetLeft + part.offsetWidth / 2,
        }))
      }

      const write = () => {
        const at = pointer.get()
        const amount = engage.get()
        let total = 0
        const extras = parts.map((part) => {
          if (!part.item) return 0
          const proximity = falloff(Math.abs(at - part.center), distance)
          const scale = 1 + (magnification - 1) * proximity * amount
          part.node.style.setProperty("--_s", scale.toFixed(4))
          const extra = (scale - 1) * baseSize
          total += extra
          return extra
        })
        // Each part shifts by the growth before it, re-centred so the row grows both ways.
        let before = 0
        parts.forEach((part, index) => {
          const extra = extras[index] ?? 0
          const offset = before + extra / 2 - total / 2
          part.node.style.setProperty("--_offset", `${offset.toFixed(2)}px`)
          before += extra
        })
        backdrop.current?.style.setProperty("--_grow", `${(total / 2).toFixed(2)}px`)
      }

      const pointer = createSpring(0, write, {
        stiffness: 320,
        damping: 32,
        precision: 0.1,
      })
      const engage = createSpring(0, write, {
        stiffness: 240,
        damping: 26,
        precision: 0.002,
      })

      const track = (position: number) => {
        // Arriving from outside: start under the pointer, not sweeping in from the last spot.
        if (engage.get() < 0.02) pointer.jump(position)
        else pointer.set(position)
        engage.set(1)
      }

      const handleMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        const box = node.getBoundingClientRect()
        track(
          vertical
            ? event.clientY - box.top - node.clientTop
            : event.clientX - box.left - node.clientLeft,
        )
      }
      const handleEnter = (event: PointerEvent) => {
        if (event.pointerType !== "touch") measure()
      }
      const release = () => engage.set(0)
      const handleFocusIn = (event: FocusEvent) => {
        const target = event.target as HTMLElement
        if (!target.matches(":focus-visible")) return
        const part = target.closest<HTMLElement>("[data-dock-part]")
        measure()
        const match = parts.find((entry) => entry.node === part)
        if (match) track(match.center)
      }
      const handleFocusOut = (event: FocusEvent) => {
        if (!node.contains(event.relatedTarget as Node | null)) release()
      }

      measure()
      node.addEventListener("pointerenter", handleEnter)
      node.addEventListener("pointermove", handleMove, { passive: true })
      node.addEventListener("pointerleave", release)
      node.addEventListener("focusin", handleFocusIn)
      node.addEventListener("focusout", handleFocusOut)
      return () => {
        pointer.stop()
        engage.stop()
        node.removeEventListener("pointerenter", handleEnter)
        node.removeEventListener("pointermove", handleMove)
        node.removeEventListener("pointerleave", release)
        node.removeEventListener("focusin", handleFocusIn)
        node.removeEventListener("focusout", handleFocusOut)
        for (const part of parts) {
          part.node.style.removeProperty("--_s")
          part.node.style.removeProperty("--_offset")
        }
        backdrop.current?.style.removeProperty("--_grow")
      }
    }, [enabled, vertical, magnification, distance, baseSize])

    return (
      <OrientationContext.Provider value={orientation}>
        <div
          ref={ref}
          role="toolbar"
          aria-label={label}
          aria-orientation={orientation}
          className={cx(
            "kg-dock relative isolate inline-flex items-end gap-[var(--kg-dock-gap,calc(var(--kg-space)*2.5))] p-2 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-start",
            "[--_radius:var(--kg-dock-radius,calc(var(--kg-dock-size)*0.36+var(--kg-space)*2))]",
            className,
          )}
          data-orientation={orientation}
          data-magnify={enabled || undefined}
          style={
            {
              "--kg-dock-size": `${baseSize}px`,
              "--_reserve": `${reserve.toFixed(1)}px`,
              ...style,
            } as CSSProperties
          }
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          {...props}
        >
          <span
            ref={backdrop}
            className={cx(
              "kg-dock__backdrop pointer-events-none absolute -z-1 drop-shadow-[4px_4px_0_var(--kg-ink)]",
              vertical
                ? "inset-x-0 inset-y-[calc(var(--_reserve,0px)*-1)]"
                : "inset-y-0 inset-x-[calc(var(--_reserve,0px)*-1)]",
            )}
            aria-hidden="true"
          />
          {children}
        </div>
      </OrientationContext.Provider>
    )
  },
)

Dock.displayName = "Dock"

export const DockItem = forwardRef<HTMLButtonElement, DockItemProps>(
  (
    {
      label,
      icon,
      active = false,
      asChild = false,
      className,
      type,
      children,
      ...props
    },
    ref,
  ) => {
    const id = useId()
    const vertical = useContext(OrientationContext) === "vertical"
    const shared = {
      className: cx(
        "kg-dock__button grid size-[var(--kg-dock-size,48px)] cursor-pointer place-items-center overflow-hidden rounded-[calc(var(--kg-dock-size,48px)*0.28)] border-2 border-kg-ink bg-kg-surface p-0 text-kg-fg no-underline [-webkit-tap-highlight-color:transparent]",
        "[scale:var(--_s,1)] transition-colors duration-(--kg-duration-fast) ease-kg-out interactive:hover:bg-kg-paper-sage",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
        "[&_svg]:size-[46%] [&_img]:size-full [&_img]:object-cover",
        "[.kg-dock:not([data-magnify])_&]:active:[scale:0.94]",
        vertical ? "origin-left" : "origin-bottom",
        className,
      ),
      "data-kg-item": "",
      "aria-labelledby": id,
      "aria-current": active || undefined,
    }

    return (
      <div
        className={cx(
          "kg-dock__item group/dock-item relative flex shrink-0 focus-within:z-1 hover:z-1",
          vertical ? "[translate:0_var(--_offset,0px)]" : "[translate:var(--_offset,0px)_0]",
        )}
        data-dock-part="item"
        data-active={active || undefined}
      >
        {asChild ? (
          <Slot ref={ref} {...shared} {...props}>
            {children}
          </Slot>
        ) : (
          <button ref={ref} type={type ?? "button"} {...shared} {...props}>
            {icon}
            {children}
          </button>
        )}
        <span
          id={id}
          className={cx(
            "kg-dock__label pointer-events-none absolute z-1 rounded-kg-sm bg-kg-ink px-2.5 py-1 text-kg-xs leading-[1.4] font-[550] whitespace-nowrap text-kg-surface",
            "opacity-0 transition-opacity duration-(--kg-duration-fast) ease-kg-out group-hover/dock-item:opacity-100 group-has-[>:focus-visible]/dock-item:opacity-100",
            vertical
              ? "top-1/2 left-full [translate:calc((var(--_s,1)-1)*var(--kg-dock-size)+var(--kg-space)*2.5)_-50%]"
              : "bottom-full left-1/2 [translate:-50%_calc((var(--_s,1)-1)*var(--kg-dock-size)*-1-var(--kg-space)*2.5)]",
          )}
        >
          {label}
        </span>
        {active && (
          <span
            className={cx(
              "kg-dock__dot absolute size-1 rounded-full bg-kg-fg-muted",
              vertical
                ? "top-1/2 left-[calc(var(--kg-space)*-1-2px)] -translate-y-1/2"
                : "bottom-[calc(var(--kg-space)*-1-2px)] left-1/2 -translate-x-1/2",
            )}
            aria-hidden="true"
          />
        )}
      </div>
    )
  },
)

DockItem.displayName = "DockItem"

export const DockSeparator = forwardRef<HTMLDivElement, DockSeparatorProps>(
  ({ className, ...props }, ref) => {
    const orientation = useContext(OrientationContext)
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation === "horizontal" ? "vertical" : "horizontal"}
        className={cx(
          "kg-dock__separator shrink-0 self-stretch bg-kg-ink",
          orientation === "horizontal"
            ? "my-1.5 w-[2px] [translate:var(--_offset,0px)_0]"
            : "mx-1.5 h-[2px] [translate:0_var(--_offset,0px)]",
          className,
        )}
        data-dock-part="separator"
        {...props}
      />
    )
  },
)

DockSeparator.displayName = "DockSeparator"
