import {
  type ChangeEvent,
  type CSSProperties,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"

export interface CheckboxCardProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: ReactNode
  description?: ReactNode
  /** Decorative, shown in a tile before the text. */
  icon?: ReactNode
  /** Trailing detail such as a price or a count. */
  aside?: ReactNode
  onCheckedChange?: (checked: boolean) => void
  /** Applied to the card, not the input. */
  className?: string
  style?: CSSProperties
}

/**
 * A native checkbox drawn as a selectable card, for add-ons and multi-choice settings. The
 * whole card is the label, so it keeps form submission, reset and autofill. Server-safe.
 */
export const CheckboxCard = forwardRef<HTMLInputElement, CheckboxCardProps>(
  (
    { label, description, icon, aside, onCheckedChange, onChange, className, style, disabled, ...props },
    ref,
  ) => (
    <label
      className={cx(
        "kg-checkbox-card group/card relative isolate flex items-center gap-3 px-4 py-3.5",
        "rounded-kg-xl border-2 border-kg-ink bg-kg-surface text-kg-fg cursor-pointer",
        "transition-[translate,scale,box-shadow,background-color] duration-(--kg-duration-fast) ease-kg-out",
        // Checked is lifted onto sage; hover previews the lift.
        "has-checked:bg-kg-paper-sage has-checked:shadow-[3px_3px_0_var(--kg-ink)]",
        "hover:not-data-disabled:-translate-px hover:not-data-disabled:shadow-[3px_3px_0_var(--kg-ink)]",
        "active:not-data-disabled:scale-[0.99]",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-kg-ring",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      style={style}
      data-disabled={disabled || undefined}
    >
      <input
        ref={ref}
        type="checkbox"
        className="kg-checkbox-card__input absolute inset-0 -z-1 m-0 opacity-0 cursor-[inherit]"
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange?.(event)
          onCheckedChange?.(event.target.checked)
        }}
        {...props}
      />
      {icon != null && (
        <span
          className={cx(
            "kg-checkbox-card__icon inline-grid place-items-center shrink-0 size-9 rounded-kg-md",
            "bg-kg-muted text-kg-fg-muted [&_svg]:size-[1.125rem]",
            "transition-[background-color,color] duration-(--kg-duration-fast) ease-kg-out",
            "group-has-checked/card:bg-kg-accent group-has-checked/card:text-kg-accent-fg",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className="kg-checkbox-card__text grid flex-1 min-w-0 gap-[0.2em]">
        <span className="kg-checkbox-card__label text-kg-base font-semibold">{label}</span>
        {description != null && (
          <span className="kg-checkbox-card__description text-kg-sm text-kg-fg-muted">{description}</span>
        )}
      </span>
      {aside != null && <span className="kg-checkbox-card__aside shrink-0 text-kg-sm font-semibold tabular-nums text-kg-fg-muted">{aside}</span>}
      <span
        className={cx(
          "kg-checkbox-card__box inline-grid place-items-center shrink-0 size-5 rounded-kg-xs",
          "border-2 border-kg-ink bg-kg-surface text-kg-accent-fg",
          "transition-[background-color,border-color] duration-(--kg-duration-fast) ease-kg-out",
          "group-has-checked/card:border-kg-accent group-has-checked/card:bg-kg-accent",
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          className={cx(
            "size-[0.8rem] [stroke-dasharray:16] [stroke-dashoffset:16]",
            "transition-[stroke-dashoffset] duration-(--kg-duration-base) ease-kg-out",
            "group-has-checked/card:[stroke-dashoffset:0]",
          )}
        >
          <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  ),
)

CheckboxCard.displayName = "CheckboxCard"
