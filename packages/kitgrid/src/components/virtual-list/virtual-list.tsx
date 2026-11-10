"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type Key,
  type ReactNode,
  useEffect,
  useRef,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { useVirtualWindow } from "./use-virtual-window.js"

export interface VirtualListProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  count: number
  /** Every row has this height, in px. */
  itemHeight: number
  /** Viewport height, in px. */
  height: number
  renderItem: (index: number) => ReactNode
  getKey?: (index: number) => Key
  /** Rows rendered beyond each edge of the viewport. */
  overscan?: number
  /** Scrolls this row into view whenever it changes. */
  scrollToIndex?: number
  /** Names the list for assistive tech. */
  label?: string
}

/**
 * Renders thousands of fixed-height rows by mounting only the visible window. Rows keep
 * `aria-setsize` and `aria-posinset`, so screen readers still announce the full length.
 */
export const VirtualList = forwardRef<HTMLDivElement, VirtualListProps>(
  (
    {
      count,
      itemHeight,
      height,
      renderItem,
      getKey,
      overscan = 6,
      scrollToIndex,
      label,
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const ref = useRef<HTMLDivElement>(null)
    const composed = useComposedRefs(ref, forwardedRef)
    const range = useVirtualWindow(ref, count, itemHeight, overscan, height)

    useEffect(() => {
      const node = ref.current
      if (!node || scrollToIndex === undefined) return
      const top = scrollToIndex * itemHeight
      if (top < node.scrollTop) node.scrollTop = top
      else if (top + itemHeight > node.scrollTop + node.clientHeight)
        node.scrollTop = top + itemHeight - node.clientHeight
    }, [scrollToIndex, itemHeight])

    const rows: ReactNode[] = []
    for (let index = range.start; index < range.end; index++) {
      rows.push(
        <div
          key={getKey ? getKey(index) : index}
          role="listitem"
          aria-setsize={count}
          aria-posinset={index + 1}
          className="kg-virtual-list__item box-border overflow-hidden"
          style={{ height: itemHeight }}
        >
          {renderItem(index)}
        </div>,
      )
    }

    return (
      <div
        ref={composed}
        className={cx(
          "kg-virtual-list relative overflow-auto overscroll-contain [contain:strict] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          className,
        )}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the scroll region must be keyboard reachable.
        tabIndex={0}
        style={{ height, ...style }}
        {...props}
      >
        <div
          role="list"
          aria-label={label}
          className="kg-virtual-list__spacer relative w-full"
          style={{ height: range.total } as CSSProperties}
        >
          <div
            className="kg-virtual-list__window absolute inset-x-0 top-0 will-change-transform"
            style={{ transform: `translateY(${range.offset}px)` }}
          >
            {rows}
          </div>
        </div>
      </div>
    )
  },
)
VirtualList.displayName = "VirtualList"
