import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: `row` is a quiet strip of marks; `grid` sets each mark in a white cell of one
 * ink-edged sheet. Muted marks wake up on hover or keyboard focus.
 */
export const logoCloudVariants = variants({
  base: "kg-logo-cloud grid gap-5 text-kg-fg",
  variants: {
    variant: {
      row: "",
      grid: "",
    },
  },
  defaults: { variant: "row" },
})

export type LogoCloudVariant = NonNullable<VariantProps<typeof logoCloudVariants>["variant"]>

export interface LogoCloudLogo {
  /** Company name; the accessible name of the mark. */
  name: string
  /** Image URL. Used when `logo` is not given. */
  src?: string
  /** An inline mark, usually an SVG painting with `currentColor`. */
  logo?: ReactNode
  href?: string
}

export interface LogoCloudProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  logos: readonly LogoCloudLogo[]
  /** One short line above the logos, e.g. "Trusted by teams at". */
  title?: ReactNode
  variant?: LogoCloudVariant
  /** Show logos muted until hovered. */
  muted?: boolean
}

const listClass: Record<LogoCloudVariant, string> = {
  row: "kg-logo-cloud__list m-0 flex list-none flex-wrap items-center justify-center gap-x-10 gap-y-6 p-0",
  grid: "kg-logo-cloud__list m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-[2px] overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-border p-0 shadow-kg-sm",
}

const itemClass: Record<LogoCloudVariant, string> = {
  row: "kg-logo-cloud__item group/logo grid place-items-center",
  grid: "kg-logo-cloud__item group/logo grid min-h-[5.5rem] place-items-center bg-kg-surface p-4",
}

const markBase =
  "kg-logo-cloud__mark inline-flex h-7 max-w-[8.5rem] items-center object-contain transition-[opacity,filter,scale] duration-(--kg-duration-base) ease-kg-out [&_svg]:h-full [&_svg]:w-auto"

const markMuted =
  "opacity-60 grayscale group-hover/logo:scale-[1.04] group-hover/logo:opacity-100 group-hover/logo:grayscale-0 group-has-[:focus-visible]/logo:scale-[1.04] group-has-[:focus-visible]/logo:opacity-100 group-has-[:focus-visible]/logo:grayscale-0"

/** A quiet strip or grid of customer marks. */
export const LogoCloud = forwardRef<HTMLElement, LogoCloudProps>(
  ({ logos, title, variant = "row", muted = true, className, ...props }, ref) => {
    const mark = muted ? `${markBase} ${markMuted}` : markBase
    return (
      <section
        ref={ref}
        className={logoCloudVariants({ variant, className })}
        data-variant={variant}
        data-muted={muted || undefined}
        {...props}
      >
        {title != null && (
          <p className="kg-logo-cloud__title m-0 text-center text-kg-sm font-[550] text-kg-fg-muted">
            {title}
          </p>
        )}
        <ul className={listClass[variant]}>
          {logos.map((item) => {
            const content = item.logo ? (
              <span className={mark} role="img" aria-label={item.name}>
                {item.logo}
              </span>
            ) : item.src ? (
              <img className={mark} src={item.src} alt={item.name} />
            ) : (
              <span
                className={`${mark} kg-logo-cloud__wordmark whitespace-nowrap text-kg-lg font-[750] tracking-[-0.03em]`}
              >
                {item.name}
              </span>
            )
            return (
              <li key={item.name} className={itemClass[variant]}>
                {item.href ? (
                  <a
                    className="kg-logo-cloud__link inline-flex rounded-kg-sm text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
                    href={item.href}
                  >
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            )
          })}
        </ul>
      </section>
    )
  },
)

LogoCloud.displayName = "LogoCloud"
