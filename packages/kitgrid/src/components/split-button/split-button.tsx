"use client"

import { forwardRef, type MouseEvent, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { Button, type ButtonSize } from "../button/button.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu/dropdown-menu.js"

export type SplitButtonVariant = "solid" | "soft" | "outline"

export interface SplitButtonAction {
  label: string
  onSelect?: () => void
  icon?: ReactNode
  shortcut?: ReactNode
  destructive?: boolean
  disabled?: boolean
  /** Draw a separator above this item. */
  separated?: boolean
}

export interface SplitButtonProps {
  /** The primary action's label. */
  children: ReactNode
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  /** Secondary actions in the attached menu. */
  actions: SplitButtonAction[]
  /** Accessible name of the menu half. */
  menuLabel?: string
  variant?: SplitButtonVariant
  size?: ButtonSize
  leading?: ReactNode
  loading?: boolean
  disabled?: boolean
  className?: string
}

/*
 * The halves share one 2px ink edge. Selectors are qualified through the group so they
 * outrank Button's own radius and padding utilities.
 */
const groupClass = [
  "kg-split-button inline-flex isolate [&>*]:relative [&>*:focus-visible]:z-1",
  String.raw`[&>.kg-split-button\_\_main]:rounded-e-none`,
  String.raw`[&>.kg-split-button\_\_menu]:-ms-[2px] [&>.kg-split-button\_\_menu]:min-w-0 [&>.kg-split-button\_\_menu]:px-2.5 [&>.kg-split-button\_\_menu]:rounded-s-none`,
  String.raw`[&[data-variant=solid]>.kg-split-button\_\_menu]:border-s-[color-mix(in_oklab,var(--kg-accent-fg)_45%,var(--kg-accent))]`,
  String.raw`[&[data-variant=soft]>.kg-split-button\_\_menu]:ms-px`,
]

const Caret = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** A primary action fused with a menu button for its alternatives. */
export const SplitButton = forwardRef<HTMLDivElement, SplitButtonProps>(
  (
    {
      children,
      onClick,
      actions,
      menuLabel = "More options",
      variant = "solid",
      size = "md",
      leading,
      loading,
      disabled = false,
      className,
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="group"
      className={cx(groupClass, className)}
      data-variant={variant}
      data-size={size}
    >
      <Button
        variant={variant}
        size={size}
        leading={leading}
        loading={loading}
        disabled={disabled}
        onClick={onClick}
        className="kg-split-button__main"
      >
        {children}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled}
            aria-label={menuLabel}
            className="kg-split-button__menu"
          >
            <span className="kg-split-button__caret grid size-4 transition-transform duration-(--kg-duration-base) ease-kg-out [[aria-expanded=true]>*>&]:rotate-180 [&_svg]:size-full">
              <Caret />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action) => [
            action.separated ? (
              <DropdownMenuSeparator key={`${action.label}-separator`} />
            ) : null,
            <DropdownMenuItem
              key={action.label}
              icon={action.icon}
              shortcut={action.shortcut}
              destructive={action.destructive}
              disabled={action.disabled}
              onSelect={() => action.onSelect?.()}
            >
              {action.label}
            </DropdownMenuItem>,
          ])}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
)

SplitButton.displayName = "SplitButton"
