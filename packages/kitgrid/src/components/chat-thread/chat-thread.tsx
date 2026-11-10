"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { useLocale } from "../../hooks/use-locale.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { cx } from "../../utils/cx.js"
import { ArrowDownIcon } from "../chat-message/internal/icons.js"
import { type ChatThreadDate, dayLabel } from "./day.js"

export interface ChatThreadProps extends HTMLAttributes<HTMLDivElement> {
  /** Marks the log busy while an answer streams, so screen readers wait for it to settle. */
  busy?: boolean
  /** Within this many pixels of the end, the thread keeps following new content down. */
  followThreshold?: number
  /** Accessible name of the log. */
  label?: string
  /** Text of the button that appears once the reader scrolls away from the end. */
  jumpLabel?: string
  /** Shown instead of the messages when there are none. */
  empty?: ReactNode
}

/**
 * The scrolling conversation. It sticks to the bottom while new messages and streamed words
 * arrive, stops following the moment the reader scrolls up, and offers a way back down.
 */
export const ChatThread = forwardRef<HTMLDivElement, ChatThreadProps>(
  (
    {
      busy = false,
      followThreshold = 80,
      label = "Conversation",
      jumpLabel = "Jump to latest",
      empty,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const viewport = useRef<HTMLDivElement>(null)
    const content = useRef<HTMLDivElement>(null)
    const follow = useRef(true)
    const [away, setAway] = useState(false)
    const reduced = useReducedMotion()

    const toEnd = (behavior: ScrollBehavior = "auto") => {
      const node = viewport.current
      if (!node) return
      if (typeof node.scrollTo === "function")
        node.scrollTo({ top: node.scrollHeight, behavior })
      else node.scrollTop = node.scrollHeight
    }

    useIsomorphicLayoutEffect(() => {
      if (follow.current) toEnd()
    }, [children])

    // Charts and images grow a message after it lands; following them keeps the end in view.
    useEffect(() => {
      const inner = content.current
      if (!inner) return
      const observer = new ResizeObserver(() => {
        if (follow.current) toEnd()
      })
      observer.observe(inner)
      return () => observer.disconnect()
    }, [])

    const handleScroll = () => {
      const node = viewport.current
      if (!node) return
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight
      follow.current = distance < followThreshold
      setAway(!follow.current)
    }

    const isEmpty = empty !== undefined && !hasContent(children)

    return (
      <div ref={ref} className={cx("kg-chat-thread relative flex h-full min-h-0 flex-col", className)} {...props}>
        <div
          ref={viewport}
          className="kg-chat-thread__viewport min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[inherit] [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring"
          role="log"
          aria-live="polite"
          aria-label={label}
          aria-busy={busy || undefined}
          // A scrollable region must be reachable by keyboard to be scrolled without a mouse.
          tabIndex={0}
          onScroll={handleScroll}
        >
          <div ref={content} className="kg-chat-thread__content flex min-h-full flex-col gap-6 px-4 py-5">
            {isEmpty ? (
              <div className="kg-chat-thread__empty flex flex-1 flex-col justify-end">{empty}</div>
            ) : (
              children
            )}
          </div>
        </div>
        {away && (
          <button
            type="button"
            className={cx(
              "kg-chat-thread__jump absolute start-1/2 bottom-3 inline-flex h-kg-sm -translate-x-1/2 rtl:translate-x-1/2 cursor-pointer items-center gap-1.5 px-3",
              "rounded-full border-2 border-kg-ink bg-kg-surface [font:inherit] text-kg-sm font-semibold text-kg-fg shadow-kg-sm",
              "transition-[translate,box-shadow,background-color] duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-paper-sage",
              "animate-[kg-pop-in_var(--kg-duration-spring)_var(--kg-ease-spring)] motion-reduce:animate-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            )}
            onClick={() => {
              follow.current = true
              setAway(false)
              toEnd(reduced ? "auto" : "smooth")
            }}
          >
            <ArrowDownIcon />
            {jumpLabel}
          </button>
        )}
      </div>
    )
  },
)

ChatThread.displayName = "ChatThread"

const hasContent = (children: ReactNode): boolean =>
  Array.isArray(children)
    ? children.some(hasContent)
    : children !== undefined &&
      children !== null &&
      children !== false &&
      children !== ""

export interface ChatThreadDividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Labelled "Today", "Yesterday", a weekday or a date. Ignored when children are given. */
  date?: ChatThreadDate
  /** The reference "now", for deterministic server rendering. */
  now?: Date
  locale?: string
}

/** A quiet day break between messages. */
export const ChatThreadDivider = forwardRef<HTMLDivElement, ChatThreadDividerProps>(
  ({ date, now, locale: localeProp, className, children, ...props }, ref) => {
    const locale = useLocale(localeProp)
    return (
      <div
        ref={ref}
        className={cx(
          "kg-chat-thread__divider flex items-center gap-3 text-kg-xs font-semibold text-kg-fg-faint",
          "before:h-0.5 before:flex-1 before:bg-kg-border before:content-[''] after:h-0.5 after:flex-1 after:bg-kg-border after:content-['']",
          className,
        )}
        {...props}
      >
        <span>
          {children ?? (date !== undefined ? dayLabel(date, now, locale) : null)}
        </span>
      </div>
    )
  },
)

ChatThreadDivider.displayName = "ChatThreadDivider"
