"use client"

import { forwardRef, type ReactNode, useMemo, useState } from "react"
import { useRovingFocus } from "../../hooks/use-roving-focus.js"
import { cx } from "../../utils/cx.js"
import { Avatar } from "../avatar/avatar.js"
import {
  Popover,
  PopoverContent,
  type PopoverContentProps,
  PopoverTrigger,
} from "../popover/popover.js"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs/tabs.js"

export interface NotificationCenterItem {
  id: string
  title: ReactNode
  /** One short line under the title. */
  body?: ReactNode
  /** Display time, e.g. "4m". */
  time?: ReactNode
  read?: boolean
  /** Who it is from: drawn as an avatar. */
  actor?: string
  avatar?: string
  /** Replaces the avatar, e.g. a status icon. */
  icon?: ReactNode
}

export interface NotificationCenterLabels {
  trigger?: string
  title?: string
  all?: string
  unread?: string
  markAll?: string
  empty?: string
  /** Read after an unread item's title. */
  unreadItem?: string
  /** Trigger name with the count, e.g. "Notifications, 3 unread". */
  count?: (count: number) => string
}

export interface NotificationCenterProps extends Omit<
  PopoverContentProps,
  "onSelect" | "children"
> {
  notifications: readonly NotificationCenterItem[]
  /** Called when an item is opened; it is marked read first. */
  onSelect?: (item: NotificationCenterItem) => void
  onRead?: (id: string) => void
  onReadAll?: () => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Custom trigger content. Defaults to a bell. */
  icon?: ReactNode
  labels?: NotificationCenterLabels
  /** Classes for the trigger button. */
  triggerClassName?: string
}

const words: Required<Omit<NotificationCenterLabels, "count">> = {
  trigger: "Notifications",
  title: "Notifications",
  all: "All",
  unread: "Unread",
  markAll: "Mark all read",
  empty: "You're all caught up",
  unreadItem: "unread",
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"

/* Paper Layers: the bell is a quiet round control that turns into a sage sheet while open. */
const triggerClass = [
  "kg-notification-center__trigger relative inline-grid h-kg-md w-(--kg-control-md) cursor-pointer place-items-center rounded-full border-2 p-0",
  "transition-[color,background-color,border-color] duration-(--kg-duration-fast) ease-kg-out",
  "border-transparent bg-transparent text-kg-fg-muted interactive:hover:text-kg-fg interactive:hover:not-data-[state=open]:bg-kg-muted",
  "data-[state=open]:border-kg-ink data-[state=open]:bg-kg-paper-sage data-[state=open]:text-kg-fg",
  "[&>svg]:size-[1.125rem] [&>svg]:origin-[50%_10%]",
  "data-unread:[&>svg]:animate-[kg-notification-swing_var(--kg-duration-bounce)_var(--kg-ease-out)_1] motion-reduce:[&>svg]:animate-none",
  focusRing,
]

const Bell = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path
      d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z"
      strokeLinejoin="round"
    />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" strokeLinecap="round" />
  </svg>
)

/**
 * A bell that opens a non-modal panel of notifications with All and Unread views. Opening an
 * item marks it read; the header can clear everything at once.
 */
export const NotificationCenter = forwardRef<HTMLDivElement, NotificationCenterProps>(
  (
    {
      notifications,
      onSelect,
      onRead,
      onReadAll,
      open,
      defaultOpen,
      onOpenChange,
      icon,
      labels,
      triggerClassName,
      className,
      align = "end",
      ...props
    },
    ref,
  ) => {
    const t = { ...words, ...labels }
    const [marked, setMarked] = useState<ReadonlySet<string>>(() => new Set())
    const [view, setView] = useState("all")
    const onKeyDown = useRovingFocus({ orientation: "vertical" })

    const items = useMemo(
      () =>
        notifications.map((item) => ({
          ...item,
          read: item.read || marked.has(item.id),
        })),
      [notifications, marked],
    )
    const unread = items.filter((item) => !item.read).length
    const visible = view === "unread" ? items.filter((item) => !item.read) : items

    const markRead = (id: string) => {
      setMarked((prev) => new Set(prev).add(id))
      onRead?.(id)
    }

    const markAll = () => {
      setMarked(new Set(notifications.map((item) => item.id)))
      onReadAll?.()
    }

    const count =
      labels?.count ?? ((n: number) => `${t.trigger}, ${n} ${t.unread.toLowerCase()}`)

    const list = () =>
      visible.length === 0 ? (
        <p className="kg-notification-center__empty m-0 px-4 py-10 text-center text-kg-sm text-kg-fg-muted">
          {t.empty}
        </p>
      ) : (
        <ul
          className="kg-notification-center__list m-0 grid max-h-[22rem] list-none overflow-y-auto overscroll-contain p-1.5"
          onKeyDown={onKeyDown}
        >
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cx(
                  "kg-notification-center__item relative grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3",
                  "rounded-kg-md border-0 bg-transparent py-2.5 ps-2.5 pe-5 text-start font-[inherit] [color:inherit]",
                  "transition-[background-color] duration-(--kg-duration-fast) ease-kg-out interactive:hover:bg-kg-muted",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
                )}
                data-read={item.read || undefined}
                data-kg-item=""
                onClick={() => {
                  if (!item.read) markRead(item.id)
                  onSelect?.(item)
                }}
              >
                <span
                  className="kg-notification-center__media grid size-8 place-items-center text-kg-fg-muted [&>svg]:size-[1.125rem]"
                  aria-hidden="true"
                >
                  {item.icon ?? (
                    <Avatar size="sm" name={item.actor} src={item.avatar} />
                  )}
                </span>
                <span className="kg-notification-center__text grid min-w-0 gap-0.5">
                  <span
                    className={cx(
                      "kg-notification-center__item-title text-kg-sm leading-[1.35]",
                      item.read
                        ? "font-normal text-kg-fg-muted"
                        : "font-semibold text-kg-fg",
                    )}
                  >
                    {item.title}
                    {!item.read && (
                      <span className="kg-visually-hidden">, {t.unreadItem}</span>
                    )}
                  </span>
                  {item.body != null && (
                    <span className="kg-notification-center__body truncate text-kg-xs text-kg-fg-muted">
                      {item.body}
                    </span>
                  )}
                </span>
                {item.time != null && (
                  <span className="kg-notification-center__time text-kg-xs whitespace-nowrap tabular-nums text-kg-fg-faint">
                    {item.time}
                  </span>
                )}
                <span
                  className={cx(
                    "kg-notification-center__dot absolute end-2 top-1/2 size-[0.4375rem] -translate-y-1/2 rounded-full bg-kg-accent",
                    "transition-[opacity,scale] duration-(--kg-duration-base) ease-kg-spring",
                    item.read && "scale-0 opacity-0",
                  )}
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )

    return (
      <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger
          className={cx(triggerClass, triggerClassName)}
          aria-label={unread > 0 ? count(unread) : t.trigger}
          data-unread={unread > 0 || undefined}
        >
          {icon ?? <Bell />}
          {unread > 0 && (
            <span
              className="kg-notification-center__count absolute end-0.5 top-1 h-4 min-w-4 rounded-full bg-kg-accent px-1 text-center text-[0.625rem] leading-4 font-bold tabular-nums text-kg-accent-fg shadow-[0_0_0_2px_var(--kg-bg)]"
              aria-hidden="true"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent
          ref={ref}
          align={align}
          aria-label={t.title}
          className={cx(
            "kg-notification-center grid overflow-hidden [--_popover-width:min(23rem,calc(100vw-1rem))] [--_popover-pad:0px]",
            className,
          )}
          {...props}
        >
          <div className="kg-notification-center__head flex items-center justify-between gap-3 px-4 pt-3 pb-1">
            <span className="kg-notification-center__title text-kg-sm font-bold text-kg-fg">
              {t.title}
            </span>
            <button
              type="button"
              className={cx(
                "kg-notification-center__mark-all cursor-pointer rounded-full border-0 bg-transparent px-2 py-1 font-[inherit] text-kg-xs font-semibold",
                "text-kg-accent-strong interactive:hover:bg-kg-paper-sage interactive:hover:text-kg-fg disabled:cursor-default disabled:text-kg-fg-faint",
                focusRing,
              )}
              disabled={unread === 0}
              onClick={markAll}
            >
              {t.markAll}
            </button>
          </div>
          <Tabs
            value={view}
            onValueChange={setView}
            className="kg-notification-center__tabs px-2"
          >
            <TabsList variant="underline" aria-label={t.title}>
              <TabsTrigger value="all">{t.all}</TabsTrigger>
              <TabsTrigger value="unread">
                {t.unread}
                {unread > 0 && (
                  <span className="kg-notification-center__tab-count ms-1.5 rounded-full bg-kg-paper-butter px-[0.3125rem] text-[0.625rem] leading-4 font-bold text-kg-fg">
                    {unread}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            {(["all", "unread"] as const).map((tab) => (
              <TabsContent
                key={tab}
                value={tab}
                className="kg-notification-center__panel -mx-2 -mt-3"
              >
                {list()}
              </TabsContent>
            ))}
          </Tabs>
        </PopoverContent>
      </Popover>
    )
  },
)

NotificationCenter.displayName = "NotificationCenter"
