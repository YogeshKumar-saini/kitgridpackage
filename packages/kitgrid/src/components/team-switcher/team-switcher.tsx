"use client"

import { forwardRef, type ReactNode } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { hueFromString } from "../avatar/avatar-utils.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  type DropdownMenuContentProps,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu/dropdown-menu.js"

export interface TeamSwitcherTeam {
  id: string
  name: string
  /** Short key shown on the swatch, e.g. "ENG". Defaults to the first letter. */
  key?: string
  /** A display-only hint such as "⌘1". */
  shortcut?: ReactNode
}

export interface TeamSwitcherProps
  extends Omit<DropdownMenuContentProps, "defaultValue" | "onChange"> {
  teams: readonly TeamSwitcherTeam[]
  value?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  onCreate?: () => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Group heading inside the menu. */
  label?: string
  createLabel?: string
  triggerClassName?: string
  /** Collapses the trigger to the swatch alone (rail sidebars). */
  compact?: boolean
}

const papers = [
  "bg-kg-paper-sage",
  "bg-kg-paper-peach",
  "bg-kg-paper-sky",
  "bg-kg-paper-butter",
  "bg-kg-paper-rose",
]

/* Paper Layers: the team key sits on a slip of category paper picked from the name. */
const Swatch = ({ team }: { team?: TeamSwitcherTeam }) => (
  <span
    className={cx(
      "kg-team-switcher__swatch grid h-5.5 min-w-5.5 shrink-0 place-items-center rounded-kg-xs border-2 border-kg-ink px-1",
      "text-[0.625rem] font-bold leading-none tracking-[0.02em] uppercase text-kg-fg",
      team ? papers[hueFromString(team.name) % papers.length] : "bg-kg-muted",
    )}
    aria-hidden="true"
  >
    {team?.key ?? team?.name.trim()[0] ?? "?"}
  </span>
)

/** A menu button for the active team, listing the others as radio items. */
export const TeamSwitcher = forwardRef<HTMLDivElement, TeamSwitcherProps>(
  (
    {
      teams,
      value: valueProp,
      defaultValue,
      onValueChange,
      onCreate,
      open,
      defaultOpen,
      onOpenChange,
      label = "Teams",
      createLabel = "New team",
      triggerClassName,
      compact = false,
      align = "start",
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? teams[0]?.id,
      onChange: (next) => {
        if (next != null) onValueChange?.(next)
      },
    })
    const current = teams.find((team) => team.id === value)
    return (
      <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger
          className={cx(
            "kg-team-switcher__trigger group inline-flex h-kg-md max-w-full items-center gap-2 rounded-kg-md border-2 border-transparent",
            "[font-family:inherit] text-kg-sm font-semibold text-kg-fg bg-transparent cursor-pointer",
            "transition-colors duration-(--kg-duration-fast) ease-kg-out",
            "interactive:hover:bg-kg-muted aria-expanded:bg-kg-muted",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            compact ? "w-kg-md justify-center p-0" : "ps-1.5 pe-2",
            triggerClassName,
          )}
          data-compact={compact || undefined}
          aria-label={compact ? `${label}: ${current?.name ?? ""}` : undefined}
        >
          <Swatch team={current} />
          {!compact && <span className="kg-team-switcher__name min-w-0 truncate">{current?.name}</span>}
          {!compact && (
            <svg
              className="kg-team-switcher__chevron size-3.5 shrink-0 text-kg-fg-muted transition-transform duration-(--kg-duration-base) ease-kg-spring group-aria-expanded:rotate-180 motion-reduce:transition-none"
              viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m4.5 6.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          ref={ref}
          align={align}
          className={cx("kg-team-switcher [--_menu-width:14rem]", className)}
          {...props}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
              {teams.map((team) => (
                <DropdownMenuRadioItem
                  key={team.id}
                  value={team.id}
                  textValue={team.name}
                  shortcut={team.shortcut}
                  closeOnSelect
                >
                  <span className="kg-team-switcher__row inline-flex items-center gap-2">
                    <Swatch team={team} />
                    {team.name}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          {onCreate && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onCreate}
                icon={
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                }
              >
                {createLabel}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
)

TeamSwitcher.displayName = "TeamSwitcher"
