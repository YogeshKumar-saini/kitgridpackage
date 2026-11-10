"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  useContext,
  useId,
  useMemo,
  version,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { Slot } from "../../primitives/slot.js"
import { cx } from "../../utils/cx.js"

// React 18 only renders `inert` as a string attribute; React 19 expects a boolean.
const inertProps = (
  Number.parseInt(version, 10) >= 19 ? { inert: true } : { inert: "" }
) as HTMLAttributes<HTMLElement>

interface CollapsibleContextValue {
  open: boolean
  disabled: boolean
  toggle: () => void
  contentId: string
}

const triggerClass =
  "kg-collapsible__trigger cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring disabled:cursor-not-allowed disabled:opacity-50"

const contentClass = [
  "kg-collapsible__content grid grid-rows-[0fr] opacity-0",
  "[transition:grid-template-rows_var(--kg-duration-slow)_var(--kg-ease-out),opacity_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100",
  "data-[state=closed]:invisible data-[state=closed]:[transition:grid-template-rows_var(--kg-duration-base)_var(--kg-ease-in),opacity_var(--kg-duration-fast)_var(--kg-ease-in),visibility_0s_linear_var(--kg-duration-base)]",
]

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null)

const useCollapsible = (part: string) => {
  const context = useContext(CollapsibleContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <Collapsible>.`)
  return context
}

export interface CollapsibleProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
}

/** A single disclosure: one trigger shows and hides one region. */
export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(
  (
    { open: openProp, defaultOpen = false, onOpenChange, disabled = false, className, ...props },
    ref,
  ) => {
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const contentId = `${useId()}-collapsible`
    const value = useMemo(
      () => ({ open, disabled, toggle: () => setOpen((current) => !current), contentId }),
      [open, disabled, setOpen, contentId],
    )
    return (
      <CollapsibleContext.Provider value={value}>
        <div
          ref={ref}
          className={cx("kg-collapsible", className)}
          data-state={open ? "open" : "closed"}
          data-disabled={disabled || undefined}
          {...props}
        />
      </CollapsibleContext.Provider>
    )
  },
)

Collapsible.displayName = "Collapsible"

export interface CollapsibleTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const CollapsibleTrigger = forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ asChild = false, onClick, className, ...props }, ref) => {
    const context = useCollapsible("CollapsibleTrigger")
    const shared = {
      ref,
      "aria-expanded": context.open,
      "aria-controls": context.contentId,
      "data-state": context.open ? "open" : "closed",
      disabled: context.disabled || undefined,
      className: cx(triggerClass, className),
      onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.toggle()
      },
    }
    if (asChild) return <Slot {...shared} {...props} />
    return <button type="button" {...shared} {...props} />
  },
)

CollapsibleTrigger.displayName = "CollapsibleTrigger"

export interface CollapsibleContentProps extends HTMLAttributes<HTMLDivElement> {}

/** Animates height with the grid-rows technique; closed content is inert and unfocusable. */
export const CollapsibleContent = forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = useCollapsible("CollapsibleContent")
    return (
      <div
        ref={ref}
        id={context.contentId}
        className={cx(contentClass, className)}
        data-state={context.open ? "open" : "closed"}
        {...(context.open ? null : inertProps)}
        {...props}
      >
        <div className="kg-collapsible__inner min-h-0 overflow-hidden">{children}</div>
      </div>
    )
  },
)

CollapsibleContent.displayName = "CollapsibleContent"
