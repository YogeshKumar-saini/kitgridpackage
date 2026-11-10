"use client"

import {
  type CSSProperties,
  type FormEvent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useId,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"

export interface PollOption {
  id: string
  label: string
  votes: number
}

export interface PollLabels {
  vote?: string
  /** Under the results, receiving the total. */
  total?: (total: number) => string
  yours?: string
}

export interface PollProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "defaultValue" | "onChange"
> {
  question: ReactNode
  options: readonly PollOption[]
  /**
   * The option this person voted for; set it to show results. When controlled, `votes` should
   * already include this vote. Uncontrolled, the component adds it.
   */
  value?: string | null
  defaultValue?: string | null
  onVote?: (id: string) => void
  /** Show results without voting, e.g. after the poll closes. */
  closed?: boolean
  labels?: PollLabels
}

const words = {
  vote: "Vote",
  total: (total: number) =>
    `${new Intl.NumberFormat().format(total)} ${total === 1 ? "vote" : "votes"}`,
  yours: "Your vote",
}

/** A single-choice poll: radios and a Vote button, then animated result bars. */
export const Poll = forwardRef<HTMLElement, PollProps>(
  (
    {
      question,
      options,
      value: valueProp,
      defaultValue = null,
      onVote,
      closed = false,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const t = { ...words, ...labels }
    const baseId = useId()
    const [voted, setVoted] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: (next) => {
        if (next != null) onVote?.(next)
      },
    })
    const [choice, setChoice] = useState<string | null>(null)
    const showResults = closed || voted != null

    const counted = options.map((option) => ({
      ...option,
      votes: option.votes + (option.id === voted && valueProp === undefined ? 1 : 0),
    }))
    const total = counted.reduce((sum, option) => sum + option.votes, 0)
    const top = Math.max(...counted.map((option) => option.votes), 0)

    const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (choice) setVoted(choice)
    }

    return (
      <section
        ref={ref}
        aria-labelledby={`${baseId}-q`}
        className={cx(
          "kg-poll grid min-w-0 gap-3 rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-4 text-kg-fg shadow-kg-sm",
          className,
        )}
        data-state={showResults ? "results" : "voting"}
        {...props}
      >
        <h3
          id={`${baseId}-q`}
          className="kg-poll__question m-0 text-kg-base leading-[1.4] font-bold text-kg-fg"
        >
          {question}
        </h3>
        {showResults ? (
          <>
            <ul className="kg-poll__results m-0 grid list-none gap-1.5 p-0">
              {counted.map((option) => {
                const share = total > 0 ? option.votes / total : 0
                const pct = Math.round(share * 100)
                const yours = option.id === voted
                const leading = option.votes === top && top > 0
                return (
                  <li
                    key={option.id}
                    className={cx(
                      "kg-poll__result relative isolate flex items-center justify-between gap-3 overflow-hidden rounded-kg-md border-2 border-kg-ink px-3 py-2.25 text-kg-sm",
                      yours && "shadow-kg-xs",
                    )}
                    data-yours={yours || undefined}
                    data-leading={leading || undefined}
                    style={{ "--_share": share } as CSSProperties}
                  >
                    <span
                      className={cx(
                        "kg-poll__bar absolute inset-0 -z-1 origin-left scale-x-(--_share) rtl:origin-right",
                        "transition-[scale] duration-[var(--kg-duration-slower)] ease-kg-out starting:scale-x-0 motion-reduce:transition-none",
                        leading ? "bg-kg-paper-sage" : "bg-kg-muted",
                      )}
                      aria-hidden="true"
                    />
                    <span className="kg-poll__label inline-flex min-w-0 flex-wrap items-center gap-2 text-kg-fg">
                      {option.label}
                      {yours && (
                        <span className="kg-poll__yours rounded-full bg-kg-accent px-1.5 text-[0.6875rem] leading-4 font-semibold text-kg-accent-fg">
                          {t.yours}
                        </span>
                      )}
                    </span>
                    <span className="kg-poll__pct font-bold tabular-nums text-kg-fg">
                      {pct}%
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="kg-poll__total m-0 text-kg-xs text-kg-fg-muted" role="status">
              {t.total(total)}
            </p>
          </>
        ) : (
          <form
            className="kg-poll__form grid justify-items-start gap-3"
            onSubmit={submit}
          >
            <fieldset
              className="kg-poll__options m-0 grid w-full min-w-0 gap-1.5 border-0 p-0"
              aria-labelledby={`${baseId}-q`}
            >
              {options.map((option) => (
                <label
                  key={option.id}
                  className={cx(
                    "kg-poll__option group/option relative flex cursor-pointer items-center gap-2.5 rounded-kg-md border-2 border-kg-ink bg-kg-surface px-3 py-2.25 text-kg-sm text-kg-fg",
                    "transition-[background-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out not-has-checked:hover:bg-kg-muted has-checked:bg-kg-paper-sage has-checked:shadow-kg-xs",
                    "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-kg-ring",
                  )}
                >
                  <input
                    type="radio"
                    className="pointer-events-none absolute opacity-0"
                    name={`${baseId}-poll`}
                    value={option.id}
                    checked={choice === option.id}
                    onChange={() => setChoice(option.id)}
                  />
                  <span
                    className="kg-poll__radio size-4 shrink-0 rounded-full border-2 border-kg-ink bg-kg-surface transition-[border-width] duration-(--kg-duration-base) ease-kg-spring group-has-checked/option:border-[5px]"
                    aria-hidden="true"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
            <Button type="submit" size="sm" disabled={!choice}>
              {t.vote}
            </Button>
          </form>
        )}
      </section>
    )
  },
)

Poll.displayName = "Poll"
