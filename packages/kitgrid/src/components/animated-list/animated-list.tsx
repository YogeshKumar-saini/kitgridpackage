"use client"

import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export type AnimatedListOrder = "newest-first" | "oldest-first"

export interface AnimatedListProps extends HTMLAttributes<HTMLUListElement> {
  /** Items, in the order they arrive. Each becomes a list item. */
  children: ReactNode
  /** Time between arrivals, in ms. */
  interval?: number
  /** `newest-first` drops each arrival in at the top, like a notification feed. */
  order?: AnimatedListOrder
}

/**
 * Items arrive one at a time and spring into place while the list opens room for them, like
 * a live feed. Starts once the list scrolls into view; under reduced motion all items show.
 */
export const AnimatedList = forwardRef<HTMLUListElement, AnimatedListProps>(
  (
    { children, interval = 1000, order = "newest-first", className, style, ...props },
    forwardedRef,
  ) => {
    const local = useRef<HTMLUListElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: true, amount: 0.2 })
    const items = Children.toArray(children)
    const [count, setCount] = useState(0)
    const shown = reduced ? items.length : Math.min(count, items.length)

    useEffect(() => {
      if (reduced || !inView || count >= items.length) return
      const timer = window.setTimeout(
        () => setCount((n) => n + 1),
        count === 0 ? 0 : interval,
      )
      return () => window.clearTimeout(timer)
    }, [reduced, inView, count, items.length, interval])

    const visible = items.slice(0, shown).map((item, i) => ({ item, i }))
    if (order === "newest-first") visible.reverse()

    return (
      <ul
        ref={ref}
        className={cx("kg-animated-list m-0 flex list-none flex-col p-0", className)}
        style={{ "--_interval": `${interval}ms`, ...style } as CSSProperties}
        {...props}
      >
        {visible.map(({ item, i }) => (
          <li
            key={i}
            className="kg-animated-list__item grid grid-rows-[1fr] animate-[kg-list-open_var(--kg-duration-slower)_var(--kg-ease-out)_both] motion-reduce:animate-none [[data-kg-motion=reduce]_&]:animate-none"
          >
            <div className="kg-animated-list__inner min-h-0 overflow-clip pb-[var(--kg-animated-list-gap,calc(var(--kg-space)*3))] [overflow-clip-margin:1rem] *:origin-top *:animate-[kg-list-pop_var(--kg-duration-spring)_var(--kg-ease-spring)_both] motion-reduce:*:animate-none [[data-kg-motion=reduce]_&]:*:animate-none">{item}</div>
          </li>
        ))}
      </ul>
    )
  },
)

AnimatedList.displayName = "AnimatedList"
