import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export interface GettingStartedCardsItem {
  id: string
  title: ReactNode
  /** One short line. */
  description?: ReactNode
  icon?: ReactNode
  /** Makes the whole card a link. */
  href?: string
  /** A short trailing hint such as "2 min". */
  meta?: ReactNode
  done?: boolean
}

export interface GettingStartedCardsProps extends HTMLAttributes<HTMLUListElement> {
  items: readonly GettingStartedCardsItem[]
  doneLabel?: string
}

/* Paper Layers: each step is a white sheet; linked steps lift off their ink offset on hover. */
const cardClass = cx(
  "kg-getting-started-cards__card group/card relative flex min-h-36 flex-col gap-1.5 p-4 text-inherit no-underline",
  "rounded-kg-xl border-2 border-kg-ink bg-kg-surface shadow-kg-sm",
  "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out motion-reduce:transition-none",
)

const linkClass = cx(
  cardClass,
  "cursor-pointer hover:-translate-0.5 hover:shadow-kg-md active:translate-0 active:shadow-kg-xs",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
)

/** Next-step cards for an empty workspace, numbered on an orbit and linking out. Server-safe. */
export const GettingStartedCards = forwardRef<HTMLUListElement, GettingStartedCardsProps>(
  ({ items, doneLabel = "Done", className, ...props }, ref) => (
    <ul ref={ref} className={cx(
        "kg-getting-started-cards m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3 p-0",
        className,
      )} {...props}>
      {items.map((item, index) => {
        const content = (
          <>
            <span
              className={cx(
                "kg-getting-started-cards__badge mb-2 grid size-8 place-items-center rounded-full border-2 border-kg-ink",
                "bg-kg-paper-butter text-kg-xs font-bold text-kg-fg [&_svg]:size-4",
                "group-data-done/item:bg-kg-success group-data-done/item:text-kg-success-fg",
              )}
              aria-hidden="true"
            >
              {item.icon ?? index + 1}
            </span>
            <span className="kg-getting-started-cards__title text-kg-sm font-semibold text-kg-fg">{item.title}</span>
            {item.description != null && (
              <span className="kg-getting-started-cards__description text-kg-xs leading-normal text-kg-fg-muted">{item.description}</span>
            )}
            <span className="kg-getting-started-cards__foot mt-auto flex items-center justify-between gap-2 pt-2">
              {item.done ? (
                <span className="kg-getting-started-cards__done rounded-full bg-kg-success px-2 text-kg-xs leading-5 font-semibold text-kg-success-fg">{doneLabel}</span>
              ) : (
                item.meta != null && (
                  <span className="kg-getting-started-cards__meta text-kg-xs text-kg-fg-muted">{item.meta}</span>
                )
              )}
              {item.href && (
                <svg
                  className={cx(
                    "kg-getting-started-cards__arrow ms-auto size-4 text-kg-fg-muted",
                    "transition-[translate,color] duration-(--kg-duration-base) ease-kg-out motion-reduce:transition-none",
                    "group-hover/card:translate-x-[3px] group-hover/card:text-kg-fg",
                  )}
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M3.5 8h9m-3.5-3.5L12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </>
        )
        return (
          <li
            key={item.id}
            className="kg-getting-started-cards__item group/item grid"
            data-done={item.done || undefined}
          >
            {item.href ? (
              <a className={linkClass} href={item.href}>
                {content}
              </a>
            ) : (
              <div className={cardClass}>{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  ),
)

GettingStartedCards.displayName = "GettingStartedCards"
