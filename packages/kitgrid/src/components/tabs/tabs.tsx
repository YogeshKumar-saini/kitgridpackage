"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useRovingFocus } from "../../hooks/use-roving-focus.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type TabsOrientation = "horizontal" | "vertical"
export type TabsActivationMode = "automatic" | "manual"
export type TabsListVariant = "underline" | "pill" | "enclosed"

/*
 * Paper Layers: `enclosed` is a row of folder tabs. Inactive tabs are sage paper; the selected
 * one is the white sheet of its panel, overlapping the panel's ink edge so the two read as one.
 */
const listVariants = variants({
  base: "kg-tabs__list group/tablist relative isolate flex min-w-0",
  variants: {
    variant: {
      underline: "gap-2",
      pill: "gap-1",
      enclosed: "gap-1",
    },
    orientation: {
      horizontal: "",
      vertical: "flex-col items-stretch",
    },
  },
  compound: [
    {
      variant: "underline",
      orientation: "horizontal",
      class: "items-center shadow-[inset_0_-2px_0_var(--kg-border)]",
    },
    {
      variant: "underline",
      orientation: "vertical",
      class: "gap-0 shadow-[inset_2px_0_0_var(--kg-border)]",
    },
    { variant: "pill", orientation: "horizontal", class: "items-center" },
    { variant: "enclosed", orientation: "horizontal", class: "items-end" },
  ],
})

const indicatorVariants = variants({
  base: [
    "kg-tabs__indicator pointer-events-none absolute -z-1 origin-top-left opacity-0 group-data-indicator/tablist:opacity-100",
    "transition-transform duration-[var(--kg-duration-slow)] ease-kg-out motion-reduce:transition-none",
  ],
  variants: {
    variant: {
      underline: "rounded-full bg-kg-ink",
      pill: [
        "top-0 left-0 h-[var(--_h,0px)] w-[var(--_w,0px)] rounded-full bg-kg-accent shadow-[2px_2px_0_var(--kg-paper-sage)]",
        "[transform:translate(var(--_x,0px),var(--_y,0px))_scale(var(--_sx,1),var(--_sy,1))]",
      ],
      enclosed: "hidden",
    },
    orientation: {
      horizontal: "",
      vertical: "",
    },
  },
  compound: [
    {
      variant: "underline",
      orientation: "horizontal",
      class:
        "bottom-0 left-0 h-[3px] w-[var(--_w,0px)] [transform:translateX(var(--_x,0px))_scaleX(var(--_sx,1))]",
    },
    {
      variant: "underline",
      orientation: "vertical",
      class:
        "top-0 left-0 h-[var(--_h,0px)] w-[3px] [transform:translateY(var(--_y,0px))_scaleY(var(--_sy,1))]",
    },
  ],
})

const triggerVariants = variants({
  base: [
    "kg-tabs__trigger relative inline-flex shrink-0 items-center gap-2 font-[inherit] text-kg-base font-semibold leading-none whitespace-nowrap",
    "cursor-pointer [-webkit-tap-highlight-color:transparent] transition-[color,background-color] duration-(--kg-duration-fast) ease-kg-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
    "disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-[1.1em]",
    "*:transition-[scale] *:duration-[var(--kg-duration-slow)] *:ease-kg-out interactive:active:*:scale-95 motion-reduce:*:transition-none",
  ],
  variants: {
    variant: {
      underline: [
        "h-kg-md rounded-kg-sm border-0 bg-transparent text-kg-fg-muted data-[state=active]:text-kg-fg",
        "interactive:hover:text-kg-fg interactive:hover:not-data-[state=active]:bg-kg-muted",
      ],
      pill: [
        "h-kg-sm rounded-full border-0 bg-transparent px-3.5 text-kg-fg-muted data-[state=active]:text-kg-accent-fg",
        "interactive:hover:not-data-[state=active]:bg-kg-muted interactive:hover:not-data-[state=active]:text-kg-fg",
        "not-group-data-indicator/tablist:data-[state=active]:bg-kg-accent",
      ],
      enclosed: [
        "h-kg-md border-2 border-kg-ink bg-kg-paper-sage px-4 text-kg-fg",
        "interactive:hover:not-data-[state=active]:bg-kg-muted data-[state=active]:z-1 data-[state=active]:bg-kg-surface",
      ],
    },
    orientation: {
      horizontal: "justify-center",
      vertical: "justify-start",
    },
  },
  compound: [
    {
      variant: "underline",
      orientation: "horizontal",
      class:
        "px-1.5 not-group-data-indicator/tablist:data-[state=active]:shadow-[inset_0_-3px_0_var(--kg-ink)]",
    },
    {
      variant: "underline",
      orientation: "vertical",
      class:
        "px-4 not-group-data-indicator/tablist:data-[state=active]:shadow-[inset_3px_0_0_var(--kg-ink)]",
    },
    {
      variant: "enclosed",
      orientation: "horizontal",
      class:
        "rounded-t-kg-lg border-b-0 data-[state=active]:-mb-[2px] data-[state=active]:h-[calc(var(--kg-control-md)+2px)]",
    },
    {
      variant: "enclosed",
      orientation: "vertical",
      class: "rounded-s-kg-lg border-e-0 data-[state=active]:-me-[2px]",
    },
  ],
})

const TabsListVariantContext = createContext<TabsListVariant>("enclosed")

interface TabsContextValue {
  value: string | undefined
  select: (value: string) => void
  orientation: TabsOrientation
  activationMode: TabsActivationMode
  /** False until the user changes tabs, so server-rendered content doesn't fade in on load. */
  animate: boolean
  triggerId: (value: string) => string
  contentId: (value: string) => string
}

const TabsContext = createContext<TabsContextValue | null>(null)

const useTabsContext = (part: string): TabsContextValue => {
  const context = useContext(TabsContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <Tabs>.`)
  return context
}

const slug = (value: string) => value.replace(/[^\w-]/g, "_")

export interface TabsProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue"
> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** `automatic` selects a tab as soon as it receives focus; `manual` waits for Enter/Space. */
  activationMode?: TabsActivationMode
  orientation?: TabsOrientation
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      activationMode = "automatic",
      orientation = "horizontal",
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState<string | undefined>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((value: string | undefined) => void) | undefined,
    })
    const [animate, setAnimate] = useState(false)
    const id = useId()

    const select = useCallback(
      (next: string) => {
        setAnimate(true)
        setValue(next)
      },
      [setValue],
    )

    const context = useMemo<TabsContextValue>(
      () => ({
        value,
        select,
        orientation,
        activationMode,
        animate,
        triggerId: (tab) => `${id}-tab-${slug(tab)}`,
        contentId: (tab) => `${id}-panel-${slug(tab)}`,
      }),
      [value, select, orientation, activationMode, animate, id],
    )

    return (
      <TabsContext.Provider value={context}>
        <div
          ref={ref}
          className={cx(
            "kg-tabs flex min-w-0 flex-col gap-4 data-[orientation=vertical]:flex-row data-[orientation=vertical]:items-start",
            "has-[>[data-variant=enclosed]]:gap-0 data-[orientation=vertical]:has-[>[data-variant=enclosed]]:items-stretch",
            "[&:has(>[data-variant=enclosed])>[role=tabpanel]]:border-2 [&:has(>[data-variant=enclosed])>[role=tabpanel]]:border-kg-ink",
            "[&:has(>[data-variant=enclosed])>[role=tabpanel]]:bg-kg-surface [&:has(>[data-variant=enclosed])>[role=tabpanel]]:p-5",
            "[&:has(>[data-variant=enclosed])>[role=tabpanel]]:rounded-kg-lg [&:has(>[data-variant=enclosed])>[role=tabpanel]]:rounded-ss-none",
            "[&:has(>[data-variant=enclosed])>[role=tabpanel]]:shadow-kg-md",
            className,
          )}
          data-orientation={orientation}
          {...props}
        />
      </TabsContext.Provider>
    )
  },
)

Tabs.displayName = "Tabs"

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  variant?: TabsListVariant
  /** Wrap arrow-key navigation from the last tab to the first. */
  loop?: boolean
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  (
    { variant = "enclosed", loop = true, onKeyDown, className, children, ...props },
    forwardedRef,
  ) => {
    const context = useTabsContext("TabsList")
    const listRef = useRef<HTMLDivElement | null>(null)
    const ref = useComposedRefs(listRef, forwardedRef)
    const indicatorRef = useRef<HTMLSpanElement | null>(null)
    const last = useRef<Box | null>(null)
    const rove = useRovingFocus({ orientation: context.orientation, loop })

    // FLIP: jump to the new box, invert to the old one with a transform, then release it, so
    // only transform ever animates no matter how the tab widths differ.
    const place = useCallback((animate: boolean) => {
      const list = listRef.current
      const indicator = indicatorRef.current
      if (!list || !indicator) return
      const active = list.querySelector<HTMLElement>(
        '[role="tab"][aria-selected="true"]',
      )
      if (!active) {
        list.removeAttribute("data-indicator")
        last.current = null
        return
      }
      const next = {
        x: active.offsetLeft,
        y: active.offsetTop,
        w: active.offsetWidth,
        h: active.offsetHeight,
      }
      const previous = last.current
      last.current = next
      const style = indicator.style
      style.setProperty("--_w", `${next.w}px`)
      style.setProperty("--_h", `${next.h}px`)
      if (animate && previous && next.w > 0 && next.h > 0) {
        style.transition = "none"
        style.setProperty("--_x", `${previous.x}px`)
        style.setProperty("--_y", `${previous.y}px`)
        style.setProperty("--_sx", String(previous.w / next.w))
        style.setProperty("--_sy", String(previous.h / next.h))
        void indicator.offsetWidth
        style.removeProperty("transition")
      }
      style.setProperty("--_x", `${next.x}px`)
      style.setProperty("--_y", `${next.y}px`)
      style.setProperty("--_sx", "1")
      style.setProperty("--_sy", "1")
      list.setAttribute("data-indicator", "")
    }, [])

    useIsomorphicLayoutEffect(() => {
      place(last.current !== null)
    }, [context.value, place])

    useEffect(() => {
      const list = listRef.current
      if (!list) return
      const observer = new ResizeObserver(() => place(false))
      observer.observe(list)
      for (const tab of list.querySelectorAll('[role="tab"]')) observer.observe(tab)
      return () => observer.disconnect()
    }, [place])

    return (
      <div
        ref={ref}
        role="tablist"
        aria-orientation={context.orientation}
        className={listVariants({
          variant,
          orientation: context.orientation,
          className,
        })}
        data-variant={variant}
        data-orientation={context.orientation}
        onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented) rove(event)
        }}
        {...props}
      >
        <span
          ref={indicatorRef}
          className={indicatorVariants({ variant, orientation: context.orientation })}
          aria-hidden="true"
        />
        <TabsListVariantContext.Provider value={variant}>
          {children}
        </TabsListVariantContext.Provider>
      </div>
    )
  },
)

TabsList.displayName = "TabsList"

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, disabled, onClick, onFocus, className, ...props }, ref) => {
    const context = useTabsContext("TabsTrigger")
    const variant = useContext(TabsListVariantContext)
    const selected = context.value === value
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={context.triggerId(value)}
        aria-selected={selected}
        aria-controls={context.contentId(value)}
        tabIndex={selected ? 0 : -1}
        disabled={disabled}
        className={triggerVariants({
          variant,
          orientation: context.orientation,
          className,
        })}
        data-state={selected ? "active" : "inactive"}
        data-disabled={disabled || undefined}
        data-kg-item=""
        {...props}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          onClick?.(event)
          if (!event.defaultPrevented && !disabled) context.select(value)
        }}
        onFocus={(event: FocusEvent<HTMLButtonElement>) => {
          onFocus?.(event)
          if (event.defaultPrevented || disabled || selected) return
          if (context.activationMode === "automatic") context.select(value)
        }}
      />
    )
  },
)

TabsTrigger.displayName = "TabsTrigger"

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  /** Keep the panel mounted (hidden) while inactive, preserving its state. */
  forceMount?: boolean
}

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, forceMount = false, className, ...props }, ref) => {
    const context = useTabsContext("TabsContent")
    const selected = context.value === value
    if (!selected && !forceMount) return null
    return (
      <div
        ref={ref}
        role="tabpanel"
        id={context.contentId(value)}
        aria-labelledby={context.triggerId(value)}
        tabIndex={0}
        hidden={!selected}
        className={cx(
          "kg-tabs__content min-w-0 flex-1 rounded-kg-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          "transition-[opacity,translate] duration-(--kg-duration-base) ease-kg-out motion-reduce:transition-none",
          "data-animate:starting:translate-y-1 data-animate:starting:opacity-0",
          className,
        )}
        data-state={selected ? "active" : "inactive"}
        data-animate={context.animate || undefined}
        {...props}
      />
    )
  },
)

TabsContent.displayName = "TabsContent"
