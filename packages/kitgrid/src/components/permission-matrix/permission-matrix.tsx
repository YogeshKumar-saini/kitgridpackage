"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { Checkbox } from "../checkbox/checkbox.js"
import { Switch } from "../switch/switch.js"

export type PermissionMatrixControl = "checkbox" | "switch"
/** Granted permission ids per role id: `{ admin: ["billing", "export"] }`. */
export type PermissionMatrixValue = Record<string, readonly string[]>

export interface PermissionMatrixRole {
  id: string
  label: ReactNode
  description?: ReactNode
}

export interface PermissionMatrixPermission {
  id: string
  label: ReactNode
  description?: ReactNode
  /** Permissions sharing a group sit under one group heading, in first-seen order. */
  group?: string
}

export interface PermissionMatrixLabels {
  /** Read before a role name on the column toggle, e.g. "Grant all to". */
  allFor?: string
  permission?: string
}

export interface PermissionMatrixProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  roles: readonly PermissionMatrixRole[]
  permissions: readonly PermissionMatrixPermission[]
  value?: PermissionMatrixValue
  defaultValue?: PermissionMatrixValue
  onValueChange?: (value: PermissionMatrixValue) => void
  /** Cells that can't change, in the same shape as `value`. */
  locked?: PermissionMatrixValue
  control?: PermissionMatrixControl
  /** A checkbox per role header that grants or clears the whole column. */
  columnToggles?: boolean
  disabled?: boolean
  caption?: ReactNode
  hideCaption?: boolean
  labels?: PermissionMatrixLabels
}

interface Cell {
  row: number
  col: number
}

const headCell =
  "px-3 py-2 align-bottom text-kg-xs font-[560] tracking-[0.01em] text-kg-fg-muted border-b-2 border-kg-ink"

/* Rows rule off in hairlines, the last row of the last group closes without one. */
const rowClass = [
  "kg-permission-matrix__row transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "*:border-b *:border-kg-border hover:bg-kg-muted/70 has-focus-visible:bg-kg-muted/70",
].join(" ")

const has = (value: PermissionMatrixValue | undefined, role: string, permission: string) =>
  value?.[role]?.includes(permission) ?? false

/**
 * Roles across, permissions down, a checkbox or switch in every cell. A WAI-ARIA grid: one
 * Tab stop, arrows move between cells, Home and End go to the row ends, Ctrl+Home and Ctrl+End
 * to the corners, Space toggles. Each cell is named by its permission and role headers.
 */
export const PermissionMatrix = forwardRef<HTMLDivElement, PermissionMatrixProps>(
  (
    {
      roles,
      permissions,
      value: valueProp,
      defaultValue = {},
      onValueChange,
      locked,
      control = "checkbox",
      columnToggles = false,
      disabled = false,
      caption,
      hideCaption = false,
      labels,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const id = useId()
    const table = useRef<HTMLTableElement>(null)
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const [value, setValue] = useControllableState<PermissionMatrixValue>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const firstRow = columnToggles ? 0 : 1
    const [active, setActive] = useState<Cell>({ row: firstRow, col: 0 })

    const groups: { name: string | undefined; items: PermissionMatrixPermission[] }[] = []
    for (const permission of permissions) {
      const group = groups.find((entry) => entry.name === permission.group)
      if (group) group.items.push(permission)
      else groups.push({ name: permission.group, items: [permission] })
    }
    const ordered = groups.flatMap((group) => group.items)
    const lastRow = ordered.length

    const setCell = (role: string, permission: string, on: boolean) =>
      setValue((current) => {
        const granted = current[role] ?? []
        const next = on
          ? [...granted.filter((p) => p !== permission), permission]
          : granted.filter((p) => p !== permission)
        return { ...current, [role]: next }
      })

    const setColumn = (role: string, on: boolean) =>
      setValue((current) => {
        const granted = current[role] ?? []
        const keep = ordered
          .filter((p) => has(locked, role, p.id) && granted.includes(p.id))
          .map((p) => p.id)
        const open = ordered.filter((p) => !has(locked, role, p.id)).map((p) => p.id)
        const outside = granted.filter((p) => !ordered.some((o) => o.id === p))
        return { ...current, [role]: [...outside, ...keep, ...(on ? open : [])] }
      })

    const focusCell = (row: number, col: number, rowStep: number, colStep: number) => {
      let r = row
      let c = col
      while (r >= firstRow && r <= lastRow && c >= 0 && c < roles.length) {
        const input = table.current?.querySelector<HTMLInputElement>(
          `[data-row="${r}"][data-col="${c}"]`,
        )
        if (input && !input.disabled) {
          input.focus()
          return
        }
        r += rowStep
        c += colStep
        if (rowStep === 0 && colStep === 0) return
      }
    }

    const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
      const target = event.target as HTMLElement
      if (target.dataset.row === undefined) return
      const row = Number(target.dataset.row)
      const col = Number(target.dataset.col)
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
      const right = rtl ? -1 : 1
      const end = roles.length - 1
      const moves: Record<string, () => void> = {
        ArrowRight: () => focusCell(row, col + right, 0, right),
        ArrowLeft: () => focusCell(row, col - right, 0, -right),
        ArrowDown: () => focusCell(row + 1, col, 1, 0),
        ArrowUp: () => focusCell(row - 1, col, -1, 0),
        Home: () =>
          event.ctrlKey ? focusCell(firstRow, 0, 0, 1) : focusCell(row, 0, 0, 1),
        End: () =>
          event.ctrlKey ? focusCell(lastRow, end, 0, -1) : focusCell(row, end, 0, -1),
      }
      const move = moves[event.key]
      if (!move) return
      event.preventDefault()
      move()
    }

    const enabled = (row: number, col: number) => {
      const role = roles[col]
      if (disabled || !role) return false
      if (row === 0) return columnToggles
      const permission = ordered[row - 1]
      return permission !== undefined && !has(locked, role.id, permission.id)
    }
    // The grid keeps exactly one Tab stop, even when the remembered cell becomes locked.
    let stop: Cell | undefined = enabled(active.row, active.col) ? active : undefined
    for (let row = firstRow; !stop && row <= lastRow; row++)
      for (let col = 0; !stop && col < roles.length; col++)
        if (enabled(row, col)) stop = { row, col }

    const cellProps = (row: number, col: number) => ({
      "data-row": row,
      "data-col": col,
      tabIndex: stop?.row === row && stop.col === col ? 0 : -1,
      onFocus: () => setActive({ row, col }),
    })

    const Control = control === "switch" ? Switch : Checkbox

    return (
      <div ref={ref} className={cx("kg-permission-matrix min-w-0 overflow-x-auto text-kg-sm text-kg-fg", className)} {...props}>
        <span id={`${id}-all`} hidden>
          {labels?.allFor ?? "Grant all to"}
        </span>
        <table
          ref={table}
          role="grid"
          className="kg-permission-matrix__table w-full border-separate border-spacing-0"
          onKeyDown={onKeyDown}
          aria-disabled={disabled || undefined}
        >
          {caption != null && (
            <caption
              className={cx(
                "kg-permission-matrix__caption pb-3 text-start font-semibold",
                hideCaption && "kg-visually-hidden",
              )}
            >
              {caption}
            </caption>
          )}
          <thead>
            <tr>
              <th scope="col" className={cx("kg-permission-matrix__corner text-start", headCell)}>
                {labels?.permission ?? "Permission"}
              </th>
              {roles.map((role, col) => {
                const granted = ordered.filter((p) => has(value, role.id, p.id)).length
                return (
                  <th
                    key={role.id}
                    scope="col"
                    className={cx("kg-permission-matrix__role w-[7rem] text-center", headCell)}
                  >
                    <span className="kg-permission-matrix__role-text grid gap-0.5">
                      <span
                        id={`${id}-role-${col}`}
                        className="kg-permission-matrix__role-label text-kg-sm font-semibold text-kg-fg"
                      >
                        {role.label}
                      </span>
                      {role.description != null && (
                        <span className="kg-permission-matrix__role-description font-normal text-kg-fg-faint">
                          {role.description}
                        </span>
                      )}
                    </span>
                    {columnToggles && (
                      <Checkbox
                        size="sm"
                        className="kg-permission-matrix__toggle mx-auto mt-2"
                        aria-labelledby={`${id}-all ${id}-role-${col}`}
                        checked={ordered.length > 0 && granted === ordered.length}
                        indeterminate={granted > 0 && granted < ordered.length}
                        disabled={disabled}
                        onCheckedChange={(on) => setColumn(role.id, on)}
                        {...cellProps(0, col)}
                      />
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          {groups.map((group, groupIndex) => (
            <tbody key={group.name ?? `group-${groupIndex}`} className="kg-permission-matrix__group last:[&>tr:last-child>*]:border-b-0">
              {group.name !== undefined && (
                <tr className="kg-permission-matrix__group-row">
                  <th
                    scope="colgroup"
                    colSpan={roles.length + 1}
                    className="px-3 pt-4 pb-1.5 text-start text-kg-xs font-semibold tracking-[0.04em] uppercase text-kg-fg-faint"
                  >
                    {group.name}
                  </th>
                </tr>
              )}
              {group.items.map((permission) => {
                const row = ordered.indexOf(permission) + 1
                const headerId = `${id}-perm-${row}`
                return (
                  <tr key={permission.id} className={rowClass}>
                    <th scope="row" className="kg-permission-matrix__permission px-3 py-2.5 text-start font-medium">
                      <span id={headerId} className="kg-permission-matrix__permission-label block">
                        {permission.label}
                      </span>
                      {permission.description != null && (
                        <span className="kg-permission-matrix__permission-description mt-0.5 block text-kg-xs font-normal text-kg-fg-faint">
                          {permission.description}
                        </span>
                      )}
                    </th>
                    {roles.map((role, col) => {
                      const isLocked = has(locked, role.id, permission.id)
                      return (
                        <td
                          key={role.id}
                          className="kg-permission-matrix__cell px-3 py-2 text-center align-middle"
                          data-locked={isLocked || undefined}
                        >
                          <Control
                            size="sm"
                            className="mx-auto"
                            aria-labelledby={`${headerId} ${id}-role-${col}`}
                            checked={has(value, role.id, permission.id)}
                            disabled={disabled || isLocked}
                            onCheckedChange={(on) => setCell(role.id, permission.id, on)}
                            {...cellProps(row, col)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          ))}
        </table>
      </div>
    )
  },
)

PermissionMatrix.displayName = "PermissionMatrix"
