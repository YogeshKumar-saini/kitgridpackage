"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"

export type ActivityFeedTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info"
export type ActivityFeedHeadingElement = "h2" | "h3" | "h4" | "h5" | "h6"

export interface ActivityFeedItem {
  id: string
  /** Who did it, shown first and in bold. */
  actor?: ReactNode
  /** A `<Avatar>` or image for the actor. Takes the place of the icon. */
  avatar?: ReactNode
  /** Decorative glyph in a toned disc, for system events. */
  icon?: ReactNode
  tone?: ActivityFeedTone
  /** The verb phrase: "changed access for", "exported", "joined". */
  action: ReactNode
  target?: ReactNode
  /** A quieter second line. */
  detail?: ReactNode
  time: Date | string | number
}

export interface ActivityFeedLabels {
  today?: string
  yesterday?: string
}

export interface ActivityFeedProps extends HTMLAttributes<HTMLDivElement> {
  items: readonly ActivityFeedItem[]
  /** Split the feed under one heading per day. */
  groupByDay?: boolean
  dayAs?: ActivityFeedHeadingElement
  /** "Today" is measured from here. Pass it when rendering on the server so both sides agree. */
  now?: Date | number
  locale?: string
  timeZone?: string
  formatTime?: (date: Date) => string
  formatDay?: (date: Date) => string
  labels?: ActivityFeedLabels
  /** Shown when there are no items. */
  empty?: ReactNode
}

/* Paper Layers: system events sit on a paper disc in the item's tone; accent is an ink fill. */
const markerTone: Record<ActivityFeedTone, string> = {
  neutral: "bg-kg-muted text-kg-fg-muted",
  accent: "bg-kg-accent text-kg-accent-fg",
  success: "bg-kg-paper-sage text-kg-fg",
  warning: "bg-kg-paper-butter text-kg-fg",
  danger: "bg-kg-paper-rose text-kg-fg",
  info: "bg-kg-paper-sky text-kg-fg",
}

/* The timeline thread runs from this 1.75rem marker down to the next one. */
const itemClass = [
  "kg-activity-feed__item relative grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-3 rounded-kg-md px-1.5 py-2",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted/70",
  "not-last:before:absolute not-last:before:w-px not-last:before:-translate-x-1/2 not-last:before:bg-kg-border not-last:before:content-['']",
  "not-last:before:start-[calc(var(--kg-space)*1.5+0.875rem)] not-last:before:top-[calc(var(--kg-space)*2+1.75rem+2px)] not-last:before:bottom-[calc(var(--kg-space)*-2+2px)]",
].join(" ")

const toDate = (value: Date | string | number) =>
  value instanceof Date ? value : new Date(value)

/**
 * A timeline of events: who did what to which thing, and when, grouped under a heading per
 * day. Times are real `<time>` elements. Server-safe; pass `now` so server and client agree on
 * which day is "Today".
 */
export const ActivityFeed = forwardRef<HTMLDivElement, ActivityFeedProps>(
  (
    {
      items,
      groupByDay = true,
      dayAs: Day = "h3",
      now,
      locale: localeProp,
      timeZone,
      formatTime,
      formatDay,
      labels,
      empty,
      className,
      ...props
    },
    ref,
  ) => {
    const id = useId()
    const locale = useLocale(localeProp)
    const dayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const timeFormat = new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    })
    const dayFormat = new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    const reference = now === undefined ? new Date() : toDate(now)
    const today = dayKey.format(reference)
    const yesterday = dayKey.format(new Date(reference.getTime() - 86_400_000))

    const dayLabel = (date: Date) => {
      if (formatDay) return formatDay(date)
      const key = dayKey.format(date)
      if (key === today) return labels?.today ?? "Today"
      if (key === yesterday) return labels?.yesterday ?? "Yesterday"
      return dayFormat.format(date)
    }

    const groups: { key: string; date: Date; items: ActivityFeedItem[] }[] = []
    for (const item of items) {
      const date = toDate(item.time)
      const key = !groupByDay
        ? "all"
        : Number.isNaN(date.getTime())
          ? "unknown"
          : dayKey.format(date)
      const last = groups[groups.length - 1]
      if (last?.key === key) last.items.push(item)
      else groups.push({ key, date, items: [item] })
    }

    const list = (entries: ActivityFeedItem[]) => (
      <ol className="kg-activity-feed__list m-0 list-none p-0">
        {entries.map((item) => {
          const date = toDate(item.time)
          return (
            <li key={item.id} className={itemClass} data-tone={item.tone ?? "neutral"}>
              <span
                className={cx(
                  "kg-activity-feed__marker grid size-[1.75rem] place-items-center [--kg-avatar-size:1.75rem] rounded-full [&>svg]:size-[0.875rem]",
                  markerTone[item.tone ?? "neutral"],
                )}
                aria-hidden="true"
              >
                {item.avatar ?? item.icon ?? (
                  <span className="kg-activity-feed__dot size-[0.4375rem] rounded-full bg-current" />
                )}
              </span>
              <div className="kg-activity-feed__content grid min-w-0 gap-0.5 self-center">
                <p className="kg-activity-feed__line m-0 leading-[1.45] wrap-anywhere">
                  {item.actor != null && (
                    <span className="kg-activity-feed__actor font-[580]">{item.actor} </span>
                  )}
                  <span className="kg-activity-feed__action text-kg-fg-muted">{item.action}</span>
                  {item.target != null && (
                    <span className="kg-activity-feed__target font-[580]"> {item.target}</span>
                  )}
                </p>
                {item.detail != null && (
                  <p className="kg-activity-feed__detail m-0 text-kg-xs leading-[1.45] text-kg-fg-faint wrap-anywhere">
                    {item.detail}
                  </p>
                )}
              </div>
              <time
                className="kg-activity-feed__time pt-[0.2rem] text-kg-xs tabular-nums whitespace-nowrap text-kg-fg-faint"
                dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}
              >
                {Number.isNaN(date.getTime())
                  ? String(item.time)
                  : formatTime
                    ? formatTime(date)
                    : timeFormat.format(date)}
              </time>
            </li>
          )
        })}
      </ol>
    )

    return (
      <div ref={ref} className={cx("kg-activity-feed grid min-w-0 gap-4 text-kg-sm text-kg-fg", className)} {...props}>
        {items.length === 0 && empty != null ? (
          <div className="kg-activity-feed__empty px-0 py-8 text-center text-kg-fg-muted">{empty}</div>
        ) : groupByDay ? (
          groups.map((group, index) => (
            <section
              key={`${group.key}-${index}`}
              className="kg-activity-feed__group grid gap-1"
              aria-labelledby={`${id}-${index}`}
            >
              <Day
                className="kg-activity-feed__day m-0 flex items-center gap-3 py-1 text-kg-xs font-semibold tracking-[0.02em] text-kg-fg-muted after:h-px after:flex-1 after:bg-kg-border after:content-['']"
                id={`${id}-${index}`}
              >
                {Number.isNaN(group.date.getTime()) ? group.key : dayLabel(group.date)}
              </Day>
              {list(group.items)}
            </section>
          ))
        ) : (
          list([...items])
        )}
      </div>
    )
  },
)

ActivityFeed.displayName = "ActivityFeed"
