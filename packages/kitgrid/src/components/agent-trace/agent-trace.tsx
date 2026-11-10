"use client"

import {
  forwardRef,
  type OlHTMLAttributes,
  type ReactNode,
  useId,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import {
  AlertIcon,
  CheckIcon,
  ChevronIcon,
  DotIcon,
  SpinnerIcon,
} from "../chat-message/internal/icons.js"
import { formatThoughtDuration } from "../thought-line/thought-line.js"

export type AgentTraceStatus = "pending" | "running" | "done" | "failed"

export interface AgentTraceStep {
  id: string
  /** What the step did, e.g. the tool name or a summary of the query. */
  title: ReactNode
  status: AgentTraceStatus
  /** Seconds the step took. */
  duration?: number
  /** A line of reasoning shown under the step. */
  note?: ReactNode
  /** The tool's input or result, revealed on demand. */
  detail?: ReactNode
  /** Tool glyph shown before the title. */
  icon?: ReactNode
}

export type AgentTraceLabels = Record<AgentTraceStatus, string>

export interface AgentTraceProps extends OlHTMLAttributes<HTMLOListElement> {
  steps: readonly AgentTraceStep[]
  /** Spoken status of each step, since the icon alone carries it visually. */
  labels?: Partial<AgentTraceLabels>
}

const defaultLabels: AgentTraceLabels = {
  pending: "Pending",
  running: "Running",
  done: "Done",
  failed: "Failed",
}

const statusIcon: Record<AgentTraceStatus, ReactNode> = {
  pending: <DotIcon />,
  running: <SpinnerIcon />,
  done: <CheckIcon />,
  failed: <AlertIcon />,
}

/* Paper Layers: steps hang off an ink rail; each marker is a small paper disc edged in ink. */
const rootClass = cx(
  "kg-agent-trace relative m-0 flex list-none flex-col gap-3 p-0 text-kg-sm text-kg-fg-muted [--_marker:1rem]",
  "before:absolute before:inset-y-[calc(var(--_marker)*0.75)] before:start-[calc(var(--_marker)/2-1px)] before:w-0.5 before:bg-kg-border before:content-['']",
)

const markerClass = cx(
  "kg-agent-trace__marker absolute start-0 top-0.5 grid size-(--_marker) place-items-center rounded-full",
  "border-2 border-kg-border bg-kg-surface text-[0.625rem] text-kg-fg-faint",
  "group-data-[status=pending]/step:text-[0.5rem]",
  "group-data-[status=running]/step:border-kg-ink group-data-[status=running]/step:text-kg-fg",
  "group-data-[status=running]/step:[&_svg]:animate-[kg-spin_0.9s_linear_infinite] motion-reduce:[&_svg]:[animation-duration:3s]",
  "group-data-[status=done]/step:border-kg-ink group-data-[status=done]/step:bg-kg-paper-sage group-data-[status=done]/step:text-kg-fg",
  "group-data-[status=failed]/step:border-kg-ink group-data-[status=failed]/step:bg-kg-warning group-data-[status=failed]/step:text-kg-warning-fg",
)

const rowClass =
  "kg-agent-trace__row m-0 flex w-full min-w-0 items-center gap-2 rounded-kg-xs border-0 bg-transparent py-px px-0 text-start [font:inherit] text-inherit"

const detailClass = cx(
  "kg-agent-trace__detail mt-2 overflow-x-auto rounded-kg-md border-2 border-kg-ink bg-kg-surface-sunken px-3 py-2",
  "text-kg-xs text-kg-fg-muted animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)] [&[hidden]]:hidden",
)

const StepRow = ({ step, label }: { step: AgentTraceStep; label: string }) => {
  const [open, setOpen] = useState(false)
  const detailId = useId()
  const hasDetail = step.detail !== undefined && step.detail !== null
  const meta =
    step.status === "running"
      ? `${label}…`
      : step.duration !== undefined
        ? formatThoughtDuration(step.duration)
        : null

  const row = (
    <>
      {step.icon != null && (
        <span className="kg-agent-trace__tool inline-flex shrink-0 text-kg-fg-faint [&_svg]:size-3.5" aria-hidden="true">
          {step.icon}
        </span>
      )}
      <span className="kg-agent-trace__title min-w-0 flex-1 truncate font-medium text-kg-fg transition-colors duration-(--kg-duration-fast) ease-kg-out group-data-[status=pending]/step:text-kg-fg-faint group-hover/row:underline group-hover/row:decoration-2 group-hover/row:underline-offset-[0.2em]">{step.title}</span>
      <span className="kg-visually-hidden">, {label}</span>
      {meta && <span className="kg-agent-trace__meta shrink-0 font-kg-mono text-kg-xs tabular-nums text-kg-fg-faint group-data-[status=failed]/step:text-kg-fg-muted">{meta}</span>}
      {hasDetail && (
        <span className="kg-agent-trace__chevron inline-flex shrink-0 -rotate-90 text-kg-fg-faint transition-[rotate] duration-(--kg-duration-base) ease-kg-out group-aria-expanded/row:rotate-0" aria-hidden="true">
          <ChevronIcon />
        </span>
      )}
    </>
  )

  return (
    <li className="kg-agent-trace__step group/step relative ps-[calc(var(--_marker)+var(--kg-space)*2.5)]" data-status={step.status}>
      <span className={markerClass} aria-hidden="true">
        {statusIcon[step.status]}
      </span>
      {hasDetail ? (
        <button
          type="button"
          className={cx(rowClass, "group/row cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring")}
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => setOpen((was) => !was)}
        >
          {row}
        </button>
      ) : (
        <div className={rowClass}>{row}</div>
      )}
      {step.note != null && <p className="kg-agent-trace__note mt-0.5 mb-0 text-kg-sm italic leading-[1.45] text-kg-fg-muted">{step.note}</p>}
      {hasDetail && (
        <div id={detailId} className={detailClass} hidden={!open}>
          {step.detail}
        </div>
      )}
    </li>
  )
}

/** How an agent reached its answer: each tool call with its status, its time and, on demand, its result. */
export const AgentTrace = forwardRef<HTMLOListElement, AgentTraceProps>(
  ({ steps, labels: labelsProp, className, ...props }, ref) => {
    const labels = { ...defaultLabels, ...labelsProp }
    return (
      <ol ref={ref} className={cx(rootClass, className)} {...props}>
        {steps.map((step) => (
          <StepRow key={step.id} step={step} label={labels[step.status]} />
        ))}
      </ol>
    )
  },
)

AgentTrace.displayName = "AgentTrace"
