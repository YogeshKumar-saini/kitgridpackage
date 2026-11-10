import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export interface LeaderboardItem {
  id?: string
  name: ReactNode
  value: number
  /** Leading media such as an avatar. */
  avatar?: ReactNode
  /** Places moved since the last period: positive is up. */
  movement?: number
  /** Secondary line under the name. */
  detail?: ReactNode
}

export interface LeaderboardLabels {
  up?: (places: number) => string
  down?: (places: number) => string
  rank?: (rank: number) => string
}

export interface LeaderboardProps extends HTMLAttributes<HTMLOListElement> {
  items: LeaderboardItem[]
  format?: (value: number) => string
  /** Sorts by value, highest first. Off keeps the given order. */
  sort?: boolean
  /** Highlights the row with this id, e.g. the current user. */
  highlightId?: string
  /** Shows a proportional bar behind each row. */
  bars?: boolean
  labels?: LeaderboardLabels
}

/* Paper Layers: the podium ranks sit on butter, sky and peach paper chips with an ink edge. */
const podium: Record<number, string> = {
  1: "border-2 border-kg-ink bg-kg-paper-butter text-kg-fg shadow-kg-xs",
  2: "border-2 border-kg-ink bg-kg-paper-sky text-kg-fg shadow-kg-xs",
  3: "border-2 border-kg-ink bg-kg-paper-peach text-kg-fg shadow-kg-xs",
}

const defaultFormat = (n: number) => new Intl.NumberFormat("en-US").format(n)

/** A ranked list with value bars, podium rings for the top three and movement markers. */
export const Leaderboard = forwardRef<HTMLOListElement, LeaderboardProps>(
  (
    {
      items,
      format = defaultFormat,
      sort = true,
      highlightId,
      bars = true,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const words = {
      up: (n: number) => `up ${n}`,
      down: (n: number) => `down ${n}`,
      rank: (n: number) => `Rank ${n}`,
      ...labels,
    }
    const rows = sort ? [...items].sort((a, b) => b.value - a.value) : items
    const max = Math.max(...rows.map((row) => row.value), 1e-9)
    return (
      <ol ref={ref} className={cx("kg-leaderboard m-0 grid list-none gap-1 p-0 text-kg-base", className)} {...props}>
        {rows.map((row, index) => {
          const rank = index + 1
          const move = row.movement ?? 0
          const mine = row.id !== undefined && row.id === highlightId
          return (
            <li
              key={row.id ?? index}
              className={cx(
                "kg-leaderboard__row relative isolate flex min-h-12 items-center gap-3 rounded-kg-lg px-3 py-2 [--_size:0]",
                "before:absolute before:inset-0 before:-z-1 before:origin-left before:scale-x-(--_size) before:rounded-[inherit] before:transition-transform before:duration-(--kg-duration-slower) before:ease-kg-spring rtl:before:origin-right",
                mine ? "inset-ring-2 inset-ring-kg-ink before:bg-kg-accent-soft" : "before:bg-kg-muted",
              )}
              data-rank={rank <= 3 ? rank : undefined}
              data-highlight={mine || undefined}
              aria-current={mine || undefined}
              style={bars ? ({ "--_size": Math.max(0, row.value) / max } as CSSProperties) : undefined}
            >
              <span className={`kg-leaderboard__rank inline-grid size-7 flex-none place-items-center rounded-full text-kg-xs font-bold tabular-nums ${podium[rank] ?? "text-kg-fg-muted"}`}>
                <span className="kg-leaderboard__sr sr-only">{words.rank(rank)}</span>
                <span aria-hidden="true">{rank}</span>
              </span>
              {row.avatar && (
                <span className="kg-leaderboard__avatar inline-flex flex-none [&>img]:size-8 [&>img]:rounded-full [&>img]:object-cover" aria-hidden="true">
                  {row.avatar}
                </span>
              )}
              <span className="kg-leaderboard__who grid min-w-0 flex-1">
                <span className="kg-leaderboard__name overflow-hidden font-semibold text-ellipsis whitespace-nowrap text-kg-fg">{row.name}</span>
                {row.detail != null && <span className={`kg-leaderboard__detail text-kg-xs ${mine ? "text-kg-fg-muted" : "text-kg-fg-faint"}`}>{row.detail}</span>}
              </span>
              {move !== 0 && (
                <span className="kg-leaderboard__move inline-flex items-center gap-px text-kg-xs font-semibold tabular-nums data-[trend=down]:text-[color-mix(in_oklab,var(--kg-danger)_80%,var(--kg-fg))] data-[trend=up]:text-[color-mix(in_oklab,var(--kg-success)_80%,var(--kg-fg))] [&_svg]:size-3.5" data-trend={move > 0 ? "up" : "down"}>
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d={move > 0 ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span aria-hidden="true">{Math.abs(move)}</span>
                  <span className="kg-leaderboard__sr sr-only">
                    {move > 0 ? words.up(move) : words.down(-move)}
                  </span>
                </span>
              )}
              <span className="kg-leaderboard__value min-w-14 text-end font-bold tabular-nums text-kg-fg">{format(row.value)}</span>
            </li>
          )
        })}
      </ol>
    )
  },
)
Leaderboard.displayName = "Leaderboard"
