import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { Avatar } from "../avatar/avatar.js"
import { Badge, type BadgeTone } from "../badge/badge.js"

export type MemberListStatus = "active" | "invited" | "paused" | "suspended"
export type MemberListDensity = "compact" | "default"

export interface MemberListMember {
  id: string
  name: string
  email?: string
  /** Image URL. Initials are drawn when it is missing or fails. */
  avatar?: string
  role?: ReactNode
  roleTone?: BadgeTone
  status?: MemberListStatus
  /** Overrides the status wording, e.g. "Access until Nov 30". */
  statusLabel?: ReactNode
  /** Marks the signed-in person. */
  self?: boolean
  /** A quieter line under the email: team, last seen. */
  meta?: ReactNode
}

export interface MemberListLabels {
  status?: Partial<Record<MemberListStatus, string>>
  self?: string
}

export interface MemberListProps extends HTMLAttributes<HTMLUListElement> {
  members: readonly MemberListMember[]
  /** Controls at the end of each row: a role select, a menu, a remove button. */
  actions?: (member: MemberListMember) => ReactNode
  /** Shown instead of the list when there are no members. */
  empty?: ReactNode
  density?: MemberListDensity
  labels?: MemberListLabels
}

const statusWords: Record<MemberListStatus, string> = {
  active: "Active",
  invited: "Invited",
  paused: "Paused",
  suspended: "Suspended",
}

const statusDot: Record<MemberListStatus, string> = {
  active: "before:bg-kg-success",
  invited: "before:shadow-[inset_0_0_0_1.5px_var(--kg-info)]",
  paused: "before:bg-kg-warning",
  suspended: "before:bg-kg-danger",
}

const itemClass = [
  "kg-member-list__item grid grid-cols-[auto_minmax(0,1fr)_6rem_8.5rem_auto] items-center gap-3 px-2 py-(--_row)",
  "border-b border-kg-border last:border-b-0 transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted/70",
  "@max-[36rem]:grid-cols-[auto_minmax(0,1fr)_auto] @max-[36rem]:gap-y-1",
].join(" ")

const ellipsis = "truncate text-kg-xs"

/**
 * People with access: avatar, name, email, role and status, with room for row actions.
 * Status is always written out, never colour alone. Server-safe.
 */
export const MemberList = forwardRef<HTMLUListElement, MemberListProps>(
  (
    { members, actions, empty, density = "default", labels, className, ...props },
    ref,
  ) => {
    if (members.length === 0 && empty != null)
      return <div className="kg-member-list__empty px-0 py-8 text-center text-kg-fg-muted">{empty}</div>
    const words = { ...statusWords, ...labels?.status }
    return (
      <ul
        ref={ref}
        className={cx(
          "kg-member-list @container m-0 grid min-w-0 list-none p-0",
          density === "compact" ? "[--_row:calc(var(--kg-space)*2)]" : "[--_row:calc(var(--kg-space)*3)]",
          className,
        )}
        data-density={density}
        {...props}
      >
        {members.map((member) => {
          const dim = member.status === "paused" || member.status === "suspended"
          return (
          <li
            key={member.id}
            className={itemClass}
            data-status={member.status}
          >
            <Avatar
              className={cx("kg-member-list__avatar col-start-1", dim && "opacity-60")}
              name={member.name}
              src={member.avatar}
              size={density === "compact" ? "sm" : "md"}
              aria-hidden="true"
            />
            <div className={cx("kg-member-list__who col-start-2 grid min-w-0", dim && "opacity-60")}>
              <span className="kg-member-list__name flex min-w-0 items-center gap-1.5 overflow-hidden text-kg-sm font-[580] text-ellipsis whitespace-nowrap text-kg-fg">
                {member.name}
                {member.self && (
                  <span className="kg-member-list__self shrink-0 rounded-full bg-kg-paper-sage px-1.5 text-[0.6875rem] leading-[1.125rem] font-[560] text-kg-fg">
                    {labels?.self ?? "You"}
                  </span>
                )}
              </span>
              {member.email && (
                <span className={cx("kg-member-list__email text-kg-fg-muted", ellipsis)}>
                  {member.email}
                </span>
              )}
              {member.meta != null && (
                <span className={cx("kg-member-list__meta text-kg-fg-faint", ellipsis)}>
                  {member.meta}
                </span>
              )}
            </div>
            {member.role != null && (
              <Badge
                className="kg-member-list__role col-start-3 justify-self-start @max-[36rem]:col-start-2 @max-[36rem]:row-start-2"
                tone={member.roleTone ?? "neutral"}
                size="sm"
              >
                {member.role}
              </Badge>
            )}
            {member.status && (
              <span
                className={cx(
                  "kg-member-list__status col-start-4 inline-flex items-center gap-1.5 text-kg-xs whitespace-nowrap text-kg-fg-muted",
                  "before:size-[0.4375rem] before:shrink-0 before:rounded-full before:content-['']",
                  "@max-[36rem]:col-start-2 @max-[36rem]:row-start-2 @max-[36rem]:justify-self-end",
                  statusDot[member.status],
                )}
                data-status={member.status}
              >
                {member.statusLabel ?? words[member.status]}
              </span>
            )}
            {actions && (
              <div className="kg-member-list__actions col-start-5 flex items-center justify-end gap-1 @max-[36rem]:col-start-3 @max-[36rem]:row-span-2 @max-[36rem]:row-start-1">
                {actions(member)}
              </div>
            )}
          </li>
          )
        })}
      </ul>
    )
  },
)

MemberList.displayName = "MemberList"
