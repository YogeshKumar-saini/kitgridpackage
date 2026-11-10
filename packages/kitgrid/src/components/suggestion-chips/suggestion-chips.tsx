import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { SparkleIcon } from "../chat-message/internal/icons.js"

export interface SuggestionChipsOption {
  value: string
  /** Defaults to the value. */
  label?: ReactNode
  /** Replaces the sparkle. Pass `null` for none. */
  icon?: ReactNode
}

export type SuggestionChipsLayout = "wrap" | "grid" | "list"

export interface SuggestionChipsProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onSelect"
> {
  suggestions: readonly (string | SuggestionChipsOption)[]
  onSelect?: (value: string) => void
  /** `wrap` for short follow-ups, `grid` for two-up starter cards, `list` for a column. */
  layout?: SuggestionChipsLayout
  /** A visible title above the chips, which also names the group. */
  title?: string
  disabled?: boolean
}

const listVariants = variants({
  base: "kg-suggestion-chips__list m-0 list-none gap-1.5 p-0 [&>li]:flex [&>li]:min-w-0",
  variants: {
    layout: {
      wrap: "flex flex-wrap",
      list: "flex flex-col",
      grid: "grid grid-cols-[repeat(auto-fill,minmax(min(15rem,100%),1fr))]",
    },
  },
  defaults: { layout: "wrap" },
})

/* Paper Layers: each suggestion is an ink-edged sheet that lifts on hover and settles on press. */
const chipVariants = variants({
  base: [
    "kg-suggestion-chips__chip group/chip inline-flex min-h-kg-sm min-w-0 flex-1 cursor-pointer gap-2 border-2 border-kg-ink bg-kg-surface",
    "text-start [font:inherit] text-kg-sm leading-[1.35] text-kg-fg",
    "transition-[translate,box-shadow,background-color] duration-(--kg-duration-fast) ease-kg-out",
    "interactive:hover:-translate-px interactive:hover:bg-kg-paper-sage interactive:hover:shadow-kg-xs",
    "interactive:active:translate-0 interactive:active:shadow-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  ],
  variants: {
    layout: {
      wrap: "items-center rounded-full px-3 py-1.5",
      list: "items-start rounded-kg-lg px-3 py-2.5",
      grid: "items-start rounded-kg-lg px-3 py-2.5",
    },
  },
  defaults: { layout: "wrap" },
})

/** Starter questions or follow-ups, one click from being asked. Server-component safe. */
export const SuggestionChips = forwardRef<HTMLDivElement, SuggestionChipsProps>(
  (
    {
      suggestions,
      onSelect,
      layout = "wrap",
      title,
      disabled = false,
      className,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel ?? title ?? "Suggestions"}
      className={cx("kg-suggestion-chips flex min-w-0 flex-col gap-2", className)}
      data-layout={layout}
      {...props}
    >
      {title && (
        <span className="kg-suggestion-chips__title text-kg-xs font-semibold text-kg-fg-faint" aria-hidden="true">
          {title}
        </span>
      )}
      <ul className={listVariants({ layout })}>
        {suggestions.map((item) => {
          const option = typeof item === "string" ? { value: item } : item
          const icon = option.icon === undefined ? <SparkleIcon /> : option.icon
          return (
            <li key={option.value}>
              <button
                type="button"
                className={chipVariants({ layout })}
                disabled={disabled}
                onClick={() => onSelect?.(option.value)}
              >
                {icon != null && (
                  <span className={cx("kg-suggestion-chips__icon inline-flex shrink-0 text-[0.875rem] text-kg-fg-muted group-hover/chip:text-kg-fg", layout !== "wrap" && "mt-[0.15em]")} aria-hidden="true">
                    {icon}
                  </span>
                )}
                <span className="kg-suggestion-chips__label min-w-0">
                  {option.label ?? option.value}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  ),
)

SuggestionChips.displayName = "SuggestionChips"
