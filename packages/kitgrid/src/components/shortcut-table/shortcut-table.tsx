import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { Kbd } from "../kbd/kbd.js"

export interface ShortcutTableItem {
  /** One combination in `Kbd` form, e.g. `["mod", "k"]`, or several alternatives. */
  keys: readonly string[] | readonly (readonly string[])[]
  description: ReactNode
  /** Rows sharing a group are listed together under its name, in first-seen order. */
  group?: string
}

export interface ShortcutTableProps extends HTMLAttributes<HTMLDivElement> {
  shortcuts: readonly ShortcutTableItem[]
  /** Joins alternative combinations. */
  orLabel?: string
}

const combos = (keys: ShortcutTableItem["keys"]): (readonly string[])[] =>
  keys.length > 0 && typeof keys[0] !== "string"
    ? (keys as readonly (readonly string[])[]).slice()
    : [keys as readonly string[]]

/** A reference sheet of keyboard shortcuts. Server-safe. */
export const ShortcutTable = forwardRef<HTMLDivElement, ShortcutTableProps>(
  ({ shortcuts, orLabel = "or", className, ...props }, ref) => {
    const groups = [...new Set(shortcuts.map((item) => item.group ?? ""))]
    return (
      <div ref={ref} className={cx("kg-shortcut-table grid gap-6", className)} {...props}>
        {groups.map((group) => (
          <table key={group} className="kg-shortcut-table__group w-full border-collapse">
            {group && (
              <caption className="kg-shortcut-table__caption pb-1.5 text-kg-sm font-semibold text-kg-fg text-start">{group}</caption>
            )}
            <tbody>
              {shortcuts
                .filter((item) => (item.group ?? "") === group)
                .map((item, index) => (
                  <tr key={index} className="kg-shortcut-table__row border-t border-kg-border last:border-b">
                    <th scope="row" className="kg-shortcut-table__description py-2.5 pe-4 text-kg-base font-normal text-kg-fg-muted text-start">
                      {item.description}
                    </th>
                    <td className="kg-shortcut-table__keys py-2 text-end whitespace-nowrap">
                      {combos(item.keys).map((combo, at) => (
                        <span
                          key={combo.join("+")}
                          className="kg-shortcut-table__combo inline-flex items-center"
                        >
                          {at > 0 && (
                            <span className="kg-shortcut-table__or mx-2 text-kg-xs text-kg-fg-faint">{orLabel}</span>
                          )}
                          <Kbd keys={[...combo]} />
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ))}
      </div>
    )
  },
)

ShortcutTable.displayName = "ShortcutTable"
