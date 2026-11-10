import { type ElementType, forwardRef, type HTMLAttributes } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

const proseVariants = variants({
  base: "kg-prose text-[color-mix(in_oklab,var(--kg-fg)_88%,var(--kg-bg))] [overflow-wrap:break-word]",
  variants: {
    size: {
      sm: "text-kg-base leading-[1.65]",
      md: "text-kg-md leading-[1.7]",
      lg: "text-kg-lg leading-[1.75]",
    },
    measure: {
      true: "max-w-[68ch]",
      false: "",
    },
  },
  defaults: { size: "md", measure: true },
})

export type ProseSize = NonNullable<VariantProps<typeof proseVariants>["size"]>

export interface ProseProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  size?: ProseSize
  /** Caps lines near 68 characters for comfortable reading. On by default. */
  measure?: boolean
}

/**
 * Typesets rendered HTML you do not control, such as Markdown or CMS output: headings, lists,
 * quotes, code, tables and media, with vertical rhythm.
 */
export const Prose = forwardRef<HTMLElement, ProseProps>(
  ({ as: Tag = "div", size = "md", measure = true, className, ...props }, ref) => (
    <Tag
      ref={ref}
      className={proseVariants({ size, measure, className })}
      data-size={size}
      data-measure={measure || undefined}
      {...props}
    />
  ),
)

Prose.displayName = "Prose"
