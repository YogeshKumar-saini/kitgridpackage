"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useId,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"

export interface OnboardingChecklistStep {
  id: string
  label: ReactNode
  done?: boolean
  /** One short line shown when the step is open. */
  description?: ReactNode
  /** Shown when the step is open, usually a Button. */
  action?: ReactNode
}

export interface OnboardingChecklistProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode
  steps: readonly OnboardingChecklistStep[]
  /** Adds a close button that hides the checklist. */
  onDismiss?: () => void
  dismissLabel?: string
  /** "2 of 5" style progress text. */
  formatProgress?: (done: number, total: number) => string
  doneLabel?: string
}

const Check = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="m4 8.4 2.6 2.6L12 5.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * A setup checklist with a progress ring. The first unfinished step starts open; each step is a
 * disclosure, so its detail and action stay one keypress away.
 */
export const OnboardingChecklist = forwardRef<HTMLElement, OnboardingChecklistProps>(
  (
    {
      title = "Get set up",
      steps,
      onDismiss,
      dismissLabel = "Dismiss checklist",
      formatProgress = (done, total) => `${done} of ${total}`,
      doneLabel = "done",
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const baseId = useId()
    const done = steps.filter((step) => step.done).length
    const firstOpen = steps.find((step) => !step.done)?.id
    const [openId, setOpenId] = useState<string | undefined>(firstOpen)
    const fraction = steps.length ? done / steps.length : 0
    const complete = done === steps.length

    return (
      <section
        ref={ref}
        aria-labelledby={`${baseId}-title`}
        className={cx(
          "kg-onboarding-checklist grid min-w-0 gap-3 rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-4 shadow-kg-sm",
          className,
        )}
        data-complete={complete || undefined}
        style={{ "--_progress": fraction, ...style } as CSSProperties}
        {...props}
      >
        <header className="kg-onboarding-checklist__head flex items-center gap-3">
          <span
            className="kg-onboarding-checklist__ring size-[2.25rem] shrink-0"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={done}
            aria-valuetext={formatProgress(done, steps.length)}
            aria-labelledby={`${baseId}-title`}
          >
            <svg viewBox="0 0 36 36" fill="none" aria-hidden="true" className="block size-full -rotate-90">
              <circle cx="18" cy="18" r="14" strokeWidth="6" className="stroke-kg-muted" />
              <circle
                cx="18"
                cy="18"
                r="14"
                strokeWidth="6"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={100 - fraction * 100}
                className={complete ? "stroke-kg-success" : "stroke-kg-accent"}
              />
            </svg>
          </span>
          <div className="kg-onboarding-checklist__heading grid min-w-0 flex-1">
            <h3
              id={`${baseId}-title`}
              className="kg-onboarding-checklist__title m-0 text-kg-base font-[640] text-kg-fg"
            >
              {title}
            </h3>
            <span
              className="kg-onboarding-checklist__progress text-kg-xs tabular-nums text-kg-fg-muted"
              aria-hidden="true"
            >
              {formatProgress(done, steps.length)}
            </span>
          </div>
          {onDismiss && (
            <button
              type="button"
              className={cx(
                "kg-onboarding-checklist__dismiss grid size-[1.75rem] cursor-pointer place-items-center rounded-kg-sm border-0 bg-transparent p-0 text-kg-fg-faint [&_svg]:size-[1rem]",
                "interactive:hover:bg-kg-muted interactive:hover:text-kg-fg",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
              )}
              aria-label={dismissLabel}
              onClick={onDismiss}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="m4.5 4.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </header>
        <ol className="kg-onboarding-checklist__steps m-0 grid list-none gap-px p-0">
          {steps.map((step, index) => {
            const open = openId === step.id
            const hasDetail = step.description != null || step.action != null
            const expanded = open && hasDetail
            const panelId = `${baseId}-${step.id}`
            return (
              <li
                key={step.id}
                className={cx(
                  "kg-onboarding-checklist__step rounded-kg-md transition-[background-color] duration-(--kg-duration-base) ease-kg-out",
                  expanded && "bg-kg-surface-sunken",
                )}
                data-done={step.done || undefined}
                data-state={expanded ? "open" : "closed"}
              >
                <button
                  type="button"
                  className={cx(
                    "kg-onboarding-checklist__toggle flex w-full cursor-pointer items-center gap-2.5 rounded-[inherit] border-0 bg-transparent p-2",
                    "text-start text-kg-sm text-kg-fg [font-family:inherit]",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
                  )}
                  aria-expanded={hasDetail ? open : undefined}
                  aria-controls={hasDetail ? panelId : undefined}
                  onClick={() => setOpenId(open ? undefined : step.id)}
                >
                  <span
                    className={cx(
                      "kg-onboarding-checklist__mark grid size-[1.375rem] shrink-0 place-items-center rounded-full border-2 text-[0.6875rem] font-[650] [&_svg]:size-[0.875rem]",
                      step.done
                        ? "animate-[kg-onboarding-turn_var(--kg-duration-spring)_var(--kg-ease-spring)] border-kg-ink bg-kg-success text-kg-success-fg"
                        : expanded
                          ? "border-kg-ink bg-kg-accent text-kg-accent-fg"
                          : "border-kg-border-strong text-kg-fg-muted",
                    )}
                    aria-hidden="true"
                  >
                    {step.done ? <Check /> : index + 1}
                  </span>
                  <span
                    className={cx(
                      "kg-onboarding-checklist__label min-w-0 flex-1 font-[540]",
                      step.done && "text-kg-fg-muted line-through decoration-kg-fg-faint",
                    )}
                  >
                    {step.label}
                    {step.done && <span className="kg-visually-hidden">, {doneLabel}</span>}
                  </span>
                </button>
                {hasDetail && (
                  <div
                    id={panelId}
                    className={cx(
                      "kg-onboarding-checklist__panel grid",
                      expanded
                        ? "visible grid-rows-[1fr] opacity-100 [transition:grid-template-rows_var(--kg-duration-slow)_var(--kg-ease-spring),opacity_var(--kg-duration-base)_var(--kg-ease-out),visibility_0s]"
                        : "invisible grid-rows-[0fr] opacity-0 [transition:grid-template-rows_var(--kg-duration-base)_var(--kg-ease-out),opacity_var(--kg-duration-fast)_var(--kg-ease-out),visibility_0s_linear_var(--kg-duration-base)]",
                    )}
                  >
                    <div
                      className={cx(
                        "kg-onboarding-checklist__panel-inner grid min-h-0 justify-items-start gap-2.5 overflow-hidden ps-10.5 pe-3",
                        expanded && "pb-3",
                      )}
                    >
                      {step.description != null && (
                        <p className="kg-onboarding-checklist__description m-0 text-kg-xs text-kg-fg-muted">
                          {step.description}
                        </p>
                      )}
                      {step.action}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    )
  },
)

OnboardingChecklist.displayName = "OnboardingChecklist"
