"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useId,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  type DrawerContentProps,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../drawer/drawer.js"

export interface FilterSheetProps extends Omit<
  DrawerContentProps,
  "children" | "title" | "open"
> {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Replaces the built-in trigger button, which then opens the sheet via `asChild`. */
  trigger?: ReactElement | null
  triggerLabel?: string
  title?: ReactNode
  description?: ReactNode
  /** How many filters are applied: shown on the trigger and in the footer. */
  activeCount?: number
  /** Runs before the sheet closes from the Apply button. */
  onApply?: () => void
  /** Shows a Reset button, enabled while anything is active. */
  onReset?: () => void
  applyLabel?: ReactNode
  resetLabel?: ReactNode
  /** Builds the footer readout, e.g. "3 active". */
  formatCount?: (count: number) => string
  children?: ReactNode
}

const FilterIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
)

const defaultFormat = (count: number) => `${count} active`

/** A side sheet of filter fields with a sticky apply and reset footer, built on Drawer. */
export const FilterSheet = forwardRef<HTMLDialogElement, FilterSheetProps>(
  (
    {
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      trigger,
      triggerLabel = "Filters",
      title = "Filters",
      description,
      activeCount = 0,
      onApply,
      onReset,
      applyLabel = "Apply filters",
      resetLabel = "Reset",
      formatCount = defaultFormat,
      side = "right",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })

    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {trigger !== null && (
          <DrawerTrigger asChild>
            {trigger ?? (
              <Button
                variant="outline"
                leading={<FilterIcon />}
                aria-label={
                  activeCount > 0 ? `${triggerLabel}, ${activeCount} active` : undefined
                }
                className="kg-filter-sheet__trigger"
              >
                {triggerLabel}
                {activeCount > 0 && (
                  <span
                    className={cx(
                      "kg-filter-sheet__count inline-grid place-items-center min-w-[1.25rem] h-[1.25rem] px-[5px] ms-0.5",
                      "text-kg-xs font-bold tabular-nums leading-none text-kg-accent-fg bg-kg-accent rounded-full",
                      "animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
                    )}
                    aria-hidden="true"
                  >
                    {activeCount}
                  </span>
                )}
              </Button>
            )}
          </DrawerTrigger>
        )}
        <DrawerContent
          ref={ref}
          side={side}
          className={cx("kg-filter-sheet", className)}
          {...props}
        >
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description != null && (
              <DrawerDescription>{description}</DrawerDescription>
            )}
          </DrawerHeader>
          <DrawerBody className="kg-filter-sheet__body grid content-start gap-6">{children}</DrawerBody>
          <DrawerFooter stretch={false} className="kg-filter-sheet__footer items-center">
            <span
              className="kg-filter-sheet__readout min-w-0 flex-auto text-kg-sm font-medium tabular-nums text-kg-fg data-empty:text-kg-fg-muted"
              data-empty={activeCount === 0 || undefined}
              aria-live="polite"
            >
              {formatCount(activeCount)}
            </span>
            {onReset && (
              <Button variant="ghost" disabled={activeCount === 0} onClick={onReset}>
                {resetLabel}
              </Button>
            )}
            <Button
              onClick={() => {
                onApply?.()
                setOpen(false)
              }}
            >
              {applyLabel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  },
)

FilterSheet.displayName = "FilterSheet"

export interface FilterSheetSectionProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "title"
> {
  title: string
  icon?: ReactNode
  /** Selected values in this section, shown beside the title. */
  count?: number
  /** Shows a Clear button while `count` is above zero. */
  onClear?: () => void
  clearLabel?: string
}

export const FilterSheetSection = forwardRef<HTMLElement, FilterSheetSectionProps>(
  (
    {
      title,
      icon,
      count = 0,
      onClear,
      clearLabel = "Clear",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const id = useId()
    return (
      <section
        ref={ref}
        aria-labelledby={id}
        className={cx("kg-filter-sheet__section grid gap-3", className)}
        {...props}
      >
        <div className="kg-filter-sheet__section-head flex items-center gap-2 min-h-[1.5rem]">
          {icon != null && (
            <span
              className="kg-filter-sheet__section-icon grid place-items-center shrink-0 size-[1.375rem] text-kg-fg bg-kg-paper-sage rounded-kg-sm [&_svg]:size-[0.8125rem]"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <h3 id={id} className="kg-filter-sheet__section-title m-0 text-kg-sm font-semibold text-kg-fg">
            {title}
          </h3>
          {count > 0 && (
            <span className="kg-filter-sheet__section-count px-1.5 text-kg-xs font-semibold tabular-nums leading-[1.25rem] text-kg-fg bg-kg-paper-sage rounded-full">
              {count}
            </span>
          )}
          <span className="kg-filter-sheet__rule flex-1 min-w-3 h-px bg-kg-border" aria-hidden="true" />
          {onClear && count > 0 && (
            <button
              type="button"
              className={cx(
                "kg-filter-sheet__clear h-[1.5rem] px-2 [font-family:inherit] text-kg-xs font-medium text-kg-fg-muted",
                "bg-transparent border-0 rounded-kg-sm cursor-pointer transition-colors duration-(--kg-duration-fast) ease-kg-out",
                "hover:text-[color-mix(in_oklab,var(--kg-danger),var(--kg-fg)_30%)] hover:bg-kg-paper-rose",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
              )}
              aria-label={`${clearLabel} ${title}`}
              onClick={onClear}
            >
              {clearLabel}
            </button>
          )}
        </div>
        {children}
      </section>
    )
  },
)

FilterSheetSection.displayName = "FilterSheetSection"
