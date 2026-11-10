import { type CSSProperties, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type AppearancePreviewTheme = "light" | "dark" | "system"
export type AppearancePreviewSize = "sm" | "md"

export interface AppearancePreviewProps extends HTMLAttributes<HTMLDivElement> {
  /** Renders the mock in this theme regardless of the page's. Inherits when omitted. */
  theme?: AppearancePreviewTheme
  /** Any CSS color; every derived accent shade follows it. */
  accent?: string
  /** Base corner radius, e.g. `"0.5rem"` or `8`. */
  radius?: string | number
  /** Spacing multiplier, as `--kg-density`. */
  density?: number
  /** CSS `font-family` for the mock's text. */
  font?: string
  size?: AppearancePreviewSize
  /** Names the preview as an image. Decorative and hidden from assistive tech when omitted. */
  label?: string
  /** Puts the navigation rail on the end side. */
  railEnd?: boolean
}

/*
 * Paper Layers in miniature: the app is drawn as small sheets on the page colour, each edged in
 * ink with a crisp offset, so a theme's paper and ink read at a glance.
 */
const previewVariants = variants({
  base: [
    "kg-appearance-preview group/ap pointer-events-none flex w-full overflow-hidden select-none",
    "bg-kg-bg text-kg-fg data-[rail=end]:flex-row-reverse",
  ],
  variants: {
    size: {
      md: "h-[9.5rem] rounded-kg-lg border-2 border-kg-ink [--_gap:calc(var(--kg-space)*1.5)]",
      sm: "h-[4.5rem] rounded-[inherit] border-0 [--_gap:var(--kg-space)]",
    },
  },
  defaults: { size: "md" },
})

const BARS = [0.34, 0.52, 0.41, 0.68, 0.55, 0.88, 0.72]
const STATS = [0, 1, 2]

const nav = cx("kg-appearance-preview__nav h-[0.25rem] w-[0.75rem] rounded-full", "group-data-[size=sm]/ap:h-[0.18rem] group-data-[size=sm]/ap:w-[0.45rem]")
const sheet = "rounded-kg-md border border-kg-ink bg-kg-surface shadow-[2px_2px_0_var(--kg-ink)]"

/**
 * A working miniature of an app, drawn entirely in the library's tokens, so it shows what a
 * theme, accent, radius, density or font choice will look like before it is applied.
 * Server-component safe.
 */
export const AppearancePreview = forwardRef<HTMLDivElement, AppearancePreviewProps>(
  (
    {
      theme,
      accent,
      radius,
      density,
      font,
      size = "md",
      label,
      railEnd = false,
      className,
      style,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={previewVariants({ size, className })}
      data-theme={theme}
      data-kg-scope=""
      data-size={size}
      data-rail={railEnd ? "end" : "start"}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={
        {
          ...(accent ? { "--kg-accent": accent } : null),
          ...(radius !== undefined
            ? { "--kg-radius": typeof radius === "number" ? `${radius}px` : radius }
            : null),
          ...(density !== undefined ? { "--kg-density": density } : null),
          ...(font ? { fontFamily: font } : null),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <span className={cx("kg-appearance-preview__rail flex w-[1.75rem] shrink-0 flex-col items-center gap-[calc(var(--_gap)*1.2)] border-e-2 border-kg-ink bg-kg-surface py-[calc(var(--_gap)*1.4)]", "group-data-[rail=end]/ap:border-e-0 group-data-[rail=end]/ap:border-s-2", "group-data-[size=sm]/ap:w-[1.125rem]")}>
        <span className={cx("kg-appearance-preview__logo size-[0.625rem] rounded-full bg-kg-accent", "group-data-[size=sm]/ap:size-[0.4rem]")} />
        <span className={cx(nav, "bg-kg-accent-strong opacity-100")} data-active="" />
        <span className={cx(nav, "bg-kg-fg-faint opacity-60")} />
        <span className={cx(nav, "bg-kg-fg-faint opacity-60")} />
      </span>
      <span className="kg-appearance-preview__main flex min-w-0 flex-1 flex-col gap-(--_gap) p-[calc(var(--_gap)*1.4)]">
        <span className="kg-appearance-preview__header flex shrink-0 items-center gap-(--_gap)">
          <span className={cx("kg-appearance-preview__title text-[0.6875rem] leading-none font-[650] tracking-[-0.01em]", "group-data-[size=sm]/ap:hidden")}>Aa</span>
          <span className={cx("kg-appearance-preview__line h-[0.25rem] w-[2rem] rounded-full bg-kg-fg opacity-85", "group-data-[size=sm]/ap:h-[0.2rem] group-data-[size=sm]/ap:w-[1.25rem]")} />
          <span className={cx("kg-appearance-preview__button ms-auto h-[0.6rem] w-[1.25rem] rounded-kg-sm bg-kg-accent", "group-data-[size=sm]/ap:h-[0.4rem] group-data-[size=sm]/ap:w-[0.8rem]")} />
        </span>
        <span className={cx("kg-appearance-preview__stats grid shrink-0 grid-cols-3 gap-(--_gap)", "group-data-[size=sm]/ap:hidden")}>
          {STATS.map((index) => (
            <span key={index} className={cx(sheet, "kg-appearance-preview__stat flex flex-col gap-[calc(var(--_gap)*0.7)] p-[calc(var(--_gap)*1.1)]")}>
              <span className="kg-appearance-preview__line h-[0.25rem] w-[60%] rounded-full bg-kg-fg-faint opacity-70" data-tone="faint" />
              <span className="kg-appearance-preview__value h-[0.4rem] w-[70%] rounded-full bg-kg-fg" />
            </span>
          ))}
        </span>
        <span className={cx(sheet, "kg-appearance-preview__chart flex min-h-0 flex-1 items-end gap-[calc(var(--_gap)*0.6)] px-[calc(var(--_gap)*1.1)] pt-[calc(var(--_gap)*1.1)]")}>
          {BARS.map((height, index) => (
            <span
              key={index}
              className="kg-appearance-preview__bar min-w-0 flex-1 rounded-t-[2px] bg-[color-mix(in_oklab,var(--kg-accent)_45%,var(--kg-surface))] data-lead:bg-kg-accent"
              data-lead={index === 5 || undefined}
              style={{ height: `${height * 100}%` }}
            />
          ))}
        </span>
      </span>
    </div>
  ),
)

AppearancePreview.displayName = "AppearancePreview"
