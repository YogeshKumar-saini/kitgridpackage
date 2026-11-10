import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { variants } from "../../utils/variants.js"
import { Spinner } from "../spinner/spinner.js"

export type StatePanelState = "empty" | "loading" | "error" | "unavailable" | "no-access"
export type StatePanelSize = "sm" | "md" | "lg"
export type StatePanelTitleElement = "h2" | "h3" | "h4" | "h5" | "h6" | "p"

export interface StatePanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  state?: StatePanelState
  /** Defaults to a short sentence for the state. */
  title?: ReactNode
  titleAs?: StatePanelTitleElement
  description?: ReactNode
  /** Replaces the state's own icon. Decorative. */
  icon?: ReactNode
  /** The way forward: retry, request access, clear filters. */
  action?: ReactNode
  size?: StatePanelSize
  /** Draws a dashed frame, for a state that stands in for a whole panel. */
  framed?: boolean
}

const defaultTitles: Record<StatePanelState, string> = {
  empty: "Nothing to show yet",
  loading: "Loading",
  error: "Couldn't load this",
  unavailable: "Data unavailable",
  "no-access": "You don't have access",
}

const glyph = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
)

const icons: Record<Exclude<StatePanelState, "loading">, ReactNode> = {
  empty: glyph(
    <>
      <path d="M3 12h4l2 3h6l2-3h4" />
      <path d="M5.5 5.5 3 12v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6l-2.5-6.5a1 1 0 0 0-.9-.5H6.4a1 1 0 0 0-.9.5Z" />
    </>,
  ),
  error: glyph(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16h.01" />
    </>,
  ),
  unavailable: glyph(
    <>
      <path d="M2 2l20 20" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-1.8-1.4M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11.4 5M12 20h.01" />
    </>,
  ),
  "no-access": glyph(
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>,
  ),
}

const statePanelVariants = variants({
  base: "kg-state-panel flex min-h-full flex-col items-center justify-center px-[calc(var(--_pad)*0.75)] py-(--_pad) text-center text-kg-fg",
  variants: {
    size: {
      sm: "gap-2 [--_pad:calc(var(--kg-space)*5)] [--_tile:2rem]",
      md: "gap-3 [--_pad:calc(var(--kg-space)*8)] [--_tile:2.5rem]",
      lg: "gap-4 [--_pad:calc(var(--kg-space)*14)] [--_tile:3rem]",
    },
    framed: {
      true: "rounded-kg-lg border-2 border-dashed border-kg-border-strong bg-kg-surface-sunken",
      false: "",
    },
  },
})

/* Paper Layers: the icon sits on a paper disc in an ink ring, tinted by the state. */
const iconVariants = variants({
  base: "kg-state-panel__icon grid size-(--_tile) place-items-center rounded-full border-2 border-kg-ink text-kg-fg [&_svg]:size-[45%]",
  variants: {
    state: {
      empty: "bg-kg-surface",
      loading: "bg-kg-paper-sage",
      error: "bg-kg-paper-rose",
      unavailable: "bg-kg-paper-butter",
      "no-access": "bg-kg-muted",
    },
  },
})

/**
 * What a panel shows instead of its content: empty, loading, error, unavailable or no access.
 * Announced as a status, busy while loading, with an icon, a title and the way forward.
 * Server-safe.
 */
export const StatePanel = forwardRef<HTMLDivElement, StatePanelProps>(
  (
    {
      state = "empty",
      title,
      titleAs: Title = "p",
      description,
      icon,
      action,
      size = "md",
      framed = false,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="status"
      aria-busy={state === "loading" || undefined}
      className={statePanelVariants({ size, framed, className })}
      data-state={state}
      data-size={size}
      data-framed={framed || undefined}
      {...props}
    >
      <span className={iconVariants({ state })} aria-hidden="true">
        {icon ?? (state === "loading" ? <Spinner size="sm" /> : icons[state])}
      </span>
      <div className="kg-state-panel__text grid max-w-[30rem] justify-items-center gap-1">
        <Title className="kg-state-panel__title m-0 text-kg-base font-[620] leading-[1.35] text-balance">
          {title ?? defaultTitles[state]}
        </Title>
        {description != null && (
          <p className="kg-state-panel__description m-0 text-kg-sm leading-normal text-pretty text-kg-fg-muted">
            {description}
          </p>
        )}
      </div>
      {action != null && (
        <div className="kg-state-panel__action mt-1 flex flex-wrap justify-center gap-2">{action}</div>
      )}
      {children}
    </div>
  ),
)

StatePanel.displayName = "StatePanel"
