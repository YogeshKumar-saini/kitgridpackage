import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { Avatar } from "../avatar/avatar.js"

export type AuditLogTone = "neutral" | "create" | "change" | "delete" | "security"

export interface AuditLogEntry {
  id: string
  actor: string
  avatar?: string
  /** A verb phrase: "invited", "changed the role of". */
  action: ReactNode
  /** What was acted on, drawn as a mono chip. */
  target?: ReactNode
  /** Display time, e.g. "14:32". */
  time: ReactNode
  dateTime?: string
  /** A quiet trailing detail, such as an IP or location. */
  meta?: ReactNode
  tone?: AuditLogTone
}

export interface AuditLogGroup {
  id: string
  /** Day heading, e.g. "Today". */
  label: ReactNode
  entries: readonly AuditLogEntry[]
}

/* A short tone tick on the leading edge marks what kind of event it was. */
const entryVariants = variants({
  base: [
    "kg-audit-log__entry relative grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-kg-md py-2 ps-3 pe-2",
    "hover:bg-kg-muted",
    "before:absolute before:inset-y-[30%] before:start-0 before:w-[3px] before:rounded-full before:bg-(--_tone) before:content-['']",
  ],
  variants: {
    tone: {
      neutral: "[--_tone:var(--kg-ink)]",
      create: "[--_tone:var(--kg-success)]",
      change: "[--_tone:var(--kg-info)]",
      delete: "[--_tone:var(--kg-danger)]",
      security: "[--_tone:var(--kg-warning)]",
    },
  },
  defaults: { tone: "neutral" },
})

export interface AuditLogProps extends HTMLAttributes<HTMLDivElement> {
  groups: readonly AuditLogGroup[]
  /** Heading level for the day labels. */
  headingLevel?: 3 | 4 | 5
}

/** Who did what, when: security and admin events grouped by day. Server-safe. */
export const AuditLog = forwardRef<HTMLDivElement, AuditLogProps>(
  ({ groups, headingLevel = 3, className, ...props }, ref) => {
    const baseId = useId()
    const Heading = `h${headingLevel}` as "h3"
    return (
      <div
        ref={ref}
        className={cx("kg-audit-log @container grid min-w-0 gap-5", className)}
        {...props}
      >
        {groups.map((group) => {
          const headingId = `${baseId}-${group.id}`
          return (
            <section
              key={group.id}
              className="kg-audit-log__group grid gap-1.5"
              aria-labelledby={headingId}
            >
              <Heading
                id={headingId}
                className="kg-audit-log__day sticky top-0 z-1 m-0 bg-kg-bg py-1 text-kg-xs font-semibold text-kg-fg-muted"
              >
                {group.label}
              </Heading>
              <ol className="kg-audit-log__list m-0 grid list-none p-0">
                {group.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className={entryVariants({ tone: entry.tone ?? "neutral" })}
                    data-tone={entry.tone ?? "neutral"}
                  >
                    <Avatar
                      className="kg-audit-log__avatar"
                      size="xs"
                      name={entry.actor}
                      src={entry.avatar}
                      aria-hidden="true"
                    />
                    <p className="kg-audit-log__text m-0 min-w-0 truncate text-kg-sm text-kg-fg-muted @max-[30rem]:whitespace-normal [&_strong]:font-semibold [&_strong]:text-kg-fg">
                      <strong>{entry.actor}</strong> {entry.action}
                      {entry.target != null && (
                        <>
                          {" "}
                          <code className="kg-audit-log__target rounded-kg-xs bg-kg-paper-sky px-1.5 py-px font-kg-mono text-[0.75rem] text-kg-fg">
                            {entry.target}
                          </code>
                        </>
                      )}
                    </p>
                    {entry.meta != null && (
                      <span className="kg-audit-log__meta font-kg-mono text-kg-xs whitespace-nowrap text-kg-fg-faint @max-[30rem]:hidden">
                        {entry.meta}
                      </span>
                    )}
                    <time
                      className="kg-audit-log__time min-w-[3rem] text-end text-kg-xs tabular-nums text-kg-fg-faint"
                      dateTime={entry.dateTime}
                    >
                      {entry.time}
                    </time>
                  </li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>
    )
  },
)

AuditLog.displayName = "AuditLog"
