import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export type ShipmentTimelineTone = "default" | "success" | "warning" | "danger"

export interface ShipmentTimelineEvent {
  id: string
  /** What happened, e.g. "Arrived at sort facility". */
  title: ReactNode
  location?: ReactNode
  /** Machine-readable timestamp for `<time dateTime>`. */
  dateTime?: string
  /** Display timestamp, e.g. "Oct 21, 14:05". */
  time?: ReactNode
  tone?: ShipmentTimelineTone
}

export interface ShipmentTimelineProps extends HTMLAttributes<HTMLDivElement> {
  /** Newest first. The first event is styled as the latest. */
  events: readonly ShipmentTimelineEvent[]
  carrier?: ReactNode
  trackingNumber?: ReactNode
  /** Link to the carrier page, applied to the tracking number. */
  trackingHref?: string
  labels?: { list?: string; latest?: string }
}

const toneClass: Record<ShipmentTimelineTone, string> = {
  default: "bg-kg-fg-faint",
  success: "bg-kg-success",
  warning: "bg-kg-warning",
  danger: "bg-kg-danger",
}

/** Carrier scan history, newest first, with the latest event emphasised. */
export const ShipmentTimeline = forwardRef<HTMLDivElement, ShipmentTimelineProps>(
  (
    { events, carrier, trackingNumber, trackingHref, labels, className, ...props },
    ref,
  ) => {
    const listLabel = labels?.list ?? "Shipment history"
    const latestLabel = labels?.latest ?? "Latest"
    return (
      <div ref={ref} className={cx("kg-shipment-timeline grid gap-4 text-kg-fg", className)} {...props}>
        {(carrier != null || trackingNumber != null) && (
          <div className="kg-shipment-timeline__head flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-kg-border pb-3">
            {carrier != null && (
              <span className="kg-shipment-timeline__carrier text-kg-sm font-[650]">{carrier}</span>
            )}
            {trackingNumber != null &&
              (trackingHref ? (
                <a
                  className="kg-shipment-timeline__tracking rounded-kg-xs font-kg-mono text-kg-xs text-kg-accent-strong underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
                  href={trackingHref}
                >
                  {trackingNumber}
                </a>
              ) : (
                <span className="kg-shipment-timeline__tracking font-kg-mono text-kg-xs text-kg-fg-muted">
                  {trackingNumber}
                </span>
              ))}
          </div>
        )}
        <ol className="kg-shipment-timeline__list m-0 list-none p-0" aria-label={listLabel}>
          {events.map((event, index) => {
            const latest = index === 0
            const tone = event.tone ?? "default"
            const dotTone = latest && tone === "default" ? "bg-kg-accent" : toneClass[tone]
            return (
              <li
                key={event.id}
                className="kg-shipment-timeline__event relative grid grid-cols-[1.25rem_1fr] gap-3 pb-5 not-last:before:absolute not-last:before:top-[1.1rem] not-last:before:bottom-[0.15rem] not-last:before:start-[calc(0.625rem-1px)] not-last:before:w-0.5 not-last:before:rounded-full not-last:before:bg-kg-border-strong not-last:before:content-['']"
                data-latest={latest || undefined}
                data-tone={tone}
              >
                <span
                  className={`kg-shipment-timeline__dot justify-self-center rounded-full ${dotTone} ${
                    latest
                      ? "mt-[0.2rem] size-3.5 border-2 border-kg-ink shadow-kg-xs"
                      : "mt-[0.3rem] size-2.5"
                  }`}
                  aria-hidden="true"
                />
                <div className="kg-shipment-timeline__body grid min-w-0 gap-0.5">
                  <p
                    className={`kg-shipment-timeline__title m-0 text-kg-sm ${
                      latest ? "font-[650] text-kg-fg" : "font-[550] text-kg-fg-muted"
                    }`}
                  >
                    {latest && <span className="kg-visually-hidden">{latestLabel}: </span>}
                    {event.title}
                  </p>
                  {(event.location != null || event.time != null) && (
                    <p className="kg-shipment-timeline__meta m-0 text-kg-xs text-kg-fg-muted tabular-nums">
                      {event.location}
                      {event.location != null && event.time != null && " · "}
                      {event.time != null && (
                        <time className="kg-shipment-timeline__time" dateTime={event.dateTime}>
                          {event.time}
                        </time>
                      )}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    )
  },
)

ShipmentTimeline.displayName = "ShipmentTimeline"
