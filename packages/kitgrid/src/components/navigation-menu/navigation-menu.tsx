"use client"

import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  createContext,
  type FocusEvent as ReactFocusEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type LiHTMLAttributes,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useDismiss } from "../../hooks/use-dismiss.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { usePresence } from "../../hooks/use-presence.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { getTabbable } from "../dialog/focus.js"

type Direction = "start" | "end"

const TOP = "[data-kg-nav-top]"

interface NavigationMenuContextValue {
  value: string | null
  direction: Direction | null
  setValue: (value: string | null) => void
  rootRef: RefObject<HTMLElement | null>
  /** Hover intent: opens after `delay`, or at once when a panel is already showing. */
  scheduleOpen: (value: string) => void
  scheduleClose: () => void
  cancel: () => void
  openedByHoverAt: RefObject<number>
  baseId: string
}

const NavigationMenuContext = createContext<NavigationMenuContextValue | null>(null)

const useNavigationMenu = (part: string) => {
  const context = useContext(NavigationMenuContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <NavigationMenu>.`)
  return context
}

const triggerIndex = (root: HTMLElement | null, value: string | null) => {
  if (!root || value === null) return -1
  return Array.from(root.querySelectorAll<HTMLElement>("[data-kg-nav-trigger]")).findIndex(
    (trigger) => trigger.dataset.value === value,
  )
}


const plainClass = [
  "inline-flex h-kg-sm items-center gap-1.5 px-3 cursor-pointer",
  "[font-family:inherit] text-kg-sm font-medium text-kg-fg-muted no-underline bg-transparent border-0 rounded-kg-md",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted hover:text-kg-fg data-active:text-kg-fg data-[state=open]:text-kg-fg",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

const cardClass = [
  "flex items-start gap-3 p-3 text-kg-fg no-underline rounded-kg-lg transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "hover:bg-kg-paper-sage focus-visible:bg-kg-paper-sage",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

/* A 1px bar scaled to the trigger width: transform-only, so it never triggers layout. */
const indicatorClass = [
  "kg-navigation-menu__indicator absolute bottom-[-1px] left-0 h-[2px] w-px rounded-full bg-kg-ink opacity-0 origin-[0_50%] data-[state=visible]:opacity-100",
  "[transform:translateX(var(--_x,0))_scaleX(var(--_w,0))]",
  "[transition:transform_var(--kg-duration-slow)_var(--kg-ease-out),opacity_var(--kg-duration-fast)_var(--kg-ease-out)]",
]

/* A lifted panel; switching between triggers slides it in from the side it came from. */
const contentClass = [
  "kg-navigation-menu__content absolute top-[calc(100%+var(--kg-space)*2)] left-0 min-w-[18rem] max-w-[min(44rem,calc(100vw-2rem))] p-2",
  "text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-xl shadow-kg-lg origin-[20%_0] [--kg-enter-y:-6px]",
  "data-[state=open]:animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "data-[state=open]:data-[motion=from-end]:animate-[kg-navmenu-from-end_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "data-[state=open]:data-[motion=from-start]:animate-[kg-navmenu-from-start_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-pop-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
  "data-[state=closed]:data-[motion=to-start]:animate-[kg-navmenu-to-start_var(--kg-duration-base)_var(--kg-ease-in)_forwards]",
  "data-[state=closed]:data-[motion=to-end]:animate-[kg-navmenu-to-end_var(--kg-duration-base)_var(--kg-ease-in)_forwards]",
]

export interface NavigationMenuProps
  extends Omit<HTMLAttributes<HTMLElement>, "defaultValue" | "onChange"> {
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  /** Hover delay before the first panel opens, in ms. */
  delay?: number
  /** Grace period after the pointer leaves before closing, in ms. */
  closeDelay?: number
}

/**
 * Site navigation with disclosure panels (not an ARIA menu: links stay links). Panels open on
 * hover intent or click, slide in from the direction of travel, and an indicator follows the
 * open trigger.
 */
export const NavigationMenu = forwardRef<HTMLElement, NavigationMenuProps>(
  (
    {
      value: valueProp,
      defaultValue = null,
      onValueChange,
      delay = 160,
      closeDelay = 220,
      onBlur,
      className,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const [value, setRaw] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [direction, setDirection] = useState<Direction | null>(null)
    const rootRef = useRef<HTMLElement | null>(null)
    const ref = useComposedRefs(rootRef, forwardedRef)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const openedByHoverAt = useRef(0)
    const latest = useRef(value)
    latest.current = value
    const baseId = useId()

    useEffect(() => () => clearTimeout(timer.current), [])

    const context = useMemo<NavigationMenuContextValue>(() => {
      const setValue = (next: string | null) => {
        const from = triggerIndex(rootRef.current, latest.current)
        const to = triggerIndex(rootRef.current, next)
        setDirection(from === -1 || to === -1 ? null : to > from ? "end" : "start")
        setRaw(next)
      }
      return {
        value,
        direction,
        setValue,
        rootRef,
        scheduleOpen: (next) => {
          clearTimeout(timer.current)
          if (latest.current === next) return
          const open = () => {
            openedByHoverAt.current = Date.now()
            setValue(next)
          }
          if (latest.current !== null) open()
          else timer.current = setTimeout(open, delay)
        },
        scheduleClose: () => {
          clearTimeout(timer.current)
          timer.current = setTimeout(() => setValue(null), closeDelay)
        },
        cancel: () => clearTimeout(timer.current),
        openedByHoverAt,
        baseId,
      }
    }, [value, direction, setRaw, delay, closeDelay, baseId])

    useDismiss({
      enabled: value !== null,
      refs: [rootRef],
      onDismiss: (reason) => {
        const open = latest.current
        context.setValue(null)
        if (reason === "escape" && open !== null)
          rootRef.current
            ?.querySelector<HTMLElement>(`[data-kg-nav-trigger][data-value="${open}"]`)
            ?.focus()
      },
    })

    return (
      <NavigationMenuContext.Provider value={context}>
        <nav
          ref={ref}
          className={cx("kg-navigation-menu relative z-10 inline-flex", className)}
          data-state={value === null ? "closed" : "open"}
          onBlur={(event: ReactFocusEvent<HTMLElement>) => {
            onBlur?.(event)
            const next = event.relatedTarget as Node | null
            if (next && !event.currentTarget.contains(next)) context.setValue(null)
          }}
          {...props}
        >
          {children}
        </nav>
      </NavigationMenuContext.Provider>
    )
  },
)

NavigationMenu.displayName = "NavigationMenu"

export interface NavigationMenuListProps extends HTMLAttributes<HTMLUListElement> {}

export const NavigationMenuList = forwardRef<HTMLUListElement, NavigationMenuListProps>(
  ({ onKeyDown, className, children, ...props }, forwardedRef) => {
    const context = useNavigationMenu("NavigationMenuList")
    const listRef = useRef<HTMLUListElement | null>(null)
    const ref = useComposedRefs(listRef, forwardedRef)
    const indicator = useRef<HTMLSpanElement>(null)

    useIsomorphicLayoutEffect(() => {
      const list = listRef.current
      const mark = indicator.current
      if (!list || !mark || context.value === null) return
      const trigger = list.querySelector<HTMLElement>(
        `[data-kg-nav-trigger][data-value="${context.value}"]`,
      )
      if (!trigger) return
      const place = () => {
        mark.style.setProperty("--_x", `${trigger.offsetLeft}px`)
        mark.style.setProperty("--_w", String(trigger.offsetWidth))
      }
      place()
      const observer = new ResizeObserver(place)
      observer.observe(list)
      return () => observer.disconnect()
    }, [context.value])

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>) => {
      onKeyDown?.(event)
      const target = event.target as HTMLElement
      if (event.defaultPrevented || !target.matches(TOP)) return
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(TOP))
      const index = items.indexOf(target)
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
      let next = -1
      if (event.key === "ArrowRight") next = index + (rtl ? -1 : 1)
      else if (event.key === "ArrowLeft") next = index + (rtl ? 1 : -1)
      else if (event.key === "Home") next = 0
      else if (event.key === "End") next = items.length - 1
      else return
      event.preventDefault()
      items[(next + items.length) % items.length]?.focus()
    }

    return (
        <ul
          ref={ref}
          className={cx("kg-navigation-menu__list relative m-0 flex list-none items-center gap-0.5 p-1", className)}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {children}
          <li className="kg-navigation-menu__indicator-slot pointer-events-none absolute inset-x-0 bottom-0 h-0" aria-hidden="true">
            <span
              ref={indicator}
              className={cx(indicatorClass)}
              data-state={context.value === null ? "hidden" : "visible"}
            />
          </li>
        </ul>
    )
  },
)

NavigationMenuList.displayName = "NavigationMenuList"

interface ItemContextValue {
  value: string
  open: boolean
  triggerId: string
  contentId: string
}

const ItemContext = createContext<ItemContextValue | null>(null)

const useItem = (part: string) => {
  const context = useContext(ItemContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <NavigationMenuItem>.`)
  return context
}

export interface NavigationMenuItemProps extends LiHTMLAttributes<HTMLLIElement> {
  value?: string
}

export const NavigationMenuItem = forwardRef<HTMLLIElement, NavigationMenuItemProps>(
  ({ value: valueProp, onPointerLeave, className, ...props }, ref) => {
    const root = useNavigationMenu("NavigationMenuItem")
    const id = useId()
    const value = valueProp ?? id
    const item = useMemo(
      () => ({
        value,
        open: root.value === value,
        triggerId: `${id}-trigger`,
        contentId: `${id}-content`,
      }),
      [value, root.value, id],
    )
    return (
      <ItemContext.Provider value={item}>
        <li
          ref={ref}
          className={cx("kg-navigation-menu__item contents", className)}
          onPointerLeave={(event) => {
            onPointerLeave?.(event)
            if (event.pointerType !== "touch" && root.value !== null) root.scheduleClose()
          }}
          {...props}
        />
      </ItemContext.Provider>
    )
  },
)

NavigationMenuItem.displayName = "NavigationMenuItem"

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export interface NavigationMenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export const NavigationMenuTrigger = forwardRef<
  HTMLButtonElement,
  NavigationMenuTriggerProps
>(({ onClick, onKeyDown, onPointerEnter, className, children, ...props }, ref) => {
  const root = useNavigationMenu("NavigationMenuTrigger")
  const item = useItem("NavigationMenuTrigger")
  return (
    <button
      ref={ref}
      type="button"
      id={item.triggerId}
      aria-expanded={item.open}
      aria-controls={item.contentId}
      data-state={item.open ? "open" : "closed"}
      data-value={item.value}
      data-kg-nav-trigger=""
      data-kg-nav-top=""
      className={cx("kg-navigation-menu__trigger group/trigger", plainClass, className)}
      onPointerEnter={(event) => {
        onPointerEnter?.(event)
        if (event.pointerType !== "touch") root.scheduleOpen(item.value)
      }}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        root.cancel()
        // A click landing right after hover opened the panel confirms it rather than closing it.
        const justHovered = Date.now() - root.openedByHoverAt.current < 400
        if (item.open && justHovered && event.detail !== 0) return
        root.setValue(item.open ? null : item.value)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || event.key !== "ArrowDown") return
        event.preventDefault()
        if (!item.open) root.setValue(item.value)
        requestAnimationFrame(() => {
          const panel = document.getElementById(item.contentId)
          if (panel) getTabbable(panel)[0]?.focus()
        })
      }}
      {...props}
    >
      {children}
      <span className="kg-navigation-menu__chevron inline-grid size-[0.875rem] transition-transform duration-(--kg-duration-base) ease-kg-out group-data-[state=open]/trigger:-rotate-180 [&_svg]:size-full" aria-hidden="true">
        <Chevron />
      </span>
    </button>
  )
})

NavigationMenuTrigger.displayName = "NavigationMenuTrigger"

const InContentContext = createContext(false)

export interface NavigationMenuContentProps extends HTMLAttributes<HTMLDivElement> {}

export const NavigationMenuContent = forwardRef<HTMLDivElement, NavigationMenuContentProps>(
  ({ onPointerEnter, onKeyDown, className, ...props }, forwardedRef) => {
    const root = useNavigationMenu("NavigationMenuContent")
    const item = useItem("NavigationMenuContent")
    const { ref, present, state } = usePresence<HTMLDivElement>(item.open)
    const composed = useComposedRefs(ref, forwardedRef)
    const direction = root.direction
    const motion =
      direction === null
        ? undefined
        : item.open
          ? `from-${direction}`
          : `to-${direction === "end" ? "start" : "end"}`
    if (!present) return null
    return (
      <InContentContext.Provider value={true}>
      <div
        ref={composed}
        id={item.contentId}
        aria-labelledby={item.triggerId}
        className={cx(contentClass, className)}
        data-state={state}
        data-motion={motion}
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          root.cancel()
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented || (event.key !== "ArrowDown" && event.key !== "ArrowUp"))
            return
          const links = getTabbable(event.currentTarget)
          const index = links.indexOf(document.activeElement as HTMLElement)
          event.preventDefault()
          if (event.key === "ArrowUp" && index <= 0) {
            document.getElementById(item.triggerId)?.focus()
            return
          }
          links[Math.min(links.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))]?.focus()
        }}
        {...props}
      />
      </InContentContext.Provider>
    )
  },
)

NavigationMenuContent.displayName = "NavigationMenuContent"

export interface NavigationMenuLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Marks the current page with `aria-current="page"`. */
  active?: boolean
  /** Rich panel links: a short secondary line under the title. */
  description?: ReactNode
  icon?: ReactNode
}

export const NavigationMenuLink = forwardRef<HTMLAnchorElement, NavigationMenuLinkProps>(
  ({ active = false, description, icon, className, children, ...props }, ref) => {
    const inContent = useContext(InContentContext)
    const inPanel = description != null || icon != null
    return (
      <a
        ref={ref}
        aria-current={active ? "page" : undefined}
        data-active={active || undefined}
        data-variant={inPanel ? "card" : "plain"}
        data-kg-nav-top={inContent ? undefined : ""}
        className={cx("kg-navigation-menu__link", inPanel ? cardClass : plainClass, className)}
        {...props}
      >
        {icon != null && (
          <span className="kg-navigation-menu__link-icon inline-grid size-[2.25rem] shrink-0 place-items-center text-kg-fg bg-kg-paper-sage border-2 border-kg-ink rounded-kg-md [&_svg]:size-[1.125rem]" aria-hidden="true">
            {icon}
          </span>
        )}
        {inPanel ? (
          <span className="kg-navigation-menu__link-text grid min-w-0 gap-[2px]">
            <span className="kg-navigation-menu__link-title text-kg-sm font-semibold">{children}</span>
            {description != null && (
              <span className="kg-navigation-menu__link-description text-kg-xs leading-[1.45] text-kg-fg-muted">{description}</span>
            )}
          </span>
        ) : (
          children
        )}
      </a>
    )
  },
)

NavigationMenuLink.displayName = "NavigationMenuLink"
