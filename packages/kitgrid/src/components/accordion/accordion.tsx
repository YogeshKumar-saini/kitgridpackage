"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useContext,
  useId,
  useMemo,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useRovingFocus } from "../../hooks/use-roving-focus.js"
import { cx } from "../../utils/cx.js"

interface AccordionContextValue {
  value: readonly string[]
  toggle: (item: string) => void
  /** True when the open item of a single, non-collapsible accordion can't be closed. */
  isLocked: (item: string) => boolean
  disabled: boolean
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

const useAccordionContext = (part: string): AccordionContextValue => {
  const context = useContext(AccordionContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <Accordion>.`)
  return context
}

interface AccordionItemContextValue {
  value: string
  open: boolean
  disabled: boolean
  triggerId: string
  contentId: string
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null)

const useItemContext = (part: string): AccordionItemContextValue => {
  const context = useContext(AccordionItemContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <AccordionItem>.`)
  return context
}

interface AccordionBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  disabled?: boolean
}

export interface AccordionSingleProps extends AccordionBaseProps {
  /** One item open at a time. */
  type?: "single"
  /** The open item, or "" for none. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Allow closing the open item so that none is open. */
  collapsible?: boolean
}

export interface AccordionMultipleProps extends AccordionBaseProps {
  /** Any number of items open at once. */
  type: "multiple"
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps

type LooseAccordionProps = AccordionBaseProps & {
  type?: "single" | "multiple"
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: ((value: string) => void) | ((value: string[]) => void)
  collapsible?: boolean
}

const toList = (value: string | string[] | undefined): string[] | undefined => {
  if (value === undefined) return undefined
  if (Array.isArray(value)) return value
  return value === "" ? [] : [value]
}

// Only this accordion's own headers, so a nested accordion keeps its own arrow-key scope.
const HEADER_SELECTOR =
  ":scope > .kg-accordion__item > .kg-accordion__heading > .kg-accordion__trigger:not([disabled])"

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>((props, ref) => {
  const {
    type = "single",
    value: valueProp,
    defaultValue,
    onValueChange,
    collapsible = false,
    disabled = false,
    onKeyDown,
    className,
    ...rest
  } = props as LooseAccordionProps
  const [value, setValue] = useControllableState<string[]>({
    value: toList(valueProp),
    defaultValue: toList(defaultValue) ?? [],
    onChange: (next) => {
      if (type === "multiple")
        (onValueChange as ((value: string[]) => void) | undefined)?.(next)
      else (onValueChange as ((value: string) => void) | undefined)?.(next[0] ?? "")
    },
  })
  const rove = useRovingFocus({ orientation: "vertical", selector: HEADER_SELECTOR })

  const toggle = useCallback(
    (item: string) =>
      setValue((current) => {
        const isOpen = current.includes(item)
        if (type === "multiple") {
          return isOpen ? current.filter((entry) => entry !== item) : [...current, item]
        }
        if (isOpen) return collapsible ? [] : current
        return [item]
      }),
    [setValue, type, collapsible],
  )

  const context = useMemo<AccordionContextValue>(
    () => ({
      value,
      toggle,
      isLocked: (item) => type === "single" && !collapsible && value.includes(item),
      disabled,
    }),
    [value, toggle, type, collapsible, disabled],
  )

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    // Arrow keys inside a panel (inputs, sliders…) belong to that content, not to the headers.
    const target = event.target as HTMLElement
    if (!target.matches(".kg-accordion__trigger")) return
    if (target.closest(".kg-accordion") !== event.currentTarget) return
    rove(event)
  }

  return (
    <AccordionContext.Provider value={context}>
      <div
        ref={ref}
        className={cx("kg-accordion flex min-w-0 flex-col text-kg-fg", className)}
        data-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
        {...rest}
      />
    </AccordionContext.Provider>
  )
})

Accordion.displayName = "Accordion"

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, disabled = false, className, ...props }, ref) => {
    const accordion = useAccordionContext("AccordionItem")
    const open = accordion.value.includes(value)
    const id = useId()
    const item = useMemo<AccordionItemContextValue>(
      () => ({
        value,
        open,
        disabled: disabled || accordion.disabled,
        triggerId: `${id}-trigger`,
        contentId: `${id}-content`,
      }),
      [value, open, disabled, accordion.disabled, id],
    )
    return (
      <AccordionItemContext.Provider value={item}>
        <div
          ref={ref}
          className={cx("kg-accordion__item border-b-2 border-kg-border", className)}
          data-state={open ? "open" : "closed"}
          data-disabled={item.disabled || undefined}
          {...props}
        />
      </AccordionItemContext.Provider>
    )
  },
)

AccordionItem.displayName = "AccordionItem"

export type AccordionHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface AccordionTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The heading level wrapping the button, to fit the page outline. */
  level?: AccordionHeadingLevel
}

const ChevronIcon = () => (
  // The chevron rides on a small paper disc that turns sage with an ink ring when it opens.
  <svg
    className={[
      "kg-accordion__chevron box-content size-3.5 shrink-0 rounded-full bg-kg-muted p-[0.3125rem] text-kg-fg-muted",
      "shadow-[inset_0_0_0_1px_var(--kg-border)] transition-[rotate,color,background-color,box-shadow] duration-(--kg-duration-base) ease-kg-out",
      "group-enabled/trigger:group-hover/trigger:text-kg-fg",
      "group-data-[state=open]/trigger:rotate-180 group-data-[state=open]/trigger:bg-kg-paper-sage group-data-[state=open]/trigger:text-kg-fg",
      "group-data-[state=open]/trigger:shadow-[inset_0_0_0_2px_var(--kg-ink)]",
    ].join(" ")}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ level = 3, onClick, className, children, ...props }, ref) => {
    const accordion = useAccordionContext("AccordionTrigger")
    const item = useItemContext("AccordionTrigger")
    const Heading = `h${level}` as "h3"
    const locked = accordion.isLocked(item.value)
    return (
      <Heading className="kg-accordion__heading m-0 flex [font:inherit]">
        <button
          ref={ref}
          type="button"
          id={item.triggerId}
          aria-expanded={item.open}
          aria-controls={item.contentId}
          // APG: an open panel that can't be collapsed reports its header as disabled.
          aria-disabled={locked || undefined}
          disabled={item.disabled}
          className={cx(
            "kg-accordion__trigger group/trigger flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-kg-sm border-0 bg-transparent px-0.5 py-4",
            "text-start [font-family:inherit] text-kg-base font-semibold leading-[1.4] text-inherit [-webkit-tap-highlight-color:transparent]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            "aria-disabled:cursor-default disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          data-state={item.open ? "open" : "closed"}
          {...props}
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
            onClick?.(event)
            if (!event.defaultPrevented) accordion.toggle(item.value)
          }}
        >
          <span className="kg-accordion__label decoration-kg-ink decoration-2 underline-offset-[0.3em] group-enabled/trigger:group-hover/trigger:underline">{children}</span>
          <ChevronIcon />
        </button>
      </Heading>
    )
  },
)

AccordionTrigger.displayName = "AccordionTrigger"

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {}

/** Collapses with `grid-template-rows` and leaves the accessibility tree while closed. */
export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const item = useItemContext("AccordionContent")
    return (
      <div
        ref={ref}
        id={item.contentId}
        role="region"
        aria-labelledby={item.triggerId}
        className={cx(
          // visibility drops the closed panel from the tab order and accessibility tree once the
          // collapse has finished, without unmounting it.
          "kg-accordion__content grid grid-rows-[0fr] opacity-0 invisible",
          "[transition:grid-template-rows_var(--kg-duration-base)_var(--kg-ease-out),opacity_var(--kg-duration-fast)_var(--kg-ease-out),visibility_0s_linear_var(--kg-duration-base)]",
          "data-[state=open]:visible data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100",
          "data-[state=open]:[transition:grid-template-rows_var(--kg-duration-slow)_var(--kg-ease-out),opacity_var(--kg-duration-base)_var(--kg-ease-out),visibility_0s]",
          className,
        )}
        data-state={item.open ? "open" : "closed"}
        {...props}
      >
        <div className="kg-accordion__clip min-h-0 overflow-hidden">
          <div className="kg-accordion__body px-0.5 pb-4 text-kg-base leading-[1.6] text-kg-fg-muted">{children}</div>
        </div>
      </div>
    )
  },
)

AccordionContent.displayName = "AccordionContent"
