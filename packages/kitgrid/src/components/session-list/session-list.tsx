"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { useLocale } from "../../hooks/use-locale.js"
import { useRovingFocus } from "../../hooks/use-roving-focus.js"
import { cx } from "../../utils/cx.js"
import { PlusIcon } from "../chat-message/internal/icons.js"
import { type ChatThreadDate, dayLabel } from "../chat-thread/day.js"

export interface SessionListItem {
  id: string
  title: string
  updatedAt: ChatThreadDate
  /** A second line, e.g. the page it was asked on or a message count. */
  meta?: ReactNode
}

export interface SessionListProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "onSelect"
> {
  sessions: readonly SessionListItem[]
  activeId?: string | null
  onSelect?: (id: string) => void
  /** Shows a "New chat" button at the top. */
  onNew?: () => void
  newLabel?: string
  newDisabled?: boolean
  /** Per-row controls such as rename or delete, revealed on hover and focus. */
  actions?: (session: SessionListItem) => ReactNode
  /** Accessible name of the navigation landmark. */
  label?: string
  empty?: ReactNode
  /** The reference "now" for the day groups, for deterministic server rendering. */
  now?: Date
  locale?: string
}

const Group = ({
  title,
  items,
  activeId,
  onSelect,
  actions,
}: {
  title: string
  items: SessionListItem[]
  activeId: string | null | undefined
  onSelect: ((id: string) => void) | undefined
  actions: SessionListProps["actions"]
}) => {
  const headingId = useId()
  return (
    <div className="kg-session-list__group flex flex-col gap-1" role="group" aria-labelledby={headingId}>
      <span id={headingId} className="kg-session-list__heading px-2.5 text-kg-xs font-semibold text-kg-fg-faint">
        {title}
      </span>
      <ul className="kg-session-list__items m-0 flex list-none flex-col gap-0.5 p-0">
        {items.map((session) => {
          const active = session.id === activeId
          return (
            <li
              key={session.id}
              className={cx(
                "kg-session-list__item group/item relative flex items-center rounded-kg-md transition-colors duration-(--kg-duration-fast) ease-kg-out",
                "hover:bg-kg-muted data-active:bg-kg-paper-sage",
                "data-active:before:absolute data-active:before:inset-y-1/4 data-active:before:start-0 data-active:before:w-[3px] data-active:before:rounded-full data-active:before:bg-kg-ink data-active:before:content-['']",
              )}
              data-active={active || undefined}
            >
              <button
                type="button"
                className={cx(
                  "kg-session-list__button flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-px rounded-[inherit] border-0 bg-transparent px-2.5 py-2",
                  "text-start [font:inherit] text-inherit group-data-active/item:font-semibold",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
                  actions && "pe-18",
                )}
                data-kg-item=""
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect?.(session.id)}
              >
                <span className="kg-session-list__title w-full truncate">{session.title}</span>
                {session.meta != null && (
                  <span className="kg-session-list__meta w-full truncate text-kg-xs font-normal text-kg-fg-muted">{session.meta}</span>
                )}
              </button>
              {actions && (
                <span className="kg-session-list__actions absolute end-1 flex gap-0.5 opacity-0 transition-opacity duration-(--kg-duration-fast) ease-kg-out group-hover/item:opacity-100 group-focus-within/item:opacity-100 [@media(hover:none)]:opacity-100">{actions(session)}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Past conversations, newest first, grouped by day, with the open one marked. */
export const SessionList = forwardRef<HTMLElement, SessionListProps>(
  (
    {
      sessions,
      activeId,
      onSelect,
      onNew,
      newLabel = "New chat",
      newDisabled = false,
      actions,
      label = "Chats",
      empty = "No chats yet",
      now,
      locale: localeProp,
      className,
      ...props
    },
    ref,
  ) => {
    const locale = useLocale(localeProp)
    const onKeyDown = useRovingFocus({ orientation: "vertical", loop: false })
    const reference = now ?? new Date()
    const groups = new Map<string, SessionListItem[]>()
    for (const session of [...sessions].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )) {
      const key = dayLabel(session.updatedAt, reference, locale)
      groups.set(key, [...(groups.get(key) ?? []), session])
    }

    return (
      <nav
        ref={ref}
        aria-label={label}
        className={cx("kg-session-list flex min-h-0 flex-col gap-3 text-kg-sm text-kg-fg", className)}
        {...props}
      >
        {onNew && (
          <button
            type="button"
            className={cx(
              "kg-session-list__new inline-flex h-kg-md cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 border-kg-ink px-3",
              "bg-kg-accent [font:inherit] font-semibold text-kg-accent-fg shadow-[3px_3px_0_var(--kg-paper-sage)]",
              "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out [&_svg]:size-[1.1em]",
              "interactive:hover:-translate-px interactive:hover:shadow-[5px_5px_0_var(--kg-paper-sage)]",
              "interactive:active:translate-x-[3px] interactive:active:translate-y-[3px] interactive:active:shadow-none",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            )}
            disabled={newDisabled}
            onClick={onNew}
          >
            <PlusIcon />
            {newLabel}
          </button>
        )}
        {sessions.length === 0 ? (
          <p className="kg-session-list__empty m-0 px-2 py-4 text-center text-kg-xs text-kg-fg-faint">{empty}</p>
        ) : (
          <div className="kg-session-list__scroll -mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1" onKeyDown={onKeyDown}>
            {[...groups].map(([title, items]) => (
              <Group
                key={title}
                title={title}
                items={items}
                activeId={activeId}
                onSelect={onSelect}
                actions={actions}
              />
            ))}
          </div>
        )}
      </nav>
    )
  },
)

SessionList.displayName = "SessionList"
