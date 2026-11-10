import { forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { Avatar, type AvatarSize } from "../avatar/avatar.js"

export type PresenceAvatarsState = "active" | "idle" | "away"

export interface PresenceAvatarsPerson {
  id: string
  name: string
  avatar?: string
  state?: PresenceAvatarsState
  /** Where they are, e.g. "Editing Revenue". */
  location?: string
}

export interface PresenceAvatarsProps extends HTMLAttributes<HTMLDivElement> {
  people: readonly PresenceAvatarsPerson[]
  /** Faces shown before the "+N" chip. */
  max?: number
  size?: Extract<AvatarSize, "xs" | "sm" | "md">
  labels?: Partial<Record<PresenceAvatarsState, string>>
  /** Names the group. Defaults to "N people here". */
  "aria-label"?: string
}

const stateWords: Record<PresenceAvatarsState, string> = {
  active: "active",
  idle: "idle",
  away: "away",
}

const rootVariants = variants({
  base: "kg-presence-avatars inline-flex",
  variants: {
    size: {
      xs: "[--_overlap:-0.375rem] [--_size:1.5rem]",
      sm: "[--_overlap:-0.5rem] [--_size:2rem]",
      md: "[--_overlap:-0.625rem] [--_size:2.5rem]",
    },
  },
  defaults: { size: "sm" },
})

const faceClass =
  "relative grid ms-(--_overlap) rounded-full shadow-[0_0_0_2px_var(--kg-bg)] first:ms-0"

/* An active person carries a breathing ping; idle and away sit still. */
const liveVariants = variants({
  base: [
    "kg-presence-avatars__live absolute -end-px -bottom-px size-[calc(var(--_size)*0.3)] min-h-2 min-w-2 rounded-full",
    "shadow-[0_0_0_2px_var(--kg-bg)]",
  ],
  variants: {
    state: {
      active: [
        "bg-kg-success after:absolute after:inset-0 after:rounded-[inherit] after:bg-inherit after:opacity-60 after:content-['']",
        "after:animate-ping after:[animation-duration:2.4s] motion-reduce:after:hidden in-data-[kg-motion=reduce]:after:hidden",
      ],
      idle: "bg-kg-warning",
      away: "border-2 border-kg-fg-muted bg-kg-surface",
    },
  },
})

/**
 * Who else is viewing: overlapping faces with a live ring for the active ones and a +N chip.
 * Every face carries its name and state as text. Server-safe.
 */
export const PresenceAvatars = forwardRef<HTMLDivElement, PresenceAvatarsProps>(
  (
    {
      people,
      max = 4,
      size = "sm",
      labels,
      className,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const words = { ...stateWords, ...labels }
    const shown = people.slice(0, max)
    const rest = people.slice(max)

    return (
      <div
        ref={ref}
        role="group"
        aria-label={
          ariaLabel ??
          `${people.length} ${people.length === 1 ? "person" : "people"} here`
        }
        className={rootVariants({ size, className })}
        data-size={size}
        {...props}
      >
        <ul className="kg-presence-avatars__list m-0 flex list-none items-center p-0">
          {shown.map((person, index) => {
            const state = person.state ?? "active"
            const description = [person.name, words[state], person.location]
              .filter(Boolean)
              .join(", ")
            return (
              <li
                key={person.id}
                className={cx(
                  "kg-presence-avatars__person",
                  faceClass,
                  "transition-[translate] duration-(--kg-duration-base) ease-kg-spring hover:z-10! hover:-translate-y-0.5",
                )}
                data-state={state}
                title={description}
                style={{ zIndex: shown.length - index }}
              >
                <Avatar
                  size={size}
                  name={person.name}
                  src={person.avatar}
                  className={state === "active" ? undefined : "opacity-70 grayscale-70"}
                  aria-hidden="true"
                />
                <span className={liveVariants({ state })} aria-hidden="true" />
                <span className="kg-visually-hidden">{description}</span>
              </li>
            )
          })}
          {rest.length > 0 && (
            <li
              className={cx(
                "kg-presence-avatars__more size-(--_size) place-items-center border-2 border-kg-ink bg-kg-paper-butter text-[0.6875rem] font-bold text-kg-fg",
                faceClass,
              )}
              title={rest.map((person) => person.name).join(", ")}
            >
              <span aria-hidden="true">+{rest.length}</span>
              <span className="kg-visually-hidden">
                and {rest.length} more: {rest.map((person) => person.name).join(", ")}
              </span>
            </li>
          )}
        </ul>
      </div>
    )
  },
)

PresenceAvatars.displayName = "PresenceAvatars"
