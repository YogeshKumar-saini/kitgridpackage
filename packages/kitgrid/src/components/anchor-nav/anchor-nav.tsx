"use client"

import { forwardRef, type HTMLAttributes, type RefObject, useRef } from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { cx } from "../../utils/cx.js"
import { scrollToSection, useScrollSpy } from "../table-of-contents/scroll-spy.js"

const linkClass = [
  "kg-anchor-nav__link relative block px-3.5 py-1.5 text-kg-sm font-medium whitespace-nowrap text-kg-fg-muted no-underline rounded-full",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:text-kg-fg aria-[current=location]:text-kg-fg aria-[current=location]:font-semibold",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
]

/* 1px wide and scaled: the sage slip moves and resizes with transform only. */
const pillClass =
  "kg-anchor-nav__pill absolute inset-y-0 left-0 w-px rounded-full bg-kg-paper-sage origin-[0_50%] [transform:translateX(var(--_x,0))_scaleX(var(--_w,0))] transition-transform duration-(--kg-duration-slow) ease-kg-out"

export interface AnchorNavItem {
  id: string
  label: string
}

export interface AnchorNavProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  items: AnchorNavItem[]
  /** Height of whatever sits above the sections (this bar included), in px. */
  offset?: number
  root?: RefObject<HTMLElement | null>
  /** Stick to the top of the scrolling container. */
  sticky?: boolean
  onActiveChange?: (id: string) => void
}

/**
 * A horizontal in-page section bar: scrollspy, a pill that slides to the current section, and
 * the current link kept in view when the bar overflows on small screens.
 */
export const AnchorNav = forwardRef<HTMLElement, AnchorNavProps>(
  (
    {
      items,
      offset = 64,
      root,
      sticky = true,
      onActiveChange,
      className,
      "aria-label": ariaLabel = "Sections",
      ...props
    },
    ref,
  ) => {
    const [active, setActive] = useScrollSpy(
      items.map((item) => item.id),
      { offset, root },
    )
    const reduced = useReducedMotion()
    const track = useRef<HTMLUListElement>(null)
    const pill = useRef<HTMLSpanElement>(null)

    useIsomorphicLayoutEffect(() => {
      const list = track.current
      const node = pill.current
      const link = list?.querySelector<HTMLElement>('[aria-current="location"]')
      if (!list || !node || !link) return
      const place = () => {
        node.style.setProperty("--_x", `${link.offsetLeft}px`)
        node.style.setProperty("--_w", String(link.offsetWidth))
      }
      place()
      const left = link.offsetLeft - list.scrollLeft
      if (left < 0 || left + link.offsetWidth > list.clientWidth) {
        list.scrollTo?.({
          left: link.offsetLeft - list.clientWidth / 2 + link.offsetWidth / 2,
          behavior: reduced ? "auto" : "smooth",
        })
      }
      if (active) onActiveChange?.(active)
      const observer = new ResizeObserver(place)
      observer.observe(list)
      return () => observer.disconnect()
    }, [active])

    return (
      <nav
        ref={ref}
        aria-label={ariaLabel}
        className={cx("kg-anchor-nav z-5 bg-kg-bg border-b-2 border-kg-ink data-sticky:sticky data-sticky:top-0", className)}
        data-sticky={sticky || undefined}
        {...props}
      >
        <ul ref={track} className="kg-anchor-nav__list relative m-0 flex list-none gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <li className="kg-anchor-nav__pill-slot pointer-events-none absolute inset-y-2 left-0" aria-hidden="true">
            <span ref={pill} className={pillClass} />
          </li>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cx(linkClass)}
                aria-current={active === item.id ? "location" : undefined}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey) return
                  event.preventDefault()
                  setActive(item.id)
                  scrollToSection(item.id, offset, reduced, root)
                  history.replaceState?.(null, "", `#${item.id}`)
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    )
  },
)

AnchorNav.displayName = "AnchorNav"
