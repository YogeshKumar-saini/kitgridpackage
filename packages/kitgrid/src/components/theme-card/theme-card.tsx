import { forwardRef } from "react"
import { cx } from "../../utils/cx.js"
import {
  AppearancePreview,
  type AppearancePreviewTheme,
} from "../appearance-preview/appearance-preview.js"
import { OptionTile, type OptionTileProps } from "../option-tile/option-tile.js"

export interface ThemeCardProps extends Omit<OptionTileProps, "preview" | "layout"> {
  /** The theme the miniature is drawn in. */
  theme: AppearancePreviewTheme
  /** The theme's accent, when it differs from the page's. */
  accent?: string
  radius?: string | number
  font?: string
  /** Swatches shown beside the label: the accent first, then any palette colors. */
  swatches?: readonly string[]
}

/**
 * A theme choice as a radio tile: a miniature app rendered in that theme's real tokens, so
 * even a faint tint registers before it is picked. Server-component safe.
 */
export const ThemeCard = forwardRef<HTMLInputElement, ThemeCardProps>(
  ({ theme, accent, radius, font, swatches, label, className, ...props }, ref) => (
    <OptionTile
      ref={ref}
      className={cx("kg-theme-card", className)}
      preview={
        <AppearancePreview
          size="sm"
          theme={theme}
          accent={accent}
          radius={radius}
          font={font}
        />
      }
      label={
        <span className="kg-theme-card__label flex min-w-0 items-center gap-2">
          <span className="kg-theme-card__name min-w-0 flex-1 truncate">{label}</span>
          {swatches && swatches.length > 0 && (
            <span className="kg-theme-card__swatches flex shrink-0 -space-x-[0.2rem]" aria-hidden="true">
              {swatches.map((color, index) => (
                <span key={index} className="size-[0.625rem] rounded-full border border-kg-ink" style={{ background: color }} />
              ))}
            </span>
          )}
        </span>
      }
      {...props}
    />
  ),
)

ThemeCard.displayName = "ThemeCard"
