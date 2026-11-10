"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useState } from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

/* Paper Layers: chips are small paper tabs with an ink edge; tones pick the paper colour. */
const listVariants = variants({
  base: "kg-chip-list m-0 flex list-none flex-wrap gap-1.5 p-0",
  variants: {
    size: {
      sm: "[--_h:1.375rem] [--_fs:var(--kg-text-xs)]",
      md: "[--_h:1.75rem] [--_fs:var(--kg-text-sm)]",
    },
  },
  defaults: { size: "md" },
})

const chip =
  "inline-flex h-(--_h) items-center gap-[0.3125rem] whitespace-nowrap rounded-full border-2 px-[calc(var(--_h)*0.42)] text-(length:--_fs) leading-none font-medium text-kg-fg"

const chipVariants = variants({
  base: [
    "kg-chip-list__chip border-kg-ink",
    chip,
    "data-revealed:transition-[opacity,scale,rotate] data-revealed:duration-(--kg-duration-slow) data-revealed:ease-kg-spring",
    "data-revealed:starting:scale-85 data-revealed:starting:-rotate-6 data-revealed:starting:opacity-0",
  ],
  variants: {
    tone: {
      neutral: "bg-kg-surface",
      accent: "bg-kg-paper-sage",
      success: "bg-kg-paper-sage",
      warning: "bg-kg-paper-butter",
      danger: "bg-kg-paper-rose",
      info: "bg-kg-paper-sky",
    },
  },
  defaults: { tone: "neutral" },
})

export type ChipListSize = "sm" | "md"
export type ChipListTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info"

export interface ChipListItem {
  label: string
  icon?: ReactNode
  tone?: ChipListTone
  key?: string
}

export interface ChipListLabels {
  /** Text for the overflow chip, given the hidden count. */
  more?: (count: number) => string
  less?: string
}

export interface ChipListProps extends HTMLAttributes<HTMLUListElement> {
  items: (string | ChipListItem)[]
  /** Chips shown before collapsing the rest into a “+N” chip. */
  max?: number
  size?: ChipListSize
  labels?: ChipListLabels
}

const normalize = (item: string | ChipListItem): ChipListItem =>
  typeof item === "string" ? { label: item } : item

/** A read-only set of chips that folds the overflow into an expandable “+N”. */
export const ChipList = forwardRef<HTMLUListElement, ChipListProps>(
  ({ items, max, size = "md", labels, className, ...props }, ref) => {
    const [open, setOpen] = useState(false)
    const all = items.map(normalize)
    const limit = max !== undefined && max >= 0 && all.length > max ? max : all.length
    const visible = open ? all : all.slice(0, limit)
    const hidden = all.length - limit
    const more = labels?.more ?? ((count: number) => `+${count}`)

    return (
      <ul
        ref={ref}
        className={listVariants({ size, className })}
        data-size={size}
        {...props}
      >
        {visible.map((item, index) => (
          <li
            key={item.key ?? `${item.label}-${index}`}
            className={chipVariants({ tone: item.tone ?? "neutral" })}
            data-tone={item.tone ?? "neutral"}
            data-revealed={open && index >= limit ? true : undefined}
          >
            {item.icon && (
              <span className="kg-chip-list__icon inline-flex [&_svg]:size-[0.875em]" aria-hidden="true">
                {item.icon}
              </span>
            )}
            {item.label}
          </li>
        ))}
        {hidden > 0 && (
          <li className="kg-chip-list__more-item inline-flex">
            <button
              type="button"
              className={cx(
                "kg-chip-list__more cursor-pointer border-dashed border-kg-ink bg-kg-muted tabular-nums",
                chip,
                "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out hover:-translate-px hover:shadow-kg-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
              )}
              aria-expanded={open}
              aria-label={open ? (labels?.less ?? "Show fewer") : `Show ${hidden} more`}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? (labels?.less ?? "Less") : more(hidden)}
            </button>
          </li>
        )}
      </ul>
    )
  },
)
ChipList.displayName = "ChipList"
