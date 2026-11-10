import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export type SeparatorOrientation = "horizontal" | "vertical"
export type SeparatorLabelPosition = "start" | "center" | "end"

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: SeparatorOrientation
  /**
   * Purely visual by default. Set false when the line divides content in a way assistive
   * technology should know about; it then becomes role="separator".
   */
  decorative?: boolean
  /** Text in the middle of a horizontal rule, such as “or”. */
  label?: ReactNode
  labelPosition?: SeparatorLabelPosition
}

/* --kg-separator-color is public: set it on any ancestor to recolour the rule. */
const base = "kg-separator shrink-0 [--_color:var(--kg-separator-color,var(--kg-border))]"

const LABELLED: Record<SeparatorLabelPosition, string> = {
  start: "before:w-4 before:flex-none after:flex-1",
  center: "before:flex-1 after:flex-1",
  end: "before:flex-1 after:w-4 after:flex-none",
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      orientation = "horizontal",
      decorative = true,
      label,
      labelPosition = "center",
      className,
      ...props
    },
    ref,
  ) => {
    const labelled = label != null && orientation === "horizontal"
    // A separator's children are presentational, so a semantic one carries its label by name.
    const semantic = decorative
      ? { role: "none" }
      : {
          role: "separator",
          "aria-orientation": orientation,
          "aria-label": labelled && typeof label === "string" ? label : undefined,
        }

    return (
      <div
        ref={ref}
        className={cx(
          base,
          labelled
            ? [
                "flex w-full items-center gap-3 before:h-px before:bg-(--_color) after:h-px after:bg-(--_color)",
                LABELLED[labelPosition] ?? LABELLED.center,
              ]
            : orientation === "vertical"
              ? "min-h-[1em] w-px self-stretch bg-(--_color)"
              : "h-px w-full bg-(--_color)",
          className,
        )}
        data-orientation={orientation}
        data-label-position={labelled ? labelPosition : undefined}
        {...semantic}
        {...props}
      >
        {labelled && <span className="kg-separator__label shrink-0 text-kg-xs font-semibold leading-[1.2] tracking-[0.02em] text-kg-fg-muted">{label}</span>}
      </div>
    )
  },
)

Separator.displayName = "Separator"
