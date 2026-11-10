"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { Price } from "../price/price.js"

export interface RecentlyViewedItem {
  id: string
  name: string
  href: string
  image?: string
  price: number
  compareAt?: number
}

export interface RecentlyViewedLabels {
  previous?: string
  next?: string
  clear?: string
}

export interface RecentlyViewedProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  items: readonly RecentlyViewedItem[]
  title?: ReactNode
  currency?: string
  locale?: string
  /** Shows a Clear button. */
  onClear?: () => void
  labels?: RecentlyViewedLabels
}

const defaultLabels: Required<RecentlyViewedLabels> = {
  previous: "Scroll back",
  next: "Scroll forward",
  clear: "Clear",
}

const Chevron = ({ flip }: { flip?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={flip ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
  </svg>
)

const navClass = cx(
  "kg-recently-viewed__nav grid size-8 cursor-pointer place-items-center rounded-full border-2 border-kg-ink bg-kg-surface p-0 text-kg-fg shadow-kg-xs",
  "transition-[translate,box-shadow,opacity] duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:-translate-px interactive:hover:shadow-kg-sm interactive:active:translate-0 interactive:active:shadow-none",
  "disabled:cursor-default disabled:opacity-40 disabled:shadow-none",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring [&_svg]:size-4 rtl:[&_svg]:rotate-180",
)

/** A compact, scroll-snapping rail of products the shopper looked at, with paging buttons. */
export const RecentlyViewed = forwardRef<HTMLElement, RecentlyViewedProps>(
  (
    {
      items,
      title = "Recently viewed",
      currency = "USD",
      locale,
      onClear,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const track = useRef<HTMLUListElement>(null)
    const [edges, setEdges] = useState({ start: true, end: false })

    const measure = useCallback(() => {
      const node = track.current
      if (!node) return
      const max = node.scrollWidth - node.clientWidth
      const position = Math.abs(node.scrollLeft)
      const next = { start: position <= 1, end: position >= max - 1 }
      setEdges((current) =>
        current.start === next.start && current.end === next.end ? current : next,
      )
    }, [])

    useEffect(() => {
      measure()
      const node = track.current
      if (!node || typeof ResizeObserver === "undefined") return
      const observer = new ResizeObserver(measure)
      observer.observe(node)
      return () => observer.disconnect()
    }, [measure, items.length])

    const page = (direction: 1 | -1) => {
      const node = track.current
      if (!node) return
      const rtl = getComputedStyle(node).direction === "rtl" ? -1 : 1
      node.scrollBy({ left: direction * rtl * node.clientWidth * 0.85, behavior: "smooth" })
    }

    if (items.length === 0) return null

    return (
      <section
        ref={ref}
        aria-labelledby={`${id}-title`}
        className={cx("kg-recently-viewed grid min-w-0 gap-3 text-kg-fg", className)}
        {...props}
      >
        <div className="kg-recently-viewed__head flex items-center justify-between gap-3">
          <h2 id={`${id}-title`} className="kg-recently-viewed__title m-0 text-kg-md font-semibold tracking-[-0.012em] text-kg-fg">
            {title}
          </h2>
          <div className="kg-recently-viewed__controls flex items-center gap-1.5">
            {onClear && (
              <button type="button" className={cx(
                  "kg-recently-viewed__clear me-2 cursor-pointer rounded-kg-xs border-0 bg-transparent p-0 font-[inherit] text-kg-sm text-kg-fg-muted",
                  "underline-offset-3 hover:text-kg-fg hover:underline",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                )} onClick={onClear}>
                {text.clear}
              </button>
            )}
            <button
              type="button"
              className={navClass}
              aria-label={text.previous}
              aria-controls={`${id}-track`}
              disabled={edges.start}
              onClick={() => page(-1)}
            >
              <Chevron flip />
            </button>
            <button
              type="button"
              className={navClass}
              aria-label={text.next}
              aria-controls={`${id}-track`}
              disabled={edges.end}
              onClick={() => page(1)}
            >
              <Chevron />
            </button>
          </div>
        </div>
        <ul
          ref={track}
          id={`${id}-track`}
          className={cx(
            "kg-recently-viewed__track m-0 grid list-none auto-cols-[minmax(8.5rem,10rem)] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain",
            "snap-x snap-mandatory ps-0 pe-2 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
          onScroll={measure}
        >
          {items.map((item) => (
            <li
              key={item.id}
              className={cx(
                "kg-recently-viewed__item group/item grid snap-start content-start gap-1 rounded-kg-lg border-2 border-kg-ink bg-kg-surface p-2 shadow-kg-sm",
                "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
                "hover:-translate-0.5 hover:shadow-kg-md has-[a:active]:translate-0 has-[a:active]:shadow-kg-xs",
              )}
            >
              <a
                className="kg-recently-viewed__link grid gap-2 rounded-kg-md text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
                href={item.href}
              >
                <span
                  className={cx(
                    "kg-recently-viewed__image block aspect-[4/5] overflow-hidden rounded-kg-md bg-kg-muted data-placeholder:bg-kg-paper-sage",
                    "[&>img]:size-full [&>img]:object-cover [&>img]:transition-[scale] [&>img]:duration-[var(--kg-duration-slower)] [&>img]:ease-kg-out",
                    "group-hover/item:[&>img]:scale-105",
                  )}
                  data-placeholder={item.image ? undefined : ""}
                >
                  {item.image && <img src={item.image} alt="" loading="lazy" />}
                </span>
                <span className="kg-recently-viewed__name truncate px-0.5 text-kg-sm font-medium">{item.name}</span>
              </a>
              <Price
                amount={item.price}
                compareAt={item.compareAt}
                currency={currency}
                locale={locale}
                size="sm"
                savings={false}
              />
            </li>
          ))}
        </ul>
      </section>
    )
  },
)

RecentlyViewed.displayName = "RecentlyViewed"
