import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type DeployStatusStepState = "queued" | "running" | "done" | "failed" | "skipped"

export interface DeployStatusStep {
  id: string
  label: ReactNode
  state: DeployStatusStepState
  /** Elapsed or total time, e.g. "42s". */
  duration?: ReactNode
}

export interface DeployStatusProps extends HTMLAttributes<HTMLOListElement> {
  steps: readonly DeployStatusStep[]
  labels?: Partial<Record<DeployStatusStepState, string>>
}

const stateWords: Record<DeployStatusStepState, string> = {
  queued: "Queued",
  running: "Running",
  done: "Done",
  failed: "Failed",
  skipped: "Skipped",
}

const glyph: Partial<Record<DeployStatusStepState, string>> = {
  done: "M4 8.4 6.6 11 12 5.4",
  failed: "M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6",
  skipped: "M4.6 8h6.8",
}

const turn = "animate-[kg-deploy-turn_var(--kg-duration-spring)_var(--kg-ease-spring)]"

/* Paper Layers: each node is an ink-edged disc; finished steps fill with their status, the running one carries an ink arc. */
const nodeVariants = variants({
  base: [
    "kg-deploy-status__node relative grid size-[1.25rem] place-items-center rounded-full border-2",
    "transition-[background-color,border-color] duration-(--kg-duration-base) ease-kg-out [&_svg]:size-[0.875rem]",
  ],
  variants: {
    state: {
      queued: "border-kg-border-strong bg-kg-surface",
      running: [
        "border-kg-border-strong bg-kg-surface",
        "before:absolute before:-inset-[2px] before:rounded-full before:border-2 before:border-t-kg-ink before:border-r-kg-ink before:border-b-transparent before:border-l-transparent",
        "before:animate-spin before:[animation-duration:0.9s] motion-reduce:before:[animation-duration:2.4s] in-data-[kg-motion=reduce]:before:[animation-duration:2.4s]",
        "after:size-[0.375rem] after:rounded-full after:bg-kg-accent",
      ],
      done: ["border-kg-ink bg-kg-success text-kg-success-fg", turn],
      failed: ["border-kg-ink bg-kg-danger text-kg-danger-fg", turn],
      skipped: "border-dashed border-kg-border-strong bg-kg-surface text-kg-fg-faint",
    },
  },
})

const stateVariants = variants({
  base: "kg-deploy-status__state rounded-full px-2 text-kg-xs font-semibold leading-[1.25rem]",
  variants: {
    state: {
      queued: "text-kg-fg-muted",
      running: "bg-kg-accent text-kg-accent-fg",
      done: "bg-kg-success text-kg-success-fg",
      failed: "bg-kg-danger text-kg-danger-fg",
      skipped: "text-kg-fg-muted",
    },
  },
})

/** Build and deploy steps as a pipeline: each node turns as its step runs. Server-safe. */
export const DeployStatus = forwardRef<HTMLOListElement, DeployStatusProps>(
  ({ steps, labels, className, ...props }, ref) => {
    const words = { ...stateWords, ...labels }
    return (
      <ol ref={ref} className={cx("kg-deploy-status m-0 grid list-none p-0", className)} {...props}>
        {steps.map((step) => (
          <li
            key={step.id}
            className={cx(
              "kg-deploy-status__step relative grid min-h-[2.5rem] grid-cols-[1.25rem_minmax(0,1fr)_auto_auto] items-center gap-x-3",
              "[--_rail:var(--kg-border-strong)] data-[state=done]:[--_rail:var(--kg-ink)]",
              "not-last:after:absolute not-last:after:top-[calc(50%+0.75rem)] not-last:after:bottom-[calc(-50%+0.75rem)] not-last:after:start-[calc(0.625rem-1px)]",
              "not-last:after:w-[2px] not-last:after:rounded-[1px] not-last:after:bg-(--_rail)",
            )}
            data-state={step.state}
            aria-current={step.state === "running" ? "step" : undefined}
          >
            <span className={nodeVariants({ state: step.state })} aria-hidden="true">
              {glyph[step.state] ? (
                <svg viewBox="0 0 16 16" fill="none">
                  <path
                    d={glyph[step.state]}
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span
              className={cx(
                "kg-deploy-status__label min-w-0 truncate text-kg-sm font-[520]",
                step.state === "queued" || step.state === "skipped" ? "text-kg-fg-muted" : "text-kg-fg",
              )}
            >
              {step.label}
            </span>
            <span className={stateVariants({ state: step.state })}>{words[step.state]}</span>
            {step.duration != null && (
              <span className="kg-deploy-status__duration min-w-[2.75rem] text-end font-kg-mono text-kg-xs text-kg-fg-faint">
                {step.duration}
              </span>
            )}
          </li>
        ))}
      </ol>
    )
  },
)

DeployStatus.displayName = "DeployStatus"
