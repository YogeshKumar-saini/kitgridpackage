import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"

export type CheckoutStepsOrientation = "horizontal" | "vertical"
export type CheckoutStepState = "complete" | "current" | "upcoming"
/** `auto` switches to "Step 2 of 4" when the steps no longer fit their container. */
export type CheckoutStepsCompact = "auto" | boolean

export interface CheckoutStep {
  id: string
  label: ReactNode
  description?: ReactNode
}

export interface CheckoutStepsLabels {
  /** Names the navigation landmark. */
  nav?: string
  /** Appended to completed steps for screen readers. */
  complete?: string
  /** The compact summary. */
  summary?: (position: number, total: number) => string
}

export interface CheckoutStepsProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "onChange"
> {
  steps: readonly CheckoutStep[]
  /** Id of the current step. Steps before it are complete. */
  current: string
  /** Makes completed steps buttons that navigate back. */
  onStepClick?: (id: string, index: number) => void
  orientation?: CheckoutStepsOrientation
  compact?: CheckoutStepsCompact
  labels?: CheckoutStepsLabels
}

const defaultLabels: Required<CheckoutStepsLabels> = {
  nav: "Checkout progress",
  complete: "completed",
  summary: (position, total) => `Step ${position} of ${total}`,
}

const Check = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    aria-hidden="true"
  >
    <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

type StepState = "complete" | "current" | "upcoming"

const markerState: Record<StepState, string> = {
  complete: "bg-kg-accent text-kg-accent-fg",
  current: "bg-kg-paper-sage text-kg-fg shadow-kg-xs",
  upcoming: "bg-kg-surface text-kg-fg-muted",
}

const itemClass =
  "kg-checkout-steps__item inline-flex max-w-full shrink-0 items-center gap-2.5 rounded-kg-md border-0 bg-transparent p-1 text-start font-[inherit] text-inherit"

/** A checkout progress stepper with animated connectors and a compact mobile summary. */
export const CheckoutSteps = forwardRef<HTMLElement, CheckoutStepsProps>(
  (
    {
      steps,
      current,
      onStepClick,
      orientation = "horizontal",
      compact = "auto",
      labels,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const found = steps.findIndex((step) => step.id === current)
    const active = found === -1 ? 0 : found
    const currentStep = steps[active]
    const progress = steps.length > 1 ? active / (steps.length - 1) : 1
    const vertical = orientation === "vertical"
    const summaryShown =
      compact === true
        ? "grid"
        : compact === "auto" && !vertical
          ? "hidden @max-[34rem]:grid"
          : "hidden"
    const listShown =
      compact === true ? "hidden" : compact === "auto" && !vertical ? "flex @max-[34rem]:hidden" : "flex"

    return (
      <nav
        ref={ref}
        aria-label={text.nav}
        className={cx("kg-checkout-steps @container text-kg-fg", className)}
        data-orientation={orientation}
        data-compact={
          compact === true ? "always" : compact === "auto" ? "auto" : undefined
        }
        style={
          {
            "--_progress": progress,
            "--_count": steps.length,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div
          className={cx(
            "kg-checkout-steps__summary gap-2 text-kg-sm text-kg-fg-muted [&_strong]:font-[650] [&_strong]:text-kg-fg",
            summaryShown,
          )}
        >
          <span className="kg-checkout-steps__summary-text">
            {text.summary(active + 1, steps.length)}
            {currentStep && (
              <>
                <span aria-hidden="true"> · </span>
                <strong>{currentStep.label}</strong>
              </>
            )}
          </span>
          <span
            className="kg-checkout-steps__summary-bar relative block h-2.5 overflow-hidden rounded-full border-2 border-kg-ink bg-kg-surface"
            aria-hidden="true"
          >
            <span
              className="absolute inset-0 origin-left bg-kg-accent transition-[scale] duration-(--kg-duration-slower) ease-kg-in-out rtl:origin-right"
              style={{ scale: `${steps.length ? (active + 1) / steps.length : 1} 1` }}
            />
          </span>
        </div>
        <ol className={cx("kg-checkout-steps__list m-0 list-none p-0", listShown, vertical && "flex-col")}>
          {steps.map((step, index) => {
            const state: CheckoutStepState =
              index < active ? "complete" : index === active ? "current" : "upcoming"
            const marker = (
              <span
                className={cx(
                  "kg-checkout-steps__marker grid size-7 shrink-0 place-items-center rounded-full border-2 border-kg-ink text-kg-xs font-[650] tabular-nums [&>svg]:size-3.5",
                  "transition-[background-color,color,box-shadow] duration-(--kg-duration-base) ease-kg-out",
                  markerState[state],
                )}
                aria-hidden="true"
              >
                {state === "complete" ? <Check /> : index + 1}
              </span>
            )
            const content = (
              <>
                {marker}
                <span className="kg-checkout-steps__text grid min-w-0 gap-0.5">
                  <span
                    className={cx(
                      "kg-checkout-steps__label text-kg-sm leading-[1.3] whitespace-nowrap",
                      state === "upcoming" ? "font-[550] text-kg-fg-muted" : "text-kg-fg",
                      state === "current" ? "font-[650]" : state === "complete" && "font-[550]",
                    )}
                  >
                    {step.label}
                    {state === "complete" && (
                      <span className="kg-visually-hidden">, {text.complete}</span>
                    )}
                  </span>
                  {step.description != null && (
                    <span className="kg-checkout-steps__description text-kg-xs leading-[1.4] text-kg-fg-muted">
                      {step.description}
                    </span>
                  )}
                </span>
              </>
            )
            return (
              <li
                key={step.id}
                className={cx(
                  "kg-checkout-steps__step flex min-w-0",
                  vertical
                    ? "flex-none flex-col items-stretch"
                    : "flex-auto items-center last:flex-none",
                )}
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
                style={{ "--_index": index } as CSSProperties}
              >
                {state === "complete" && onStepClick ? (
                  <button
                    type="button"
                    className={cx(
                      itemClass,
                      vertical && "items-start",
                      "cursor-pointer transition-[background-color] duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-paper-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                    )}
                    onClick={() => onStepClick(step.id, index)}
                  >
                    {content}
                  </button>
                ) : (
                  <span className={cx(itemClass, vertical && "items-start")}>{content}</span>
                )}
                {index < steps.length - 1 && (
                  <span
                    className={cx(
                      "kg-checkout-steps__connector relative overflow-hidden rounded-full bg-kg-border",
                      vertical
                        ? "my-1 ms-[calc(var(--kg-space)*1+0.875rem-1px)] min-h-6 w-[2px] flex-none"
                        : "mx-2 h-[2px] min-w-4 flex-auto",
                    )}
                    aria-hidden="true"
                  >
                    <span
                      className={cx(
                        "absolute inset-0 bg-kg-ink transition-[scale] duration-(--kg-duration-slower) ease-kg-in-out",
                        vertical ? "origin-top" : "origin-left rtl:origin-right",
                        state !== "complete" && (vertical ? "scale-y-0" : "scale-x-0"),
                      )}
                    />
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    )
  },
)

CheckoutSteps.displayName = "CheckoutSteps"
