"use client"

import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"

export interface FolderProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onChange"
> {
  /** Accessible name, such as "Q3 reports". */
  label: string
  /** Up to three sheets that rise out when the folder opens. Decorative: keep them short. */
  papers?: ReactNode[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const PAPER_CLASSES = [
  "inset-[10%_10%_8%] bg-kg-surface-raised group-data-[state=open]/folder:[transform:translate(-62%,-42%)_rotate(-14deg)]",
  "inset-[10%_14%_8%] bg-kg-paper-sky group-data-[state=open]/folder:[transform:translate(0,-62%)_rotate(2deg)]",
  "inset-[10%_18%_8%] bg-kg-paper-rose group-data-[state=open]/folder:[transform:translate(62%,-42%)_rotate(14deg)]",
] as const

/**
 * A folder that tips its front flap open and fans its papers up. It is a toggle button;
 * hovering lets the papers peek out first.
 */
export const Folder = forwardRef<HTMLButtonElement, FolderProps>(
  (
    {
      label,
      papers = [null, null, null],
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      className,
      onClick,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const sheets = papers.slice(0, 3)

    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          "kg-folder group/folder relative inline-grid h-[calc(var(--_size)*1.5)] w-[calc(var(--_size)*1.6)] cursor-pointer place-items-center rounded-kg-xl border-0 bg-transparent p-0 text-inherit [--_back:color-mix(in_oklab,_var(--_color),var(--kg-fg)_22%)] [--_color:var(--kg-folder-color,var(--kg-paper-butter))] [--_size:var(--kg-folder-size,7rem)] [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          className,
        )}
        aria-label={label}
        aria-pressed={open}
        data-state={open ? "open" : "closed"}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) setOpen((value) => !value)
        }}
        {...props}
      >
        <span
          className="kg-folder__art relative mt-[calc(var(--_size)*0.35)] h-[calc(var(--_size)*0.8)] w-(--_size) transition-transform duration-(--kg-duration-slow) ease-kg-out [perspective:600px] group-hover/folder:-translate-y-[3px]"
          aria-hidden="true"
        >
          <span className="kg-folder__back absolute inset-0 rounded-kg-lg rounded-tl-none border-2 border-kg-ink bg-(--_back) shadow-kg-md before:absolute before:bottom-full before:-left-[2px] before:h-[12%] before:w-[38%] before:rounded-t-kg-sm before:border-2 before:border-b-0 before:border-kg-ink before:bg-(--_back) before:content-['']" />
          {sheets.map((paper, i) => (
            <span
              key={i}
              className={cx(
                "kg-folder__paper absolute grid place-items-center overflow-hidden rounded-kg-md border-2 border-kg-ink text-[length:calc(var(--_size)*0.11)] text-kg-fg shadow-kg-xs transition-transform duration-(--kg-duration-spring) ease-kg-spring [transform:translateY(8%)] group-data-[state=closed]/folder:group-hover/folder:[transform:translateY(-6%)]",
                PAPER_CLASSES[i],
              )}
              data-index={i}
            >
              {paper}
            </span>
          ))}
          <span className="kg-folder__front absolute inset-[12%_0_0] origin-bottom rounded-kg-lg border-2 border-kg-ink bg-(--_color) shadow-kg-sm transition-transform duration-(--kg-duration-spring) ease-kg-spring group-data-[state=closed]/folder:group-hover/folder:[transform:rotateX(-14deg)] group-data-[state=open]/folder:[transform:rotateX(-42deg)_translateY(4%)]" />
        </span>
      </button>
    )
  },
)

Folder.displayName = "Folder"
