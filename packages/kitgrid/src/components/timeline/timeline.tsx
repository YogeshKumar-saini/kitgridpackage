import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export type TimelineOrientation = "vertical" | "horizontal"
export type TimelineAlign = "start" | "alternate"
export type TimelineStatus = "done" | "current" | "upcoming"
export type TimelineTone = "accent" | "neutral" | "success" | "warning" | "danger" | "info"

export interface TimelineItem {
  title: ReactNode
  description?: ReactNode
  /** Shown as the item's timestamp. Pass a `<time>` for machine-readable dates. */
  time?: ReactNode
  /** Replaces the dot with an icon. */
  icon?: ReactNode
  status?: TimelineStatus
  tone?: TimelineTone
  key?: string
}

export interface TimelineLabels {
  /** Read after the title of the current item. */
  current?: string
}

export interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  items: TimelineItem[]
  orientation?: TimelineOrientation
  /** `alternate` places items on both sides of the line (vertical only). */
  align?: TimelineAlign
  labels?: TimelineLabels
}

const tones: Record<TimelineTone, string> = {
  accent: "[--_tone:var(--kg-accent)]",
  neutral: "[--_tone:var(--kg-fg-faint)]",
  success: "[--_tone:var(--kg-success)]",
  warning: "[--_tone:var(--kg-warning)]",
  danger: "[--_tone:var(--kg-danger)]",
  info: "[--_tone:var(--kg-info)]",
}

const connector =
  "not-last:before:absolute not-last:before:rounded-[1px] not-last:before:bg-kg-ink/25 data-[status=done]:not-last:before:bg-(--_tone)"

const layouts = {
  start: {
    item: `grid-cols-[var(--_marker)_minmax(0,1fr)] pb-6 last:pb-0 ${connector} before:start-[calc(var(--_marker)/2-1px)] before:top-[calc(var(--_marker)+0.25rem)] before:bottom-1 before:w-0.5`,
    marker: "",
    body: "pt-[calc((var(--_marker)-1.35em)/2)]",
  },
  alternate: {
    item: `grid-cols-[minmax(0,1fr)_var(--_marker)_minmax(0,1fr)] pb-6 last:pb-0 ${connector} before:start-[calc(50%-1px)] before:top-[calc(var(--_marker)+0.25rem)] before:bottom-1 before:w-0.5`,
    marker: "col-start-2 row-start-1",
    body: "pt-[calc((var(--_marker)-1.35em)/2)]",
  },
  horizontal: {
    item: `grid-cols-1 grid-rows-[var(--_marker)_auto] gap-y-2.5 pe-4 ${connector} before:start-[calc(var(--_marker)+0.25rem)] before:end-1 before:top-[calc(var(--_marker)/2-1px)] before:h-0.5`,
    marker: "",
    body: "",
  },
}

/**
 * Ordered events along a line, with done, current and upcoming states. Server-safe.
 * Paper Layers: done steps are solid dots on a toned rule, the current step sits in an ink-edged
 * disc, upcoming steps are hollow.
 */
export const Timeline = forwardRef<HTMLOListElement, TimelineProps>(
  (
    { items, orientation = "vertical", align = "start", labels, className, ...props },
    ref,
  ) => {
    const resolvedAlign = orientation === "vertical" ? align : "start"
    const layout = layouts[orientation === "horizontal" ? "horizontal" : resolvedAlign]
    return (
      <ol
        ref={ref}
        className={cx(
          "kg-timeline m-0 grid list-none p-0 [--_dot:0.625rem] [--_marker:1.5rem]",
          orientation === "horizontal" && "auto-cols-[minmax(8rem,1fr)] grid-flow-col overflow-x-auto",
          className,
        )}
        data-orientation={orientation}
        data-align={resolvedAlign}
        {...props}
      >
        {items.map((item, index) => {
          const status = item.status ?? "done"
          const tone = item.tone ?? (status === "upcoming" ? "neutral" : "accent")
          const even = index % 2 === 1
          return (
            <li
              key={item.key ?? index}
              className={cx("kg-timeline__item relative grid gap-x-3", tones[tone], layout.item)}
              data-status={status}
              data-tone={tone}
              aria-current={status === "current" ? "step" : undefined}
            >
              <span
                className={cx(
                  "kg-timeline__marker relative grid size-(--_marker) place-items-center rounded-full [&_svg]:size-[0.8125rem]",
                  layout.marker,
                  item.icon
                    ? "border-2 border-(--_tone) bg-kg-surface text-kg-fg"
                    : "after:size-(--_dot) after:rounded-full",
                  !item.icon &&
                    (status === "upcoming"
                      ? "after:bg-kg-surface after:inset-ring-2 after:inset-ring-kg-ink"
                      : "after:bg-(--_tone)"),
                  status === "current"
                    ? item.icon
                      ? "shadow-kg-xs"
                      : "border-2 border-kg-ink bg-kg-surface shadow-kg-xs"
                    : !item.icon && "after:shadow-[0_0_0_3px_var(--kg-surface)]",
                )}
                data-icon={item.icon ? true : undefined}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <div
                className={cx(
                  "kg-timeline__body grid min-w-0 gap-[0.1875rem]",
                  layout.body,
                  resolvedAlign === "alternate" &&
                    (even ? "col-start-1 row-start-1 text-end" : "col-start-3"),
                )}
              >
                {item.time != null && (
                  <div className="kg-timeline__time text-kg-xs text-kg-fg-faint tabular-nums">
                    {item.time}
                  </div>
                )}
                <div
                  className={`kg-timeline__title text-kg-base leading-[1.35] ${
                    status === "upcoming" ? "font-medium text-kg-fg-muted" : "font-semibold text-kg-fg"
                  }`}
                >
                  {item.title}
                  {status === "current" && (
                    <span className="kg-timeline__sr sr-only">{`, ${labels?.current ?? "current"}`}</span>
                  )}
                </div>
                {item.description != null && (
                  <div className="kg-timeline__description text-kg-sm leading-normal text-kg-fg-muted">
                    {item.description}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    )
  },
)
Timeline.displayName = "Timeline"
