import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: steps are paper discs on a rail; completed steps fill with ink, the current one
 * sits on an offset shadow. --_fill is the progress colour (danger on exception), --_progress
 * (0–1) scales the filled rail and --_inset centres the rail on the first and last disc.
 */
export const orderTrackerVariants = variants({
  base: "kg-order-tracker text-kg-fg",
  variants: {
    orientation: {
      horizontal: "",
      vertical: "",
    },
    status: {
      normal: "[--_fill:var(--kg-accent)] [--_fill-fg:var(--kg-accent-fg)]",
      exception: "[--_fill:var(--kg-danger)] [--_fill-fg:var(--kg-danger-fg)]",
    },
  },
  defaults: { orientation: "horizontal", status: "normal" },
})

type OrderTrackerVariantProps = VariantProps<typeof orderTrackerVariants>

export interface OrderTrackerStep {
  id: string
  label: ReactNode
  /** Short timestamp such as "Oct 21" or "Today, 9:40". */
  date?: ReactNode
  icon?: ReactNode
}

export interface OrderTrackerLabels {
  /** Accessible name of the list. */
  list?: string
  complete?: string
  current?: string
  upcoming?: string
}

export interface OrderTrackerProps extends HTMLAttributes<HTMLElement> {
  steps: readonly OrderTrackerStep[]
  /** Id of the step the order is currently at. */
  current: string
  /** `exception` marks the current step as a problem, e.g. a failed delivery. */
  status?: NonNullable<OrderTrackerVariantProps["status"]>
  orientation?: NonNullable<OrderTrackerVariantProps["orientation"]>
  labels?: OrderTrackerLabels
}

const defaultLabels: Required<OrderTrackerLabels> = {
  list: "Order progress",
  complete: "Complete",
  current: "Current",
  upcoming: "Upcoming",
}

const rail = [
  "before:absolute before:rounded-full before:bg-kg-border-strong before:content-['']",
  "after:absolute after:rounded-full after:bg-(--_fill) after:content-['']",
  "after:transition-[scale] after:duration-[var(--kg-duration-spring)] after:ease-kg-spring",
].join(" ")

const listClass = {
  horizontal: [
    "kg-order-tracker__list relative m-0 grid list-none grid-cols-[repeat(var(--_count),1fr)] p-0",
    rail,
    "before:inset-x-(--_inset) before:top-[calc(1rem-1.5px)] before:h-[3px]",
    "after:inset-x-(--_inset) after:top-[calc(1rem-1.5px)] after:h-[3px]",
    "after:origin-left after:scale-x-(--_progress) rtl:after:origin-right",
  ].join(" "),
  vertical: [
    "kg-order-tracker__list relative m-0 grid list-none grid-cols-1 gap-5 p-0",
    rail,
    "before:inset-y-4 before:start-[calc(1rem-1.5px)] before:w-[3px]",
    "after:inset-y-4 after:start-[calc(1rem-1.5px)] after:w-[3px]",
    "after:origin-top after:scale-y-(--_progress)",
  ].join(" "),
} as const

const stepClass = {
  horizontal:
    "kg-order-tracker__step relative z-1 grid content-start justify-items-center gap-2 text-center",
  vertical:
    "kg-order-tracker__step relative z-1 grid grid-cols-[2rem_1fr] items-center justify-items-start gap-3 text-start",
} as const

const dotState = {
  complete: "border-(--_fill) bg-(--_fill) text-(--_fill-fg)",
  current: "border-(--_fill) bg-kg-surface text-(--_fill) shadow-kg-sm",
  upcoming: "border-kg-border-strong bg-kg-surface text-kg-fg-muted",
} as const

const Check = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Ordered → shipped → delivered progress, with the current step ringed. */
export const OrderTracker = forwardRef<HTMLElement, OrderTrackerProps>(
  (
    {
      steps,
      current,
      status = "normal",
      orientation = "horizontal",
      labels,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const index = Math.max(
      0,
      steps.findIndex((step) => step.id === current),
    )
    const progress = steps.length > 1 ? index / (steps.length - 1) : 1
    const count = Math.max(1, steps.length)
    return (
      <nav
        ref={ref}
        aria-label={text.list}
        className={orderTrackerVariants({ orientation, status, className })}
        data-orientation={orientation}
        data-status={status}
        style={
          {
            ...style,
            "--_progress": progress,
            "--_count": steps.length,
            "--_inset": `${50 / count}%`,
          } as CSSProperties
        }
        {...props}
      >
        <ol className={listClass[orientation]}>
          {steps.map((step, stepIndex) => {
            const state =
              stepIndex < index ? "complete" : stepIndex === index ? "current" : "upcoming"
            const label =
              state === "upcoming"
                ? "font-medium text-kg-fg-muted"
                : state === "current" && status === "exception"
                  ? "font-semibold text-kg-danger"
                  : "font-semibold"
            return (
              <li
                key={step.id}
                className={stepClass[orientation]}
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span
                  className={`kg-order-tracker__dot grid size-8 place-items-center rounded-full border-2 transition-[background-color,border-color] duration-(--kg-duration-base) ease-kg-out [&_svg]:size-[0.95rem] ${dotState[state]}`}
                  aria-hidden="true"
                >
                  {state === "complete" ? <Check /> : step.icon}
                </span>
                <span className="kg-order-tracker__text grid gap-0.5 px-1">
                  <span className="kg-visually-hidden">{text[state]}: </span>
                  <span className={`kg-order-tracker__label text-kg-sm ${label}`}>{step.label}</span>
                  {step.date != null && (
                    <span className="kg-order-tracker__date text-kg-xs text-kg-fg-muted tabular-nums">
                      {step.date}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
      </nav>
    )
  },
)

OrderTracker.displayName = "OrderTracker"
