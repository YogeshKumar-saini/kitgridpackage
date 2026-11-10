import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export type StepperOrientation = "horizontal" | "vertical"
export type StepperStatus = "complete" | "current" | "upcoming" | "error"

export interface StepperStep {
  label: ReactNode
  description?: ReactNode
  /** Override the status derived from `current`, e.g. to flag a step with errors. */
  status?: StepperStatus
}

export interface StepperProps extends HTMLAttributes<HTMLOListElement> {
  steps: StepperStep[]
  /** Zero-based index of the current step. */
  current: number
  orientation?: StepperOrientation
  /** Makes completed steps buttons that jump back. */
  onStepClick?: (index: number) => void
  /** Screen-reader words for each status. */
  statusLabels?: Partial<Record<StepperStatus, string>>
}

const defaultLabels: Record<StepperStatus, string> = {
  complete: "Completed",
  current: "Current step",
  upcoming: "Not started",
  error: "Needs attention",
}

/* Markers are 2rem sheets; the connector runs between their edges, centred on them. */
const markerClass: Record<StepperStatus, string> = {
  upcoming: "bg-kg-surface text-kg-fg-muted border-kg-ink",
  current: "scale-[1.06] bg-kg-paper-sage text-kg-fg border-kg-ink shadow-kg-xs",
  complete: "bg-kg-accent text-kg-accent-fg border-kg-accent",
  error: "bg-kg-danger text-kg-danger-fg border-kg-danger",
}

const connectorClass: Record<StepperOrientation, string> = {
  horizontal:
    "top-[calc(1rem-1px)] start-[calc(50%+1rem+var(--kg-space)*2)] end-[calc(-50%+1rem+var(--kg-space)*2)] h-[2px] after:origin-[0_50%] rtl:after:origin-[100%_50%] after:scale-x-0 data-filled:after:scale-x-100",
  vertical:
    "top-[calc(2rem+var(--kg-space)*1.5)] -bottom-4.5 start-[calc(1rem-1px)] w-[2px] after:origin-[50%_0] after:scale-y-0 data-filled:after:scale-y-100",
}

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Progress through a sequence of steps, horizontally or as a vertical timeline. */
export const Stepper = forwardRef<HTMLOListElement, StepperProps>(
  (
    {
      steps,
      current,
      orientation = "horizontal",
      onStepClick,
      statusLabels,
      className,
      style,
      "aria-label": ariaLabel = "Progress",
      ...props
    },
    ref,
  ) => {
    const labels = { ...defaultLabels, ...statusLabels }
    return (
      <ol
        ref={ref}
        aria-label={ariaLabel}
        className={cx(
          "kg-stepper m-0 grid list-none p-0",
          orientation === "horizontal"
            ? "grid-cols-[repeat(var(--_n),minmax(0,1fr))]"
            : "gap-6",
          className,
        )}
        data-orientation={orientation}
        style={{ "--_n": steps.length, ...style } as CSSProperties}
        {...props}
      >
        {steps.map((step, index) => {
          const status: StepperStatus =
            step.status ??
            (index < current ? "complete" : index === current ? "current" : "upcoming")
          const clickable = onStepClick !== undefined && status === "complete"
          const bodyClass = cx(
            "kg-stepper__body flex w-full gap-3 rounded-kg-md border-0 bg-transparent p-0 [font:inherit] text-inherit",
            "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kg-ring",
            orientation === "horizontal"
              ? "flex-col items-center text-center"
              : "text-start",
            clickable && "group/body cursor-pointer",
          )
          const body = (
            <>
              <span
                className={cx(
                  "kg-stepper__marker relative z-1 grid size-[2rem] shrink-0 place-items-center rounded-full border-2",
                  "text-kg-sm font-semibold tabular-nums [&_svg]:size-[0.875rem]",
                  "transition-[background-color,border-color,color,scale] duration-(--kg-duration-base) ease-kg-out",
                  markerClass[status],
                )}
                aria-hidden="true"
              >
                {status === "complete" ? <Check /> : status === "error" ? "!" : index + 1}
              </span>
              <span
                className={cx(
                  "kg-stepper__text grid min-w-0 gap-[2px]",
                  orientation === "vertical" && "pt-[0.375rem]",
                )}
              >
                <span
                  className={cx(
                    "kg-stepper__label text-kg-sm leading-[1.3]",
                    status === "upcoming"
                      ? "font-medium text-kg-fg-muted"
                      : "font-semibold text-kg-fg",
                    clickable &&
                      "group-hover/body:underline group-hover/body:underline-offset-3",
                  )}
                >{step.label}</span>
                {step.description != null && (
                  <span className="kg-stepper__description text-kg-xs leading-[1.4] text-kg-fg-muted">{step.description}</span>
                )}
                <span className="kg-stepper__sr sr-only">{`, ${labels[status]}`}</span>
              </span>
            </>
          )
          return (
            <li
              key={index}
              className="kg-stepper__step relative min-w-0"
              data-status={status}
              aria-current={status === "current" ? "step" : undefined}
            >
              {index < steps.length - 1 && (
                <span
                  className={cx(
                    "kg-stepper__connector absolute rounded-full bg-kg-border",
                    "after:absolute after:inset-0 after:rounded-[inherit] after:bg-kg-ink after:content-['']",
                    "after:transition-transform after:duration-(--kg-duration-slower) after:ease-kg-out",
                    connectorClass[orientation],
                  )}
                  data-filled={index < current || undefined}
                  aria-hidden="true"
                />
              )}
              {clickable ? (
                <button
                  type="button"
                  className={bodyClass}
                  onClick={() => onStepClick?.(index)}
                >
                  {body}
                </button>
              ) : (
                <span className={bodyClass}>{body}</span>
              )}
            </li>
          )
        })}
      </ol>
    )
  },
)

Stepper.displayName = "Stepper"
