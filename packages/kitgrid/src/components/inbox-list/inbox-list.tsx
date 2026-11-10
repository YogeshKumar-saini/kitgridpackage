"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useRovingFocus } from "../../hooks/use-roving-focus.js"
import { cx } from "../../utils/cx.js"
import { Avatar } from "../avatar/avatar.js"

export interface InboxListItem {
  id: string
  /** Sender or source. */
  from: string
  avatar?: string
  subject: ReactNode
  /** One line of preview text. */
  preview?: ReactNode
  time?: ReactNode
  unread?: boolean
  /** A short trailing tag such as a project key. */
  tag?: ReactNode
}

export interface InboxListProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  items: readonly InboxListItem[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (id: string) => void
  /** Required name for the listbox. */
  "aria-label": string
  unreadLabel?: string
}

/**
 * A triage list in the style of a product inbox: one selectable row per thread, with unread
 * weight and a dot. A single-select listbox, so arrow keys move and Enter or Space selects.
 */
export const InboxList = forwardRef<HTMLDivElement, InboxListProps>(
  (
    {
      items,
      value: valueProp,
      defaultValue = null,
      onValueChange,
      unreadLabel = "Unread",
      className,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: (next) => {
        if (next != null) onValueChange?.(next)
      },
    })
    const [focusId, setFocusId] = useState<string | undefined>(undefined)
    const roving = useRovingFocus({ orientation: "vertical", loop: false })
    const tabStop =
      focusId ??
      (items.some((item) => item.id === value) ? value : items[0]?.id) ??
      undefined

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const moved = roving(event)
      if (moved) {
        setFocusId(moved.dataset.id)
        return
      }
      if (event.key === "Enter" || event.key === " ") {
        const id = (document.activeElement as HTMLElement | null)?.dataset.id
        if (id) {
          event.preventDefault()
          setValue(id)
        }
      }
    }

    return (
      <div
        ref={ref}
        role="listbox"
        className={cx("kg-inbox-list grid min-w-0 gap-px p-1 outline-none", className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {items.map((item) => {
          const selected = item.id === value
          const strong = selected || item.unread
          return (
            <div
              key={item.id}
              role="option"
              aria-selected={selected}
              tabIndex={item.id === tabStop ? 0 : -1}
              className={cx(
                "kg-inbox-list__item relative grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-kg-md border-2 py-2.5 ps-4 pe-3 select-none",
                "transition-[background-color,border-color] duration-(--kg-duration-fast) ease-kg-out",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
                "before:absolute before:start-1 before:inset-y-2.5 before:w-[3px] before:rounded-full before:bg-kg-ink before:transition-[scale] before:duration-(--kg-duration-base) before:ease-kg-spring before:content-['']",
                selected
                  ? "border-kg-ink bg-kg-paper-sage before:scale-y-100"
                  : "border-transparent hover:bg-kg-muted before:scale-y-0",
              )}
              data-unread={item.unread || undefined}
              data-kg-item=""
              data-id={item.id}
              onClick={() => setValue(item.id)}
              onFocus={() => setFocusId(item.id)}
            >
              <Avatar
                className="kg-inbox-list__avatar"
                size="sm"
                name={item.from}
                src={item.avatar}
                aria-hidden="true"
              />
              <span className="kg-inbox-list__main grid min-w-0 gap-0.5">
                <span className="kg-inbox-list__line flex min-w-0 items-baseline justify-between gap-2">
                  <span
                    className={cx(
                      "kg-inbox-list__from truncate text-kg-xs",
                      strong ? "text-kg-fg" : "text-kg-fg-muted",
                    )}
                  >
                    {item.from}
                  </span>
                  {item.time != null && (
                    <span
                      className={cx(
                        "kg-inbox-list__time shrink-0 text-kg-xs tabular-nums",
                        selected ? "text-kg-fg" : "text-kg-fg-faint",
                      )}
                    >
                      {item.time}
                    </span>
                  )}
                </span>
                <span
                  className={cx(
                    "kg-inbox-list__subject truncate text-kg-sm",
                    item.unread ? "font-semibold" : "font-normal",
                    strong ? "text-kg-fg" : "text-kg-fg-muted",
                  )}
                >
                  {item.unread && (
                    <span className="kg-visually-hidden">{unreadLabel}: </span>
                  )}
                  {item.subject}
                </span>
                {(item.preview != null || item.tag != null) && (
                  <span className="kg-inbox-list__line flex min-w-0 items-baseline justify-between gap-2">
                    <span
                      className={cx(
                        "kg-inbox-list__preview min-w-0 truncate text-kg-xs",
                        selected ? "text-kg-fg" : "text-kg-fg-faint",
                      )}
                    >
                      {item.preview}
                    </span>
                    {item.tag != null && (
                      <span className="kg-inbox-list__tag shrink-0 rounded-kg-sm border-2 border-kg-ink bg-kg-surface px-1.5 font-kg-mono text-[0.6875rem] leading-[0.875rem] text-kg-fg">
                        {item.tag}
                      </span>
                    )}
                  </span>
                )}
              </span>
              <span
                className={cx(
                  "kg-inbox-list__dot absolute start-1.5 top-[1.125rem] size-1.5 rounded-full bg-kg-accent",
                  "transition-[opacity,scale] duration-(--kg-duration-base) ease-kg-spring",
                  item.unread && !selected
                    ? "scale-100 opacity-100"
                    : "scale-0 opacity-0",
                )}
                aria-hidden="true"
              />
            </div>
          )
        })}
      </div>
    )
  },
)

InboxList.displayName = "InboxList"
