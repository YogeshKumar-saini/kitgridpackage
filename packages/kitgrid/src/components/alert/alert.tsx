import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: an alert is a sheet with an ink edge. Soft fills it with the tone's paper,
 * outline keeps it white and lifts it, solid fills it with the tone itself.
 * --_muted is the description colour, picked per fill so it stays AA.
 */
const alertVariants = variants({
  base: [
    "kg-alert flex items-start gap-3 rounded-kg-lg border-2 border-kg-ink px-4 py-3.5 text-kg-base leading-[1.5]",
  ],
  variants: {
    tone: {
      info: "[--_paper:var(--kg-paper-sky)] [--_tone:var(--kg-info)] [--_tone-fg:var(--kg-info-fg)]",
      success: "[--_paper:var(--kg-paper-sage)] [--_tone:var(--kg-success)] [--_tone-fg:var(--kg-success-fg)]",
      warning: "[--_paper:var(--kg-paper-butter)] [--_tone:var(--kg-warning)] [--_tone-fg:var(--kg-warning-fg)]",
      danger: "[--_paper:var(--kg-paper-rose)] [--_tone:var(--kg-danger)] [--_tone-fg:var(--kg-danger-fg)]",
      neutral: "[--_paper:var(--kg-muted)] [--_tone:var(--kg-fg)] [--_tone-fg:var(--kg-bg)]",
    },
    variant: {
      soft: "bg-(--_paper) text-kg-fg [--_muted:var(--kg-fg)]",
      outline: "bg-kg-surface text-kg-fg shadow-kg-sm [--_muted:var(--kg-fg-muted)]",
      solid: "bg-(--_tone) text-(--_tone-fg) shadow-kg-sm [--_muted:var(--_tone-fg)]",
    },
  },
  defaults: { tone: "info", variant: "soft" },
})

type AlertVariantProps = VariantProps<typeof alertVariants>
export type AlertTone = NonNullable<AlertVariantProps["tone"]>
export type AlertVariant = NonNullable<AlertVariantProps["variant"]>

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: AlertTone
  variant?: AlertVariant
  /** Replaces the tone's default icon. `false` hides it. */
  icon?: ReactNode
  title?: ReactNode
  /** Buttons or links under the description. */
  actions?: ReactNode
  /** Adds a close button. The alert does not remove itself; unmount it in this callback. */
  onDismiss?: () => void
  dismissLabel?: string
}

const iconPaths: Record<AlertTone, ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5h.01" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.25 12.25 2.5 2.5 5-5.25" />
    </>
  ),
  warning: (
    <>
      <path d="M10.27 4.03 2.73 17.1A2 2 0 0 0 4.46 20h15.08a2 2 0 0 0 1.73-2.9L13.73 4.03a2 2 0 0 0-3.46 0Z" />
      <path d="M12 9.5v4M12 16.75h.01" />
    </>
  ),
  danger: (
    <>
      <path d="M8.27 3h7.46L21 8.27v7.46L15.73 21H8.27L3 15.73V8.27Z" />
      <path d="M12 7.75v5M12 16.25h.01" />
    </>
  ),
  neutral: (
    <>
      <path d="M6 8.5a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 14.5 6 8.5" />
      <path d="M10.25 20a2 2 0 0 0 3.5 0" />
    </>
  ),
}

const ToneIcon = ({ tone }: { tone: AlertTone }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {iconPaths[tone]}
  </svg>
)

/**
 * A prominent message. Danger and warning interrupt as role="alert"; other tones wait their
 * turn as role="status". Server-safe.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      tone = "info",
      variant = "soft",
      icon,
      title,
      actions,
      onDismiss,
      dismissLabel = "Dismiss",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const glyph = icon === undefined ? <ToneIcon tone={tone} /> : icon
    return (
      <div
        ref={ref}
        role={tone === "danger" || tone === "warning" ? "alert" : "status"}
        className={alertVariants({ tone, variant, className })}
        data-tone={tone}
        data-variant={variant}
        data-dismissible={onDismiss ? "" : undefined}
        {...props}
      >
        {glyph !== false && glyph != null && (
          <span
            // 1.5em tall centres the icon on the first line of text at any font size.
            className="kg-alert__icon inline-flex h-[1.5em] shrink-0 items-center [&_svg]:size-[1.15rem]"
            aria-hidden="true"
          >
            {glyph}
          </span>
        )}
        <div className="kg-alert__body grid min-w-0 flex-1 basis-0 gap-1">
          {title != null && <div className="kg-alert__title font-semibold tracking-[-0.005em]">{title}</div>}
          {children != null && (
            <div
              className={cx(
                "kg-alert__description text-pretty text-(--_muted) [&>p]:m-0",
                "[&_a]:font-semibold [&_a]:text-inherit [&_a]:underline-offset-[0.2em]",
                title != null && "text-kg-sm",
              )}
            >{children}</div>
          )}
          {actions != null && <div className="kg-alert__actions mt-1.5 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {onDismiss && (
          <button
            type="button"
            className={cx(
              "kg-alert__close relative -my-0.5 -me-1.5 inline-grid size-7 shrink-0 cursor-pointer place-items-center rounded-kg-sm border-0 bg-transparent p-0 text-(--_muted)",
              "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-[color-mix(in_oklab,currentColor_12%,transparent)] [&_svg]:size-4",
              // Keeps a 40px pointer target around the small visual button.
              "before:absolute before:-inset-1.5",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            )}
            aria-label={dismissLabel}
            onClick={onDismiss}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M17 7 7 17M7 7l10 10" />
            </svg>
          </button>
        )}
      </div>
    )
  },
)

Alert.displayName = "Alert"
