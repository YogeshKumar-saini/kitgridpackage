import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

const sectionVariants = variants({
  base: "kg-section @container box-border",
  variants: {
    spacing: {
      none: "py-0",
      sm: "py-[clamp(calc(var(--kg-space)*5),4vw,calc(var(--kg-space)*8))]",
      md: "py-[clamp(calc(var(--kg-space)*8),6vw,calc(var(--kg-space)*14))]",
      lg: "py-[clamp(calc(var(--kg-space)*12),9vw,calc(var(--kg-space)*20))]",
      xl: "py-[clamp(calc(var(--kg-space)*16),12vw,calc(var(--kg-space)*28))]",
    },
    surface: {
      none: "",
      surface: "bg-kg-surface",
      sunken: "bg-kg-surface-sunken",
      muted: "bg-kg-muted",
    },
    divided: {
      true: "border-t-2 border-kg-border",
      false: "",
    },
  },
  defaults: { spacing: "md", surface: "none", divided: false },
})

type SectionVariantProps = VariantProps<typeof sectionVariants>
export type SectionSpacing = NonNullable<SectionVariantProps["spacing"]>
export type SectionSurface = NonNullable<SectionVariantProps["surface"]>

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  /** Vertical padding, which grows a little on wide screens. */
  spacing?: SectionSpacing
  surface?: SectionSurface
  /** A rule above, to separate stacked sections on the same surface. */
  divided?: boolean
}

/**
 * A full-width band of the page with vertical rhythm. Pair with `aria-labelledby` pointing at its
 * heading so it is announced as a named region.
 */
export const Section = forwardRef<HTMLElement, SectionProps>(
  (
    {
      as: Tag = "section",
      spacing = "md",
      surface = "none",
      divided = false,
      className,
      ...props
    },
    ref,
  ) => (
    <Tag
      ref={ref}
      className={sectionVariants({ spacing, surface, divided, className })}
      data-spacing={spacing}
      data-surface={surface === "none" ? undefined : surface}
      data-divided={divided || undefined}
      {...props}
    />
  ),
)

Section.displayName = "Section"
