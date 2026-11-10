"use client"

import {
  forwardRef,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useDismiss } from "../../hooks/use-dismiss.js"
import { type Align, type Side, useFloating } from "../../hooks/use-floating.js"
import { usePresence } from "../../hooks/use-presence.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { Layer } from "../../primitives/layer.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"
import { focusInto, shouldReclaimFocus } from "../dialog/focus.js"

export interface CoachmarkStep {
  /** What the tip points at: a ref, or a CSS selector looked up when the step shows. */
  target: RefObject<HTMLElement | null> | string
  title: ReactNode
  content?: ReactNode
  side?: Side
  align?: Align
}

export interface CoachmarkLabels {
  next?: string
  back?: string
  done?: string
  skip?: string
  /** Builds the step counter, e.g. "2 of 4". */
  progress?: (step: number, total: number) => string
}

export interface CoachmarkProps {
  steps: readonly CoachmarkStep[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Zero-based index of the step on show. */
  step?: number
  defaultStep?: number
  onStepChange?: (step: number) => void
  /** Called when the last step's Done is pressed, before it closes. */
  onFinish?: () => void
  labels?: CoachmarkLabels
  className?: string
}

const TARGET_ATTRIBUTE = "data-kg-coachmark-target"

const resolve = (target: CoachmarkStep["target"]): HTMLElement | null =>
  typeof target === "string"
    ? document.querySelector<HTMLElement>(target)
    : target.current

/**
 * A guided tour: one anchored tip at a time, each pointing at a real control. Non-modal,
 * so the page stays usable; Escape or Skip ends it.
 */
export const Coachmark = forwardRef<HTMLDivElement, CoachmarkProps>(
  (
    {
      steps,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      step: stepProp,
      defaultStep = 0,
      onStepChange,
      onFinish,
      labels,
      className,
    },
    forwardedRef,
  ) => {
    const [openState, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const [index, setIndex] = useControllableState({
      value: stepProp,
      defaultValue: defaultStep,
      onChange: onStepChange,
    })
    const total = steps.length
    const current = steps[Math.min(Math.max(index, 0), total - 1)]
    const open = openState && current !== undefined
    const { ref, present, state } = usePresence<HTMLDivElement>(open)
    const composed = useComposedRefs(ref, forwardedRef)
    const reduced = useReducedMotion()
    const titleId = useId()
    const bodyId = useId()
    const returnTo = useRef<HTMLElement | null>(null)

    const anchor = useMemo<RefObject<HTMLElement | null>>(
      () => ({
        get current() {
          return current && typeof document !== "undefined"
            ? resolve(current.target)
            : null
        },
      }),
      [current],
    )

    useFloating(anchor, ref, {
      open,
      side: current?.side ?? "bottom",
      align: current?.align ?? "center",
      offset: 14,
      padding: 12,
    })

    useEffect(() => {
      const node = open ? anchor.current : null
      if (!node) return
      node.setAttribute(TARGET_ATTRIBUTE, "")
      node.scrollIntoView?.({ block: "nearest", behavior: reduced ? "auto" : "smooth" })
      return () => node.removeAttribute(TARGET_ATTRIBUTE)
    }, [open, anchor, reduced])

    useEffect(() => {
      if (!open) return
      const active = document.activeElement
      returnTo.current = active instanceof HTMLElement ? active : null
      const node = ref.current
      if (node) focusInto(node, node.querySelector<HTMLElement>("[data-primary]"))
      return () => {
        const back = returnTo.current
        if (back?.isConnected && shouldReclaimFocus(ref.current)) back.focus()
      }
    }, [open])

    const close = () => setOpen(false)
    useDismiss({ enabled: open, outside: false, refs: [ref], onDismiss: close })

    if (!present || !current) return null

    const position = Math.min(Math.max(index, 0), total - 1)
    const last = position === total - 1
    const progress = labels?.progress ?? ((n: number, of: number) => `${n} of ${of}`)

    return (
      <Layer
        ref={composed}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={current.content != null ? bodyId : undefined}
        className={cx(
          "kg-coachmark grid gap-3 w-[min(20rem,calc(100vw-1.5rem))] p-4 text-kg-fg z-kg-popover",
          "bg-kg-surface border-2 border-kg-ink rounded-kg-xl shadow-kg-lg origin-(--kg-origin,center)",
          "data-[side=top]:[--kg-enter-y:4px] data-[side=bottom]:[--kg-enter-y:-4px]",
          "data-[state=open]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
          "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-fade-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
          className,
        )}
        data-state={state}
      >
        <div className="kg-coachmark__meta flex items-center justify-between gap-3">
          <span className="kg-coachmark__progress text-kg-xs font-semibold tabular-nums text-kg-accent-strong">
            {progress(position + 1, total)}
          </span>
          <span className="kg-coachmark__dots inline-flex gap-[5px]" aria-hidden="true">
            {steps.map((_, dot) => (
              <span
                key={dot}
                className={cx(
                  "kg-coachmark__dot size-[6px] rounded-full",
                  "transition-[background-color,scale] duration-(--kg-duration-base) ease-kg-out",
                  dot === position
                    ? "bg-kg-accent scale-135"
                    : dot < position
                      ? "bg-kg-fg-muted"
                      : "bg-kg-border-strong",
                )}
                data-active={dot === position || undefined}
                data-done={dot < position || undefined}
              />
            ))}
          </span>
        </div>
        <div key={position} className="kg-coachmark__content grid gap-1.5 animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]">
          <div id={titleId} className="kg-coachmark__title text-kg-md font-semibold leading-[1.3] tracking-[-0.01em]">
            {current.title}
          </div>
          {current.content != null && (
            <div id={bodyId} className="kg-coachmark__body text-kg-sm leading-[1.55] text-kg-fg-muted">
              {current.content}
            </div>
          )}
        </div>
        <div className="kg-coachmark__footer flex items-center justify-between gap-2 -mx-1">
          {last ? (
            <span />
          ) : (
            <Button size="sm" variant="ghost" onClick={close}>
              {labels?.skip ?? "Skip tour"}
            </Button>
          )}
          <span className="kg-coachmark__nav inline-flex gap-1.5">
            {position > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIndex(position - 1)}
              >
                {labels?.back ?? "Back"}
              </Button>
            )}
            <Button
              size="sm"
              data-primary=""
              onClick={() => {
                if (!last) {
                  setIndex(position + 1)
                  return
                }
                onFinish?.()
                close()
              }}
            >
              {last ? (labels?.done ?? "Done") : (labels?.next ?? "Next")}
            </Button>
          </span>
        </div>
      </Layer>
    )
  },
)

Coachmark.displayName = "Coachmark"
