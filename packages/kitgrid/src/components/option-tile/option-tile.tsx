import {
  type CSSProperties,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { CheckIcon } from "../chat-message/internal/icons.js"

export type OptionTileLayout = "stack" | "row"

export interface OptionTileProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  label: ReactNode
  description?: ReactNode
  /** What choosing this option produces: a swatch, a mini layout, a type sample. */
  preview?: ReactNode
  /** `stack` puts the preview above the label; `row` puts it at the start. */
  layout?: OptionTileLayout
  /** Applied to the tile, not the input. */
  className?: string
  style?: CSSProperties
}

/*
 * Paper Layers: a tile is a white sheet edged in ink. The chosen tile turns sage and lifts on an
 * ink offset, with an ink check badge, so the choice never rests on colour alone.
 */
const tileVariants = variants({
  base: [
    "kg-option-tile group/tile relative flex min-w-0 cursor-pointer rounded-kg-lg border-2 border-kg-ink",
    "bg-kg-surface text-kg-fg [-webkit-tap-highlight-color:transparent]",
    "transition-[translate,box-shadow,background-color] duration-(--kg-duration-fast) ease-kg-out",
    "hover:not-data-disabled:-translate-px hover:not-data-disabled:shadow-kg-xs",
    "active:not-data-disabled:translate-0 active:not-data-disabled:shadow-none",
    "has-checked:-translate-px has-checked:bg-kg-paper-sage has-checked:shadow-kg-sm",
    "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-kg-ring",
    "data-disabled:cursor-not-allowed data-disabled:opacity-50",
  ],
  variants: {
    layout: {
      stack: "flex-col gap-1.5 p-1.5",
      row: "flex-row items-center gap-3 py-2 ps-2.5 pe-9",
    },
  },
  defaults: { layout: "stack" },
})

/**
 * A native radio drawn as a tile with a preview. Give tiles the same `name` inside a
 * `role="radiogroup"` and the browser supplies arrow-key selection and form submission.
 * Server-component safe.
 */
export const OptionTile = forwardRef<HTMLInputElement, OptionTileProps>(
  (
    {
      label,
      description,
      preview,
      layout = "stack",
      className,
      style,
      disabled,
      ...props
    },
    ref,
  ) => (
    <label
      className={tileVariants({ layout, className })}
      data-layout={layout}
      data-disabled={disabled || undefined}
      style={style}
    >
      <input
        ref={ref}
        type="radio"
        className="kg-option-tile__input absolute inset-0 m-0 size-full opacity-0 cursor-[inherit]"
        disabled={disabled}
        {...props}
      />
      {preview != null && (
        <span className="kg-option-tile__preview pointer-events-none grid min-h-10 place-items-center overflow-hidden rounded-kg-md border-2 border-kg-ink bg-kg-bg group-data-[layout=row]/tile:min-w-10 group-data-[layout=row]/tile:shrink-0" aria-hidden="true">
          {preview}
        </span>
      )}
      <span className="kg-option-tile__text pointer-events-none flex min-w-0 flex-col gap-px px-0.5 group-data-[layout=stack]/tile:items-center group-data-[layout=stack]/tile:text-center">
        <span className="kg-option-tile__label max-w-full truncate text-kg-sm font-semibold">{label}</span>
        {description != null && (
          <span className="kg-option-tile__description max-w-full truncate text-kg-xs text-kg-fg-muted">{description}</span>
        )}
      </span>
      <span
        className={cx(
          "kg-option-tile__check pointer-events-none absolute end-1 top-1 grid size-4 place-items-center rounded-full",
          "bg-kg-accent text-[0.625rem] text-kg-accent-fg opacity-0 scale-40 [&_svg]:[stroke-width:3]",
          "transition-[opacity,scale] duration-(--kg-duration-fast) ease-kg-out group-has-checked/tile:scale-100 group-has-checked/tile:opacity-100",
          "group-data-[layout=row]/tile:end-3 group-data-[layout=row]/tile:top-1/2 group-data-[layout=row]/tile:-translate-y-1/2",
        )}
        aria-hidden="true"
      >
        <CheckIcon />
      </span>
    </label>
  ),
)

OptionTile.displayName = "OptionTile"
