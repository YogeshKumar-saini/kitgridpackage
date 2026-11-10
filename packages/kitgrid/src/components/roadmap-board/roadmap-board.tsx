import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type RoadmapBoardStage = "now" | "next" | "later"

export interface RoadmapBoardItem {
  id: string
  title: ReactNode
  stage: RoadmapBoardStage
  /** A short area tag such as "Exports". */
  tag?: ReactNode
  /** Upvotes, shown as a count. */
  votes?: number
  href?: string
}

export interface RoadmapBoardProps extends HTMLAttributes<HTMLDivElement> {
  items: readonly RoadmapBoardItem[]
  labels?: Partial<Record<RoadmapBoardStage, string>>
  /** Heading level for the column titles. */
  headingLevel?: 2 | 3 | 4
  votesLabel?: (votes: number) => string
}

const stages: RoadmapBoardStage[] = ["now", "next", "later"]
const stageWords: Record<RoadmapBoardStage, string> = { now: "Now", next: "Next", later: "Later" }

/* Paper Layers: each column is a sheet of tinted paper holding white, ink-edged cards. */
const columnVariants = variants({
  base: "kg-roadmap-board__column grid min-w-0 content-start gap-2.5 rounded-kg-xl p-3",
  variants: {
    stage: {
      now: "bg-kg-paper-sage",
      next: "bg-kg-paper-sky",
      later: "bg-kg-paper-butter",
    },
  },
})

/* Now is a full disc, next a half, later an outline: the stage reads without colour. */
const glyphVariants = variants({
  base: "kg-roadmap-board__glyph relative size-[0.75rem] shrink-0 overflow-hidden rounded-full border-2 border-kg-ink",
  variants: {
    stage: {
      now: "bg-kg-ink",
      next: "before:absolute before:inset-y-0 before:start-0 before:w-1/2 before:bg-kg-ink",
      later: "",
    },
  },
})

const card = "kg-roadmap-board__card grid gap-2 rounded-kg-lg border-2 border-kg-ink bg-kg-surface p-3 text-inherit no-underline shadow-kg-xs"

const linkCard = cx(
  card,
  "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "hover:-translate-px hover:shadow-kg-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
)

/** A public roadmap in three columns: now, next, later. Server-safe. */
export const RoadmapBoard = forwardRef<HTMLDivElement, RoadmapBoardProps>(
  (
    {
      items,
      labels,
      headingLevel = 3,
      votesLabel = (votes) => `${votes} ${votes === 1 ? "vote" : "votes"}`,
      className,
      ...props
    },
    ref,
  ) => {
    const baseId = useId()
    const words = { ...stageWords, ...labels }
    const Heading = `h${headingLevel}` as "h3"
    return (
      <div ref={ref} className={cx("kg-roadmap-board @container min-w-0", className)} {...props}>
        <div className="kg-roadmap-board__grid grid grid-cols-3 gap-3 @max-[40rem]:grid-cols-1">
          {stages.map((stage) => {
            const column = items.filter((item) => item.stage === stage)
            const headingId = `${baseId}-${stage}`
            return (
              <section
                key={stage}
                className={columnVariants({ stage })}
                data-stage={stage}
                aria-labelledby={headingId}
              >
                <Heading
                  id={headingId}
                  className="kg-roadmap-board__heading m-0 flex items-center gap-2 px-1 text-kg-sm font-[640] text-kg-fg"
                >
                  <span className={glyphVariants({ stage })} aria-hidden="true" />
                  {words[stage]}
                  <span
                    className="kg-roadmap-board__count ms-auto text-kg-xs font-medium tabular-nums text-kg-fg"
                    aria-hidden="true"
                  >
                    {column.length}
                  </span>
                </Heading>
                <ul className="kg-roadmap-board__list m-0 grid list-none gap-2 p-0 [&>li]:grid">
                  {column.map((item) => {
                    const body = (
                      <>
                        <span className="kg-roadmap-board__title text-kg-sm font-[540] leading-[1.4] text-kg-fg">
                          {item.title}
                        </span>
                        {(item.tag != null || item.votes != null) && (
                          <span className="kg-roadmap-board__meta flex items-center justify-between gap-2">
                            {item.tag != null && (
                              <span className="kg-roadmap-board__tag rounded-full bg-kg-paper-peach px-1.75 text-[0.6875rem] leading-[1.25rem] text-kg-fg">
                                {item.tag}
                              </span>
                            )}
                            {item.votes != null && (
                              <span className="kg-roadmap-board__votes ms-auto inline-flex items-center gap-[0.125rem] text-kg-xs font-semibold tabular-nums text-kg-fg-muted [&_svg]:size-[0.875rem]">
                                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                  <path d="m4 10 4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span aria-hidden="true">{item.votes}</span>
                                <span className="kg-visually-hidden">{votesLabel(item.votes)}</span>
                              </span>
                            )}
                          </span>
                        )}
                      </>
                    )
                    return (
                      <li key={item.id}>
                        {item.href ? (
                          <a className={linkCard} href={item.href}>
                            {body}
                          </a>
                        ) : (
                          <div className={card}>{body}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    )
  },
)

RoadmapBoard.displayName = "RoadmapBoard"
