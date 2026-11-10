import { forwardRef, type HTMLAttributes } from "react"
import { Slot } from "../../primitives/slot.js"
import { type VariantProps, variants } from "../../utils/variants.js"

const headingVariants = variants({
  base: "kg-heading m-0",
  variants: {
    // Display sizes scale down on narrow screens so a long word never overflows.
    size: {
      xs: "text-kg-sm leading-[1.25] tracking-normal",
      sm: "text-kg-base leading-[1.25] tracking-normal",
      md: "text-kg-md leading-[1.25] tracking-[-0.005em]",
      lg: "text-kg-lg leading-[1.25] tracking-[-0.01em]",
      xl: "text-(length:--kg-text-xl) leading-[1.25] tracking-[-0.01em]",
      "2xl": "text-(length:--kg-text-2xl) leading-[1.2] tracking-[-0.018em]",
      "3xl":
        "text-[length:clamp(var(--kg-text-2xl),5vw,var(--kg-text-3xl))] leading-[1.12] tracking-[-0.024em]",
      "4xl":
        "text-[length:clamp(var(--kg-text-2xl),6.5vw,var(--kg-text-4xl))] leading-[1.06] tracking-[-0.03em]",
      "5xl":
        "text-[length:clamp(var(--kg-text-3xl),8vw,var(--kg-text-5xl))] leading-[1.02] tracking-[-0.035em]",
    },
    weight: {
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    tone: {
      default: "text-kg-fg",
      muted: "text-kg-fg-muted",
      accent: "text-kg-accent-display",
    },
    balance: {
      true: "text-balance",
      false: "text-pretty",
    },
  },
  defaults: { weight: "semibold", tone: "default", balance: true },
})

type HeadingVariantProps = VariantProps<typeof headingVariants>
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
export type HeadingSize = NonNullable<HeadingVariantProps["size"]>
export type HeadingWeight = NonNullable<HeadingVariantProps["weight"]>
export type HeadingTone = NonNullable<HeadingVariantProps["tone"]>

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** The document outline level: renders `h1` to `h6`. */
  level?: HeadingLevel
  /** The visual size, independent of the level. Follows the level when omitted. */
  size?: HeadingSize
  weight?: HeadingWeight
  tone?: HeadingTone
  /** Evens out line lengths across a wrapped heading. On by default. */
  balance?: boolean
  asChild?: boolean
}

const SIZE_FOR: Record<HeadingLevel, HeadingSize> = {
  1: "3xl",
  2: "2xl",
  3: "xl",
  4: "lg",
  5: "md",
  6: "sm",
}

/** A heading whose outline level and visual size are chosen separately. */
export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  (
    {
      level = 2,
      size,
      weight = "semibold",
      tone = "default",
      balance = true,
      asChild = false,
      className,
      ...props
    },
    ref,
  ) => {
    const Tag = asChild ? Slot : (`h${level}` as const)
    const resolved = size ?? SIZE_FOR[level]
    return (
      <Tag
        ref={ref}
        className={headingVariants({ size: resolved, weight, tone, balance, className })}
        data-size={resolved}
        data-weight={weight}
        data-tone={tone === "default" ? undefined : tone}
        data-balance={balance || undefined}
        {...props}
      />
    )
  },
)

Heading.displayName = "Heading"
