"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useMemo,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { Popover, PopoverContent, PopoverTrigger } from "../popover/popover.js"

export interface ReactionsBarReaction {
  /** The reaction's key, and its glyph when no icon is given. */
  emoji: string
  /** Drawn instead of the emoji, e.g. a lucide icon. */
  icon?: ReactNode
  /** Spoken name, e.g. "thumbs up". */
  label: string
  count: number
  /** Whether the current person has reacted with it. */
  reacted?: boolean
}

export interface ReactionsBarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onToggle"
> {
  reactions: readonly ReactionsBarReaction[]
  /** Called with the emoji and whether it is now on. */
  onToggle?: (emoji: string, reacted: boolean) => void
  /** Emoji offered by the add button. Omit to hide it. */
  choices?: readonly Pick<ReactionsBarReaction, "emoji" | "label" | "icon">[]
  addLabel?: string
  /** Names the group, e.g. "Reactions". */
  "aria-label"?: string
}

/* Paper Layers: each reaction is a small ink-edged chip that lifts on hover; pressed ones are ink. */
const chipVariants = variants({
  base: [
    "inline-flex h-7 cursor-pointer items-center rounded-full border-2 border-kg-ink font-[inherit] text-kg-xs font-semibold",
    "transition-[translate,box-shadow,background-color,color] duration-(--kg-duration-fast) ease-kg-out",
    "interactive:hover:-translate-px interactive:hover:shadow-kg-xs interactive:active:translate-0 interactive:active:shadow-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  ],
  variants: {
    kind: {
      pill: [
        "kg-reactions-bar__pill gap-1.25 px-2.25",
        "bg-kg-surface text-kg-fg-muted aria-pressed:bg-kg-accent aria-pressed:text-kg-accent-fg",
      ],
      add: [
        "kg-reactions-bar__add w-7 justify-center border-dashed bg-kg-surface p-0 text-kg-fg-faint [&_svg]:size-4",
        "interactive:hover:border-solid interactive:hover:text-kg-fg data-[state=open]:border-solid data-[state=open]:text-kg-fg",
      ],
    },
  },
})

interface Local {
  count: number
  reacted: boolean
}

/** Emoji counts under a comment or update. Each pill is a toggle; the add button picks more. */
export const ReactionsBar = forwardRef<HTMLDivElement, ReactionsBarProps>(
  (
    {
      reactions,
      onToggle,
      choices,
      addLabel = "Add reaction",
      className,
      "aria-label": ariaLabel = "Reactions",
      ...props
    },
    ref,
  ) => {
    const [local, setLocal] = useState<Record<string, Local>>({})
    const [open, setOpen] = useState(false)

    const list = useMemo(() => {
      const merged = reactions.map((reaction) => ({
        ...reaction,
        reacted: reaction.reacted ?? false,
        ...local[reaction.emoji],
      }))
      for (const [emoji, state] of Object.entries(local)) {
        if (merged.some((reaction) => reaction.emoji === emoji)) continue
        const choice = choices?.find((item) => item.emoji === emoji)
        if (choice) merged.push({ ...choice, ...state })
      }
      return merged.filter((reaction) => reaction.count > 0)
    }, [reactions, local, choices])

    const toggle = (emoji: string) => {
      const current = list.find((reaction) => reaction.emoji === emoji)
      const reacted = !(current?.reacted ?? false)
      const count = Math.max((current?.count ?? 0) + (reacted ? 1 : -1), 0)
      setLocal((prev) => ({ ...prev, [emoji]: { count, reacted } }))
      onToggle?.(emoji, reacted)
    }

    return (
      <div
        ref={ref}
        role="group"
        aria-label={ariaLabel}
        className={cx(
          "kg-reactions-bar flex flex-wrap items-center gap-1.5",
          className,
        )}
        {...props}
      >
        {list.map((reaction) => (
          <button
            key={reaction.emoji}
            type="button"
            className={chipVariants({ kind: "pill" })}
            aria-pressed={reaction.reacted}
            aria-label={`${reaction.label}, ${reaction.count}`}
            onClick={() => toggle(reaction.emoji)}
          >
            <span
              className={cx(
                "kg-reactions-bar__emoji inline-flex text-[0.9375rem] leading-none [&_svg]:size-3.5",
                reaction.reacted &&
                  "animate-[kg-reaction-pop_var(--kg-duration-base)_var(--kg-ease-out)] motion-reduce:animate-none",
              )}
              aria-hidden="true"
            >
              {reaction.icon ?? reaction.emoji}
            </span>
            <span
              key={reaction.count}
              className="kg-reactions-bar__count inline-block min-w-[0.75ch] tabular-nums transition-[opacity,translate] duration-(--kg-duration-base) ease-kg-out starting:-translate-y-[40%] starting:opacity-0 motion-reduce:transition-none"
              aria-hidden="true"
            >
              {reaction.count}
            </span>
          </button>
        ))}
        {choices && choices.length > 0 && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              className={chipVariants({ kind: "add" })}
              aria-label={addLabel}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M6.8 11.6a2.6 2.6 0 0 0 4.4 0"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M7 8.2v.1M11 8.2v.1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M16 2.5v4M14 4.5h4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </PopoverTrigger>
            <PopoverContent
              className="kg-reactions-bar__picker flex gap-0.5 [--_popover-pad:calc(var(--kg-space)*1.5)] [--_popover-radius:var(--kg-radius-full)]"
              aria-label={addLabel}
              side="top"
              align="start"
            >
              {choices.map((choice) => (
                <button
                  key={choice.emoji}
                  type="button"
                  className={cx(
                    "kg-reactions-bar__choice grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-[1.125rem] text-kg-fg-muted [&_svg]:size-[1.125rem]",
                    "transition-[translate,scale,background-color,color] duration-(--kg-duration-base) ease-kg-out",
                    "interactive:hover:-translate-y-px interactive:hover:scale-108 interactive:hover:bg-kg-paper-butter interactive:hover:text-kg-fg",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
                  )}
                  aria-label={choice.label}
                  onClick={() => {
                    const existing = list.find(
                      (reaction) => reaction.emoji === choice.emoji,
                    )
                    if (!existing?.reacted) toggle(choice.emoji)
                    setOpen(false)
                  }}
                >
                  <span aria-hidden="true">{choice.icon ?? choice.emoji}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
    )
  },
)

ReactionsBar.displayName = "ReactionsBar"
