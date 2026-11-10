import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export type IncidentTimelineStage = "investigating" | "identified" | "monitoring" | "resolved"

export interface IncidentTimelineUpdate {
  id: string
  stage: IncidentTimelineStage
  /** Display time, e.g. "14:32 UTC". */
  time: ReactNode
  /** Machine-readable time for the <time> element. */
  dateTime?: string
  message: ReactNode
}

export interface IncidentTimelineProps extends HTMLAttributes<HTMLOListElement> {
  /** Newest first, as status pages publish them. */
  updates: readonly IncidentTimelineUpdate[]
  labels?: Partial<Record<IncidentTimelineStage, string>>
}

const stageWords: Record<IncidentTimelineStage, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
}

/* Paper Layers: earlier updates are paper-tinted discs; the latest fills with its status and lifts. */
const paperNode: Record<IncidentTimelineStage, string> = {
  investigating: "bg-kg-paper-rose",
  identified: "bg-kg-paper-butter",
  monitoring: "bg-kg-paper-sky",
  resolved: "bg-kg-paper-sage",
}

const latestNode: Record<IncidentTimelineStage, string> = {
  investigating: "bg-kg-danger shadow-kg-xs",
  identified: "bg-kg-warning shadow-kg-xs",
  monitoring: "bg-kg-info shadow-kg-xs",
  resolved: "bg-kg-success shadow-kg-xs",
}

/** The updates posted for one incident, newest first, on a single rail. Server-safe. */
export const IncidentTimeline = forwardRef<HTMLOListElement, IncidentTimelineProps>(
  ({ updates, labels, className, ...props }, ref) => {
    const words = { ...stageWords, ...labels }
    return (
      <ol ref={ref} className={cx("kg-incident-timeline m-0 grid list-none p-0", className)} {...props}>
        {updates.map((update, index) => (
          <li
            key={update.id}
            className={cx(
              "kg-incident-timeline__item relative grid gap-1 ps-7 pb-5 last:pb-0",
              "before:absolute before:top-[1.125rem] before:bottom-0 before:start-[calc(0.4375rem-1px)] before:w-[2px] before:bg-kg-border-strong last:before:content-none",
            )}
            data-stage={update.stage}
            data-latest={index === 0 || undefined}
          >
            <span
              className={cx(
                "kg-incident-timeline__node absolute start-0 top-[0.25rem] size-[0.875rem] rounded-full border-2 border-kg-ink",
                index === 0 ? latestNode[update.stage] : paperNode[update.stage],
              )}
              aria-hidden="true"
            />
            <div className="kg-incident-timeline__head flex flex-wrap items-baseline gap-2">
              <span className="kg-incident-timeline__stage text-kg-sm font-[620] text-kg-fg">
                {words[update.stage]}
              </span>
              <time
                className="kg-incident-timeline__time text-kg-xs tabular-nums text-kg-fg-faint"
                dateTime={update.dateTime}
              >
                {update.time}
              </time>
            </div>
            <div className="kg-incident-timeline__message max-w-[60ch] text-kg-sm leading-[1.55] text-kg-fg-muted">
              {update.message}
            </div>
          </li>
        ))}
      </ol>
    )
  },
)

IncidentTimeline.displayName = "IncidentTimeline"
