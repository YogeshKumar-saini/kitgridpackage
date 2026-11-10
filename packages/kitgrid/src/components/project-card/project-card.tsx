import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { cx } from "../../utils/cx.js"
import { hueFromString } from "../avatar/avatar-utils.js"

export type ProjectCardState = "ready" | "building" | "error" | "queued" | "canceled"

export interface ProjectCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  name: string
  /** Production URL, without protocol, e.g. "revenue.northwind.app". */
  domain?: string
  /** Makes the name a link to the project. */
  href?: string
  icon?: ReactNode
  state?: ProjectCardState
  /** Last deploy commit message. */
  commit?: ReactNode
  branch?: ReactNode
  /** e.g. "12m ago". */
  updated?: ReactNode
  /** Trailing slot, e.g. a menu button. */
  actions?: ReactNode
  labels?: Partial<Record<ProjectCardState, string>>
}

const papers = [
  "bg-kg-paper-sage",
  "bg-kg-paper-peach",
  "bg-kg-paper-sky",
  "bg-kg-paper-butter",
  "bg-kg-paper-rose",
]

const dotClass: Record<ProjectCardState, string> = {
  ready: "bg-kg-success",
  building: cx(
    "animate-spin border-[1.5px] border-kg-warning border-e-transparent [animation-duration:0.9s]",
    "motion-reduce:[animation-duration:2.4s] [[data-kg-motion=reduce]_&]:[animation-duration:2.4s]",
  ),
  error: "bg-kg-danger",
  queued: "bg-kg-fg-faint",
  canceled: "bg-kg-fg-faint",
}

const stateWords: Record<ProjectCardState, string> = {
  ready: "Ready",
  building: "Building",
  error: "Error",
  queued: "Queued",
  canceled: "Canceled",
}

/** A project tile for a dashboard home: identity, domain, and the last deploy. Server-safe. */
export const ProjectCard = forwardRef<HTMLElement, ProjectCardProps>(
  (
    { name, domain, href, icon, state, commit, branch, updated, actions, labels, className, ...props },
    ref,
  ) => {
    const nameId = useId()
    const words = { ...stateWords, ...labels }
    return (
      <article
        ref={ref}
        aria-labelledby={nameId}
        className={cx(
          /* Paper Layers: a white sheet; a linked card lifts on hover and the whole sheet is the hit area. */
          "kg-project-card relative grid min-w-0 gap-3 p-4",
          "rounded-kg-xl border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-sm",
          "transition-[translate,box-shadow] duration-(--kg-duration-base) ease-kg-out motion-reduce:transition-none",
          "data-linked:hover:-translate-y-0.5 data-linked:hover:shadow-kg-md",
          String.raw`has-[.kg-project-card\_\_link:focus-visible]:outline-2 has-[.kg-project-card\_\_link:focus-visible]:outline-offset-2 has-[.kg-project-card\_\_link:focus-visible]:outline-kg-ring`,
          className,
        )}
        data-state={state}
        data-linked={href ? "" : undefined}
        {...props}
      >
        <header className="kg-project-card__head flex min-w-0 items-center gap-3">
          <span
            className={cx(
              "kg-project-card__icon grid size-9 shrink-0 place-items-center rounded-full border-2 border-kg-ink",
              "text-kg-sm font-bold uppercase text-kg-fg [&_svg]:size-4.5",
              papers[hueFromString(name) % papers.length],
            )}
            aria-hidden="true"
          >
            {icon ?? name.trim()[0]}
          </span>
          <div className="kg-project-card__who grid min-w-0 flex-1">
            <h3 id={nameId} className="kg-project-card__name m-0 truncate text-kg-sm font-semibold text-kg-fg">
              {href ? (
                <a
                  className="kg-project-card__link text-inherit no-underline outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-['']"
                  href={href}
                >
                  {name}
                </a>
              ) : (
                name
              )}
            </h3>
            {domain && <span className="kg-project-card__domain truncate text-kg-xs text-kg-fg-muted">{domain}</span>}
          </div>
          {actions != null && <div className="kg-project-card__actions relative z-1 shrink-0">{actions}</div>}
        </header>
        {(commit != null || state) && (
          <div className="kg-project-card__deploy grid gap-1 rounded-kg-md bg-kg-surface-sunken px-3 py-2.5">
            {state && (
              <span
                className="kg-project-card__state inline-flex items-center gap-1.5 text-kg-xs font-semibold text-kg-fg"
                data-state={state}
              >
                <span
                  className={cx("kg-project-card__dot size-2 rounded-full", dotClass[state])}
                  aria-hidden="true"
                />
                {words[state]}
              </span>
            )}
            {commit != null && <span className="kg-project-card__commit truncate text-kg-xs text-kg-fg-muted">{commit}</span>}
          </div>
        )}
        {(branch != null || updated != null) && (
          <footer className="kg-project-card__foot flex items-center justify-between gap-2 text-kg-xs text-kg-fg-muted">
            {branch != null && (
              <span className="kg-project-card__branch inline-flex min-w-0 items-center gap-1.25 truncate font-kg-mono [&_svg]:size-3.5 [&_svg]:shrink-0">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="4.5" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="4.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="11.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M4.5 5v6M11.5 7c0 2.5-3 2.5-7 4" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                {branch}
              </span>
            )}
            {updated != null && <span className="kg-project-card__updated">{updated}</span>}
          </footer>
        )}
      </article>
    )
  },
)

ProjectCard.displayName = "ProjectCard"
