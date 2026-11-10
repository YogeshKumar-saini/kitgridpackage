import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: a draining ring in the state's tone. The card is a white sheet with an ink edge;
 * --kg-trial-left is registered in trial-countdown.css so the ring can ease between values.
 */
export const trialCountdownVariants = variants({
  base: [
    "kg-trial-countdown flex items-center gap-3 min-w-0 [--kg-trial-left:var(--_left,0)]",
    "transition-[--kg-trial-left] duration-(--kg-duration-slower) ease-kg-out",
  ],
  variants: {
    variant: {
      card: "p-3 text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-lg shadow-kg-sm",
      inline: "",
    },
    state: {
      active: "[--_tone:var(--kg-accent)]",
      urgent: "[--_tone:var(--kg-warning)]",
      ended: "[--_tone:var(--kg-danger)]",
    },
  },
  defaults: { variant: "card", state: "active" },
})

export type TrialCountdownVariant = NonNullable<
  VariantProps<typeof trialCountdownVariants>["variant"]
>

export interface TrialCountdownProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Days remaining. Pass a computed number so server and client render the same thing. */
  daysLeft: number
  /** Trial length, for the ring. */
  totalDays: number
  /** Plan being trialled, e.g. "Pro". */
  plan?: ReactNode
  /** Usually an upgrade button. */
  action?: ReactNode
  variant?: TrialCountdownVariant
  formatLeft?: (days: number) => string
  /** Days left at which the ring turns amber. */
  urgentAt?: number
}

const defaultLeft = (days: number) =>
  days <= 0 ? "Trial ended" : `${days} ${days === 1 ? "day" : "days"} left`

/** Time left on a trial as a draining ring, with room for an upgrade action. Server-safe. */
export const TrialCountdown = forwardRef<HTMLDivElement, TrialCountdownProps>(
  (
    {
      daysLeft,
      totalDays,
      plan,
      action,
      variant = "card",
      formatLeft = defaultLeft,
      urgentAt = 3,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const left = Math.max(Math.round(daysLeft), 0)
    const fraction = totalDays > 0 ? Math.min(left / totalDays, 1) : 0
    const state = left <= 0 ? "ended" : left <= urgentAt ? "urgent" : "active"
    return (
      <div
        ref={ref}
        className={trialCountdownVariants({ variant, state, className })}
        data-variant={variant}
        data-state={state}
        style={{ "--_left": fraction, ...style } as CSSProperties}
        {...props}
      >
        <span
          className={cx(
            "kg-trial-countdown__ring relative grid shrink-0 place-items-center size-[2.25rem]",
            "before:absolute before:inset-0 before:rounded-full",
            "before:bg-[conic-gradient(var(--_tone)_calc(var(--kg-trial-left)*1turn),var(--kg-muted)_0)]",
            "before:[mask:radial-gradient(circle,transparent_60%,var(--kg-fg)_62%)]",
          )}
          aria-hidden="true"
        >
          <span className="kg-trial-countdown__number relative text-kg-sm font-bold tabular-nums text-kg-fg">
            {left}
          </span>
        </span>
        <div className="kg-trial-countdown__text grid flex-1 min-w-0 leading-[1.3]">
          {plan != null && (
            <span className="kg-trial-countdown__plan text-kg-xs font-[560] text-kg-fg-muted">
              {plan}
            </span>
          )}
          <span className="kg-trial-countdown__left text-kg-sm font-[620] text-kg-fg">
            {formatLeft(left)}
          </span>
        </div>
        {action != null && <div className="kg-trial-countdown__action shrink-0">{action}</div>}
      </div>
    )
  },
)

TrialCountdown.displayName = "TrialCountdown"
