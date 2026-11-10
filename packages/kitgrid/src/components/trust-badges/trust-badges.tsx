import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: each point is a sage paper disc with an ink edge; the grid layout sets every
 * point on its own ink-edged sheet.
 */
export const trustBadgesVariants = variants({
  base: "kg-trust-badges m-0 list-none p-0 text-kg-fg",
  variants: {
    layout: {
      row: "flex flex-wrap gap-x-6 gap-y-3",
      grid: "grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2",
      stack: "flex flex-col gap-3",
    },
  },
  defaults: { layout: "row" },
})

export type TrustBadgesPreset = "secure" | "returns" | "shipping" | "warranty" | "support"
export type TrustBadgesLayout = NonNullable<VariantProps<typeof trustBadgesVariants>["layout"]>

export interface TrustBadgesItem {
  /** A preset picks a matching icon and default label. */
  preset?: TrustBadgesPreset
  label?: ReactNode
  /** One short line, e.g. "Within 30 days". */
  detail?: ReactNode
  icon?: ReactNode
}

export interface TrustBadgesProps extends HTMLAttributes<HTMLUListElement> {
  items: readonly (TrustBadgesItem | TrustBadgesPreset)[]
  layout?: TrustBadgesLayout
  /** Override the default preset labels. */
  presetLabels?: Partial<Record<TrustBadgesPreset, string>>
}

const svg = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
)

const icons: Record<TrustBadgesPreset, ReactNode> = {
  secure: svg(
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2" />
    </>,
  ),
  returns: svg(<path d="M4 9h11a5 5 0 0 1 0 10H9M4 9l4-4M4 9l4 4" />),
  shipping: svg(
    <>
      <path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </>,
  ),
  warranty: svg(<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6zM9 12l2 2 4-4.5" />),
  support: svg(
    <>
      <path d="M4.5 13v-1a7.5 7.5 0 0 1 15 0v1" />
      <rect x="3.5" y="13" width="4" height="6" rx="1.5" />
      <rect x="16.5" y="13" width="4" height="6" rx="1.5" />
    </>,
  ),
}

const defaultPresetLabels: Record<TrustBadgesPreset, string> = {
  secure: "Secure checkout",
  returns: "Free returns",
  shipping: "Fast shipping",
  warranty: "2-year warranty",
  support: "Real support",
}

/** Short reassurance points (secure checkout, returns, shipping) for product and cart pages. */
export const TrustBadges = forwardRef<HTMLUListElement, TrustBadgesProps>(
  ({ items, layout = "row", presetLabels, className, ...props }, ref) => {
    const names = { ...defaultPresetLabels, ...presetLabels }
    return (
      <ul
        ref={ref}
        className={trustBadgesVariants({ layout, className })}
        data-layout={layout}
        {...props}
      >
        {items.map((entry, index) => {
          const item = typeof entry === "string" ? { preset: entry } : entry
          const icon = item.icon ?? (item.preset ? icons[item.preset] : null)
          const label = item.label ?? (item.preset ? names[item.preset] : null)
          return (
            <li
              key={index}
              className={`kg-trust-badges__item flex min-w-0 items-center gap-2.5 ${
                layout === "grid"
                  ? "rounded-kg-lg border-2 border-kg-ink bg-kg-surface p-3 shadow-kg-xs"
                  : ""
              }`}
            >
              {icon != null && (
                <span
                  className="kg-trust-badges__icon inline-grid size-9 shrink-0 place-items-center rounded-full border-2 border-kg-ink bg-kg-paper-sage text-kg-fg [&_svg]:size-[1.15rem]"
                  aria-hidden="true"
                >
                  {icon}
                </span>
              )}
              <span className="kg-trust-badges__text grid min-w-0">
                <span className="kg-trust-badges__label text-kg-sm font-semibold">{label}</span>
                {item.detail != null && (
                  <span className="kg-trust-badges__detail text-kg-xs text-kg-fg-muted">
                    {item.detail}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    )
  },
)

TrustBadges.displayName = "TrustBadges"
