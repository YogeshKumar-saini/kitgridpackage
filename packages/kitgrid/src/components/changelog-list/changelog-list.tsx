import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type ChangelogListKind = "new" | "improved" | "fixed" | "removed"

export interface ChangelogListEntry {
  id: string
  /** Display date, e.g. "Oct 21". */
  date: ReactNode
  dateTime?: string
  version?: ReactNode
  title: ReactNode
  /** One or two short lines. */
  body?: ReactNode
  kinds?: readonly ChangelogListKind[]
  href?: string
}

export interface ChangelogListProps extends HTMLAttributes<HTMLOListElement> {
  entries: readonly ChangelogListEntry[]
  labels?: Partial<Record<ChangelogListKind, string>>
}

const kindWords: Record<ChangelogListKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
  removed: "Removed",
}

/* Paper Layers: change kinds are paper tags; "new" is the ink one so the headline change reads first. */
const kindVariants = variants({
  base: "kg-changelog-list__kind rounded-full px-2 text-[0.6875rem] font-semibold leading-[1.25rem]",
  variants: {
    kind: {
      new: "bg-kg-accent text-kg-accent-fg",
      improved: "bg-kg-paper-sky text-kg-fg",
      fixed: "bg-kg-paper-sage text-kg-fg",
      removed: "bg-kg-paper-rose text-kg-fg",
    },
  },
})

/** Product updates, newest first, with the date on a rail and typed change tags. Server-safe. */
export const ChangelogList = forwardRef<HTMLOListElement, ChangelogListProps>(
  ({ entries, labels, className, ...props }, ref) => {
    const words = { ...kindWords, ...labels }
    return (
      <ol
        ref={ref}
        className={cx("kg-changelog-list @container m-0 grid min-w-0 list-none p-0", className)}
        {...props}
      >
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={cx(
              "kg-changelog-list__entry group/entry relative grid grid-cols-[6.5rem_1rem_minmax(0,1fr)] gap-x-3 pb-7 last:pb-0",
              "before:absolute before:top-[1.25rem] before:bottom-0 before:start-[calc(6.5rem+var(--kg-space)*3+0.5rem-1px)] before:w-[2px] before:bg-kg-border-strong last:before:content-none",
              "@max-[30rem]:grid-cols-[1rem_minmax(0,1fr)] @max-[30rem]:before:start-[calc(0.5rem-1px)]",
            )}
          >
            <div
              className={cx(
                "kg-changelog-list__when grid content-start justify-items-end gap-[0.125rem] pt-[0.125rem] text-kg-xs tabular-nums text-kg-fg-muted",
                "@max-[30rem]:col-start-2 @max-[30rem]:row-start-1 @max-[30rem]:mb-1 @max-[30rem]:flex @max-[30rem]:justify-items-start @max-[30rem]:gap-2",
              )}
            >
              <time dateTime={entry.dateTime}>{entry.date}</time>
              {entry.version != null && (
                <span className="kg-changelog-list__version font-kg-mono text-[0.6875rem] text-kg-fg-faint">
                  {entry.version}
                </span>
              )}
            </div>
            <span
              className={cx(
                "kg-changelog-list__node relative z-1 mt-[0.25rem] size-[0.75rem] justify-self-center rounded-full border-2 border-kg-ink bg-kg-surface",
                "group-first/entry:bg-kg-accent group-first/entry:shadow-kg-xs",
                "@max-[30rem]:col-start-1 @max-[30rem]:row-start-1",
              )}
              aria-hidden="true"
            />
            <article className="kg-changelog-list__body grid min-w-0 gap-1.5 @max-[30rem]:col-start-2">
              {entry.kinds && entry.kinds.length > 0 && (
                <ul className="kg-changelog-list__kinds m-0 flex list-none flex-wrap gap-1.5 p-0">
                  {entry.kinds.map((kind) => (
                    <li key={kind} className={kindVariants({ kind })} data-kind={kind}>
                      {words[kind]}
                    </li>
                  ))}
                </ul>
              )}
              <h3 className="kg-changelog-list__title m-0 text-kg-md font-[640] tracking-[-0.01em] text-kg-fg">
                {entry.href ? (
                  <a
                    href={entry.href}
                    className="rounded-[2px] text-inherit no-underline decoration-2 underline-offset-[0.2em] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
                  >
                    {entry.title}
                  </a>
                ) : (
                  entry.title
                )}
              </h3>
              {entry.body != null && (
                <p className="kg-changelog-list__text m-0 max-w-[62ch] text-kg-sm leading-[1.55] text-kg-fg-muted">
                  {entry.body}
                </p>
              )}
            </article>
          </li>
        ))}
      </ol>
    )
  },
)

ChangelogList.displayName = "ChangelogList"
