"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { ChevronIcon, SparkleIcon } from "../chat-message/internal/icons.js"

/** 4.1s, or 1m 12.0s from a minute on. */
export const formatThoughtDuration = (seconds: number): string => {
  const tenths = Math.round(Math.max(seconds, 0) * 10)
  return tenths < 600
    ? `${(tenths / 10).toFixed(1)}s`
    : `${Math.floor(tenths / 600)}m ${((tenths % 600) / 10).toFixed(1)}s`
}

export interface ThoughtLineProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  /** Thinking right now: the label shimmers and a clock runs. */
  active?: boolean
  /** What it is doing now. Also the text announced to screen readers. */
  label: string
  /** Seconds it took, once settled. */
  duration?: number
  /** The settled line. Defaults to "Thought for 4.1s", or "Thought" without a duration. */
  settledLabel?: (duration: number | undefined) => string
  /** Open state of the steps beneath. Uncontrolled, it is open while active and folds once settled. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Replaces the sparkle. */
  icon?: ReactNode
  /** The reasoning or steps that fold open beneath the line. */
  children?: ReactNode
}

const trigger =
  "kg-thought-line__trigger m-0 -ms-1 inline-flex w-fit max-w-full items-center gap-2 rounded-kg-sm border-0 bg-transparent px-1 py-0.5 text-start [font:inherit] text-inherit"

const defaultSettled = (duration: number | undefined) =>
  duration === undefined ? "Thought" : `Thought for ${formatThoughtDuration(duration)}`

/**
 * The assistant's reasoning line: a breathing sparkle, the current step and a running clock
 * while it works; settled, it reads "Thought for 4.1s" and the steps fold away. The
 * clock writes straight to its node, so ticking never re-renders the conversation.
 */
export const ThoughtLine = forwardRef<HTMLElement, ThoughtLineProps>(
  (
    {
      active = false,
      label,
      duration,
      settledLabel = defaultSettled,
      open: openProp,
      defaultOpen,
      onOpenChange,
      icon,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const panelId = useId()
    const clock = useRef<HTMLSpanElement>(null)
    const [choice, setChoice] = useState<boolean | undefined>(defaultOpen)
    const expandable = children !== undefined && children !== null && children !== false
    const open = expandable && (openProp ?? choice ?? active)

    useEffect(() => {
      if (!active) return
      const started = performance.now()
      const write = () => {
        if (clock.current)
          clock.current.textContent = formatThoughtDuration(
            (performance.now() - started) / 1000,
          )
      }
      write()
      const timer = window.setInterval(write, 100)
      return () => window.clearInterval(timer)
    }, [active])

    const text = active ? label : settledLabel(duration)
    const line = (
      <>
        <span className="kg-thought-line__icon inline-flex shrink-0 text-[0.875rem] text-kg-fg-muted group-data-active/tl:text-kg-fg group-data-active/tl:animate-[kg-pulse_1.6s_var(--kg-ease-in-out)_infinite] motion-reduce:animate-none" aria-hidden="true">
          {icon ?? <SparkleIcon />}
        </span>
        <span key={active ? "active" : "settled"} className="kg-thought-line__label min-w-0 truncate animate-[kg-fade-in_var(--kg-duration-slow)_var(--kg-ease-out)] group-data-active/tl:text-kg-fg motion-reduce:animate-none">
          {text}
        </span>
        {active && (
          <span ref={clock} className="kg-thought-line__clock shrink-0 font-kg-mono text-kg-xs tabular-nums text-kg-fg-faint" aria-hidden="true" />
        )}
        {expandable && (
          <span className="kg-thought-line__chevron inline-flex shrink-0 -rotate-90 text-kg-fg-faint transition-[rotate] duration-(--kg-duration-base) ease-kg-out group-data-[state=open]/tl:rotate-0" aria-hidden="true">
            <ChevronIcon />
          </span>
        )}
      </>
    )

    return (
      <section
        ref={ref}
        className={cx("kg-thought-line group/tl flex min-w-0 flex-col text-kg-sm font-medium text-kg-fg-muted", className)}
        data-active={active || undefined}
        data-state={open ? "open" : "closed"}
        {...props}
      >
        {expandable ? (
          <button
            type="button"
            className={cx(trigger, "cursor-pointer transition-colors duration-(--kg-duration-fast) ease-kg-out hover:text-kg-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring")}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              setChoice(!open)
              onOpenChange?.(!open)
            }}
          >
            {line}
          </button>
        ) : (
          <p className={trigger}>{line}</p>
        )}
        <span className="kg-visually-hidden" role="status">
          {text}
        </span>
        {expandable && (
          <div
            id={panelId}
            className={cx(
              "kg-thought-line__panel invisible grid grid-rows-[0fr] opacity-0",
              "[transition:grid-template-rows_var(--kg-duration-base)_var(--kg-ease-out),opacity_var(--kg-duration-fast)_var(--kg-ease-out),visibility_0s_linear_var(--kg-duration-base)]",
              "data-[state=open]:visible data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100",
              "data-[state=open]:[transition:grid-template-rows_var(--kg-duration-slow)_var(--kg-ease-out),opacity_var(--kg-duration-base)_var(--kg-ease-out),visibility_0s]",
            )}
            data-state={open ? "open" : "closed"}
          >
            <div className="kg-thought-line__clip min-h-0 overflow-hidden">
              <div className="kg-thought-line__steps pt-2">{children}</div>
            </div>
          </div>
        )}
      </section>
    )
  },
)

ThoughtLine.displayName = "ThoughtLine"
