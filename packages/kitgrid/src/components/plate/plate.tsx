import { forwardRef, type HTMLAttributes } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: a plate is a recess cut into the sheet, so it sits flat with a hairline edge and
 * no shadow. Registration marks are two ink corners drawn by the pseudo-elements.
 */
const plateVariants = variants({
  base: [
    "kg-plate relative min-w-0 rounded-kg-lg border p-(--_pad) text-kg-fg",
    "data-marks:before:pointer-events-none data-marks:before:absolute data-marks:before:start-1.5 data-marks:before:top-1.5 data-marks:before:size-[7px] data-marks:before:border-s data-marks:before:border-t data-marks:before:border-kg-fg-faint",
    "data-marks:after:pointer-events-none data-marks:after:absolute data-marks:after:end-1.5 data-marks:after:bottom-1.5 data-marks:after:size-[7px] data-marks:after:border-e data-marks:after:border-b data-marks:after:border-kg-fg-faint",
  ],
  variants: {
    variant: {
      sunken: "border-kg-border bg-kg-surface-sunken",
      dashed: "border-dashed border-kg-border-strong bg-kg-surface-sunken",
      grid: [
        "border-kg-border bg-kg-surface-sunken [background-size:14px_14px]",
        "bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklab,var(--kg-fg)_18%,transparent)_1px,transparent_1.5px)]",
      ],
    },
    padding: {
      none: "[--_pad:0px]",
      sm: "[--_pad:calc(var(--kg-space)*2.5)]",
      md: "[--_pad:calc(var(--kg-space)*4)]",
      lg: "[--_pad:calc(var(--kg-space)*6)]",
    },
  },
  defaults: { variant: "sunken", padding: "md" },
})

type PlateVariantProps = VariantProps<typeof plateVariants>
export type PlatePadding = NonNullable<PlateVariantProps["padding"]>
export type PlateVariant = NonNullable<PlateVariantProps["variant"]>

export interface PlateProps extends HTMLAttributes<HTMLDivElement> {
  /** `sunken` is a recessed well, `dashed` a drop or placeholder zone, `grid` a dotted canvas. */
  variant?: PlateVariant
  padding?: PlatePadding
  /** Two corner registration marks. */
  marks?: boolean
}

/** An inset, framed area inside a surface: a chart well, a preview or a placeholder. Server-safe. */
export const Plate = forwardRef<HTMLDivElement, PlateProps>(
  ({ variant = "sunken", padding = "md", marks = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={plateVariants({ variant, padding, className })}
      data-variant={variant}
      data-padding={padding}
      data-marks={marks || undefined}
      {...props}
    />
  ),
)

Plate.displayName = "Plate"
