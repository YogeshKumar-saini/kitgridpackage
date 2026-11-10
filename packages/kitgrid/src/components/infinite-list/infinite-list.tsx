"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useEffect, useRef } from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { cx } from "../../utils/cx.js"

export interface InfiniteListLabels {
  loading?: string
  more?: string
  end?: string
}

export interface InfiniteListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Called when the sentinel nears the viewport and more pages exist. */
  onLoadMore: () => void
  hasMore: boolean
  loading?: boolean
  /** How early to load, as an IntersectionObserver root margin. */
  rootMargin?: string
  /** Observe within this scroll container instead of the viewport. */
  scrollRoot?: Element | null
  /** Shows a “Load more” button as well, for keyboard users and as a fallback. */
  showButton?: boolean
  labels?: InfiniteListLabels
}

/**
 * Loads the next page when a sentinel scrolls into view. Loading is announced politely, and a
 * button keeps the list usable without scrolling.
 */
export const InfiniteList = forwardRef<HTMLDivElement, InfiniteListProps>(
  (
    {
      children,
      onLoadMore,
      hasMore,
      loading = false,
      rootMargin = "240px",
      scrollRoot,
      showButton = false,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const sentinel = useRef<HTMLDivElement>(null)
    const load = useEventCallback(onLoadMore)
    const words = { loading: "Loading more", more: "Load more", end: "", ...labels }

    useEffect(() => {
      const node = sentinel.current
      if (!node || !hasMore || loading || typeof IntersectionObserver === "undefined") return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) load()
        },
        { root: scrollRoot ?? null, rootMargin },
      )
      observer.observe(node)
      return () => observer.disconnect()
    }, [hasMore, loading, rootMargin, scrollRoot, load])

    const showMore = showButton && hasMore && !loading
    const padded = loading || showMore || (!hasMore && Boolean(words.end))

    return (
      <div
        ref={ref}
        className={cx("kg-infinite-list grid min-w-0", className)}
        aria-busy={loading || undefined}
        {...props}
      >
        {children}
        <div ref={sentinel} className="kg-infinite-list__sentinel h-px" aria-hidden="true" />
        <div
          className={`kg-infinite-list__footer grid justify-items-center gap-2 ${padded ? "py-3" : ""}`}
        >
          <span role="status" className="kg-infinite-list__status inline-flex items-center gap-2 text-kg-sm text-kg-fg-muted empty:hidden">
            {loading ? (
              <>
                <span className="kg-infinite-list__spinner size-3.5 animate-spin rounded-full border-2 border-kg-border border-t-kg-ink [animation-duration:0.75s] motion-reduce:[animation-duration:2.4s] [[data-kg-motion=reduce]_&]:[animation-duration:2.4s]" aria-hidden="true" />
                {words.loading}
              </>
            ) : !hasMore ? (
              words.end
            ) : null}
          </span>
          {showMore && (
            <button type="button" className="kg-infinite-list__more h-kg-sm cursor-pointer rounded-full border-2 border-kg-ink bg-kg-surface px-4 text-kg-sm font-semibold text-kg-fg shadow-kg-xs transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out hover:-translate-px hover:shadow-kg-sm active:translate-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring" onClick={() => load()}>
              {words.more}
            </button>
          )}
        </div>
      </div>
    )
  },
)
InfiniteList.displayName = "InfiniteList"
