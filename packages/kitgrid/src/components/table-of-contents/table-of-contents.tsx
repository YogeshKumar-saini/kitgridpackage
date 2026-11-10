"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type RefObject,
  useRef,
} from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { cx } from "../../utils/cx.js"
import { scrollToSection, useScrollSpy } from "./scroll-spy.js"

const rootClass =
  "kg-toc relative ps-4 text-kg-sm before:absolute before:inset-y-0 before:start-0 before:w-px before:bg-kg-border before:content-['']"

/* A 1px-tall bar scaled to the link height so it glides on transform alone. */
const markerClass = [
  "kg-toc__marker absolute top-0 start-[-1px] h-px w-[3px] rounded-full bg-kg-ink origin-[50%_0]",
  "[transform:translateY(var(--_y,0))_scaleY(var(--_h,0))]",
  "[transition:transform_var(--kg-duration-slow)_var(--kg-ease-out),opacity_var(--kg-duration-fast)_var(--kg-ease-out)]",
]

const linkClass = [
  "kg-toc__link block py-1 leading-[1.4] text-kg-fg-muted no-underline rounded-kg-xs",
  "transition-[color,translate] duration-(--kg-duration-base) ease-kg-out hover:text-kg-fg",
  "aria-[current=location]:translate-x-[2px] aria-[current=location]:font-medium aria-[current=location]:text-kg-fg",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
]

export interface TableOfContentsItem {
  id: string
  label: string
  /** 1 for top-level sections, 2 or 3 for nested headings. */
  level?: number
}

export interface TableOfContentsProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  items: TableOfContentsItem[]
  /** Sticky header height: a section is current once its top passes this line, in px. */
  offset?: number
  /** Scrolling container, when sections scroll inside an element instead of the page. */
  root?: RefObject<HTMLElement | null>
  onActiveChange?: (id: string) => void
}

/** "On this page" navigation with a scrollspy marker that glides along the rail. */
export const TableOfContents = forwardRef<HTMLElement, TableOfContentsProps>(
  (
    {
      items,
      offset = 80,
      root,
      onActiveChange,
      className,
      "aria-label": ariaLabel = "On this page",
      ...props
    },
    ref,
  ) => {
    const ids = items.map((item) => item.id)
    const [active, setActive] = useScrollSpy(ids, { offset, root })
    const reduced = useReducedMotion()
    const list = useRef<HTMLOListElement>(null)
    const marker = useRef<HTMLSpanElement>(null)

    useIsomorphicLayoutEffect(() => {
      const link = list.current?.querySelector<HTMLElement>('[aria-current="location"]')
      const node = marker.current
      if (!node) return
      if (!link) {
        node.style.opacity = "0"
        return
      }
      node.style.opacity = "1"
      node.style.setProperty("--_y", `${link.offsetTop}px`)
      node.style.setProperty("--_h", String(link.offsetHeight))
      if (active) onActiveChange?.(active)
    }, [active])

    return (
      <nav
        ref={ref}
        aria-label={ariaLabel}
        className={cx(rootClass, className)}
        {...props}
      >
        <span ref={marker} className={cx(markerClass)} aria-hidden="true" />
        <ol ref={list} className="kg-toc__list m-0 grid list-none gap-[2px] p-0">
          {items.map((item) => (
            <li
              key={item.id}
              className="kg-toc__entry ps-[calc(var(--_level)*var(--kg-space)*3.5)]"
              style={{ "--_level": (item.level ?? 1) - 1 } as CSSProperties}
            >
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
        </ol>
      </nav>
    )
  },
)

TableOfContents.displayName = "TableOfContents"
