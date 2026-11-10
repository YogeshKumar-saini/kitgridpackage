"use client"

import { forwardRef, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { Avatar, type AvatarStatus } from "../avatar/avatar.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  type DropdownMenuContentProps,
  DropdownMenuTrigger,
} from "../dropdown-menu/dropdown-menu.js"

export interface UserMenuProps extends DropdownMenuContentProps {
  name: string
  email?: string
  avatar?: string
  status?: AvatarStatus
  /** A badge beside the email in the header, such as a PlanBadge. */
  badge?: ReactNode
  /** Shows the name beside the avatar in the trigger. */
  showName?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Names the trigger. Defaults to "Account menu for <name>". */
  triggerLabel?: string
  triggerClassName?: string
  /** DropdownMenuItem, DropdownMenuSeparator and friends. */
  children?: ReactNode
}

/** The account avatar in a top bar, opening a menu with a who-am-I header. */
export const UserMenu = forwardRef<HTMLDivElement, UserMenuProps>(
  (
    {
      name,
      email,
      avatar,
      status,
      badge,
      showName = false,
      open,
      defaultOpen,
      onOpenChange,
      triggerLabel,
      triggerClassName,
      align = "end",
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        className={cx(
          "kg-user-menu__trigger group inline-flex h-kg-md items-center gap-2 rounded-full border-0 bg-transparent",
          "[font-family:inherit] text-kg-sm font-medium text-kg-fg cursor-pointer",
          "transition-colors duration-(--kg-duration-fast) ease-kg-out interactive:hover:bg-kg-muted aria-expanded:bg-kg-muted",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          showName ? "ps-1 pe-2.5" : "px-1",
          triggerClassName,
        )}
        aria-label={showName ? undefined : (triggerLabel ?? `Account menu for ${name}`)}
        data-show-name={showName || undefined}
      >
        <Avatar size="sm" name={name} src={avatar} status={status} aria-hidden="true" />
        {showName && <span className="kg-user-menu__trigger-name">{name}</span>}
        {showName && (
          <svg
            className="kg-user-menu__chevron size-3.5 shrink-0 text-kg-fg-muted transition-transform duration-(--kg-duration-base) ease-kg-spring group-aria-expanded:rotate-180 motion-reduce:transition-none"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path d="m4.5 6.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        ref={ref}
        align={align}
        className={cx("kg-user-menu [--_menu-width:15rem]", className)}
        aria-label={triggerLabel ?? `Account menu for ${name}`}
        {...props}
      >
        <div className="kg-user-menu__header -mx-1 -mt-1 mb-1 flex items-center gap-3 border-b-2 border-kg-ink p-3">
          <Avatar size="md" name={name} src={avatar} status={status} aria-hidden="true" />
          <div className="kg-user-menu__who grid min-w-0 gap-0.5">
            <span className="kg-user-menu__name truncate text-kg-sm font-semibold text-kg-fg">{name}</span>
            {(email || badge) && (
              <span className="kg-user-menu__line flex min-w-0 items-center gap-2">
                {email && <span className="kg-user-menu__email truncate text-kg-xs text-kg-fg-muted">{email}</span>}
                {badge}
              </span>
            )}
          </div>
        </div>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  ),
)

UserMenu.displayName = "UserMenu"
