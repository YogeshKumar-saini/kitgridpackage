"use client"

import {
  Children,
  createContext,
  type FormEvent,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { buttonVariants } from "../button/button.js"
import { CheckIcon } from "../combobox/internal.js"

/** `true` or nothing passes; a string blocks and is shown; `false` blocks silently. */
export type FormWizardValidation = boolean | string | undefined | void

export interface FormWizardStepProps {
  title: string
  description?: string
  /** Runs before leaving the step forward. May be async. */
  validate?: () => FormWizardValidation | Promise<FormWizardValidation>
  children?: ReactNode
}

export interface FormWizardLabels {
  back: string
  next: string
  finish: string
  /** Spoken progress, e.g. "Step 2 of 4". */
  progress: (step: number, count: number) => string
}

export interface FormWizardProps
  extends Omit<HTMLAttributes<HTMLFormElement>, "onSubmit" | "children"> {
  /** Zero-based. */
  step?: number
  defaultStep?: number
  onStepChange?: (step: number) => void
  /** Called after the last step validates. May be async. */
  onComplete?: () => void | Promise<void>
  labels?: Partial<FormWizardLabels>
  children?: ReactNode
}

export interface FormWizardContextValue {
  step: number
  count: number
  isFirst: boolean
  isLast: boolean
  busy: boolean
  next: () => Promise<boolean>
  back: () => void
  goTo: (step: number) => void
  /** Shows a message on the current step, or clears it with `null`. */
  setError: (message: string | null) => void
}

const defaultLabels: FormWizardLabels = {
  back: "Back",
  next: "Continue",
  finish: "Finish",
  progress: (step, count) => `Step ${step} of ${count}`,
}

const WizardContext = createContext<FormWizardContextValue | null>(null)

/** The surrounding FormWizard's state and navigation, for custom footers or inline steps. */
export const useFormWizard = (): FormWizardContextValue => {
  const context = useContext(WizardContext)
  if (!context) throw new Error("useFormWizard must be used inside FormWizard")
  return context
}

/** One page of a FormWizard. It renders nothing by itself; FormWizard reads its props. */
export const FormWizardStep = ({ children }: FormWizardStepProps) => <>{children}</>
FormWizardStep.displayName = "FormWizardStep"

/**
 * A multi-step form: a step rail, one panel at a time, and Back and Continue that run each
 * step's `validate` first. Focus moves to the new step's heading so the change is announced.
 */
export const FormWizard = forwardRef<HTMLFormElement, FormWizardProps>(
  (
    {
      step: stepProp,
      defaultStep = 0,
      onStepChange,
      onComplete,
      labels: labelsProp,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const labels = { ...defaultLabels, ...labelsProp }
    const steps = Children.toArray(children).filter(
      (child): child is ReactElement<FormWizardStepProps> =>
        isValidElement(child) && child.type === FormWizardStep,
    )
    const count = steps.length
    const [step, setStep] = useControllableState({
      value: stepProp,
      defaultValue: defaultStep,
      onChange: onStepChange,
    })
    const [reached, setReached] = useState(step)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [direction, setDirection] = useState<"next" | "previous">("next")
    const headingRef = useRef<HTMLHeadingElement>(null)
    const moved = useRef(false)
    const baseId = useId()

    const current = Math.min(Math.max(step, 0), Math.max(count - 1, 0))
    const active = steps[current]

    useEffect(() => {
      if (!moved.current) return
      moved.current = false
      headingRef.current?.focus()
    }, [current])

    const goTo = (target: number) => {
      if (target === current || target < 0 || target >= count) return
      setDirection(target > current ? "next" : "previous")
      setError(null)
      moved.current = true
      setStep(target)
      setReached((prev) => Math.max(prev, target))
    }

    const next = async (): Promise<boolean> => {
      if (busy) return false
      setBusy(true)
      try {
        const result = await active?.props.validate?.()
        if (result === false || typeof result === "string") {
          setError(typeof result === "string" ? result : null)
          return false
        }
        if (current === count - 1) await onComplete?.()
        else goTo(current + 1)
        return true
      } finally {
        setBusy(false)
      }
    }
    const back = () => goTo(current - 1)

    const context: FormWizardContextValue = {
      step: current,
      count,
      isFirst: current === 0,
      isLast: current === count - 1,
      busy,
      next,
      back,
      goTo,
      setError,
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void next()
    }

    const errorId = `${baseId}-error`
    const headingId = `${baseId}-heading`

    return (
      <WizardContext.Provider value={context}>
        <form
          ref={ref}
          className={cx(
            "kg-form-wizard grid gap-5 w-full p-5 rounded-kg-xl border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-md",
            className,
          )}
          noValidate
          onSubmit={handleSubmit}
          {...props}
        >
          <ol className="kg-form-wizard__rail flex gap-2 m-0 p-0 list-none">
            {steps.map((item, index) => {
              const state = index < current ? "complete" : index === current ? "current" : "upcoming"
              const reachable = index <= reached && index !== current
              return (
                <li
                  key={item.props.title}
                  className={cx(
                    "kg-form-wizard__rail-item group/step relative flex-1 min-w-0",
                    // The connector to the next step turns ink once this step is complete.
                    "not-last:after:absolute not-last:after:top-[0.8125rem] not-last:after:h-[2px] not-last:after:rounded-full",
                    "not-last:after:[inset-inline:calc(var(--kg-space)*2+1.75rem)_calc(var(--kg-space)*-1)]",
                    "not-last:after:bg-kg-border not-last:after:transition-colors not-last:after:duration-(--kg-duration-base)",
                    "data-[state=complete]:not-last:after:bg-kg-ink",
                  )}
                  data-state={state}
                  aria-current={index === current ? "step" : undefined}
                >
                  <button
                    type="button"
                    className={cx(
                      "kg-form-wizard__rail-button group/btn relative z-1 flex items-center gap-2 max-w-full p-0 pe-2",
                      "border-0 rounded-full bg-kg-surface font-[inherit] text-inherit text-start cursor-pointer disabled:cursor-default",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                    )}
                    disabled={!reachable || busy}
                    onClick={() => goTo(index)}
                  >
                    <span
                      className={cx(
                        "kg-form-wizard__dot grid place-items-center shrink-0 size-7 rounded-full border-2 border-kg-ink",
                        "bg-kg-surface text-kg-fg-muted text-kg-xs font-bold tabular-nums [&_svg]:size-[0.8rem]",
                        "transition-[background-color,color,box-shadow,scale] duration-(--kg-duration-base) ease-kg-out",
                        "group-[:hover:enabled]/btn:shadow-[2px_2px_0_var(--kg-ink)]",
                        "group-data-[state=current]/step:bg-kg-accent group-data-[state=current]/step:text-kg-accent-fg",
                        "group-data-[state=current]/step:shadow-[2px_2px_0_var(--kg-paper-sage)]",
                        "group-data-[state=complete]/step:bg-kg-paper-sage group-data-[state=complete]/step:text-kg-ink",
                      )}
                      aria-hidden="true"
                    >
                      {state === "complete" ? <CheckIcon /> : index + 1}
                    </span>
                    <span
                      className={cx(
                        "kg-form-wizard__rail-label overflow-hidden text-ellipsis whitespace-nowrap text-kg-sm font-medium text-kg-fg-muted",
                        "group-data-[state=current]/step:font-semibold group-data-[state=current]/step:text-kg-fg",
                        "max-[34rem]:group-data-[state=upcoming]/step:hidden max-[34rem]:group-data-[state=complete]/step:hidden",
                      )}
                    >{item.props.title}</span>
                    <span className="kg-visually-hidden">
                      {state === "complete" ? ", done" : state === "current" ? ", current" : ""}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <section
            key={current}
            className={cx(
              "kg-form-wizard__panel grid gap-4",
              "animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)] [--kg-enter-y:4px]",
            )}
            data-direction={direction}
            aria-labelledby={headingId}
            aria-describedby={error ? errorId : undefined}
          >
            <header className="kg-form-wizard__head grid gap-1">
              <p className="kg-visually-hidden">{labels.progress(current + 1, count)}</p>
              <h3 id={headingId} ref={headingRef} tabIndex={-1} className="kg-form-wizard__title m-0 text-kg-lg font-bold tracking-[-0.01em] outline-none">
                {active?.props.title}
              </h3>
              {active?.props.description && (
                <p className="kg-form-wizard__description m-0 text-kg-sm text-kg-fg-muted">{active.props.description}</p>
              )}
            </header>
            <div className="kg-form-wizard__body grid gap-4">{active}</div>
          </section>
          <p id={errorId} className="kg-form-wizard__error m-0 text-kg-sm text-[color-mix(in_oklab,var(--kg-danger),var(--kg-fg)_30%)] empty:hidden" role="alert">
            {error}
          </p>
          <footer className="kg-form-wizard__footer flex justify-end gap-2 pt-4 border-t-2 border-kg-border">
            {current > 0 && (
              <button
                type="button"
                className={buttonVariants({ variant: "outline", className: "kg-form-wizard__button" })}
                data-kind="back"
                disabled={busy}
                onClick={back}
              >
                {labels.back}
              </button>
            )}
            <button
              type="submit"
              className={buttonVariants({ variant: "solid", className: "kg-form-wizard__button" })}
              data-kind="next"
              aria-busy={busy || undefined}
              disabled={busy}
            >
              {current === count - 1 ? labels.finish : labels.next}
            </button>
          </footer>
        </form>
      </WizardContext.Provider>
    )
  },
)

FormWizard.displayName = "FormWizard"
