import { type CSSProperties, forwardRef, type HTMLAttributes } from "react"
import { Slot } from "../../primitives/slot.js"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: a card is a white sheet lifted off the page by an ink offset. Interactive cards
 * lift further on hover and settle on press. --_pad and --_radius let CardMedia bleed to the edge.
 */
export const cardVariants = variants({
  base: [
    "kg-card relative flex flex-col rounded-(--_radius) border-2 p-(--_pad) text-kg-fg no-underline",
    "transition-[translate,box-shadow,background-color] duration-(--kg-duration-fast) ease-kg-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  ],
  variants: {
    variant: {
      elevated: "border-transparent bg-kg-surface shadow-kg-md",
      outline: "border-kg-ink bg-kg-surface",
      ghost: "border-transparent bg-transparent",
      inset: "border-transparent bg-kg-surface-sunken",
    },
    padding: {
      none: "gap-4 [--_pad:0px] [--_radius:var(--kg-radius-xl)] [--_inner:var(--kg-radius-xl)]",
      sm: "gap-3 [--_pad:calc(var(--kg-space)*4)] [--_radius:var(--kg-radius-lg)] [--_inner:calc(var(--kg-radius-lg)-var(--kg-space)*2)]",
      md: "gap-4 [--_pad:calc(var(--kg-space)*6)] [--_radius:var(--kg-radius-xl)] [--_inner:calc(var(--kg-radius-xl)-var(--kg-space)*3)]",
      lg: "gap-5 [--_pad:calc(var(--kg-space)*8)] [--_radius:var(--kg-radius-xl)] [--_inner:calc(var(--kg-radius-xl)-var(--kg-space)*4)]",
    },
    interactive: {
      true: "cursor-pointer [-webkit-tap-highlight-color:transparent] active:translate-0",
      false: "",
    },
  },
  defaults: { variant: "elevated", padding: "md", interactive: false },
  compound: [
    {
      variant: "elevated",
      interactive: true,
      class: "hover:-translate-0.5 hover:shadow-[7px_7px_0_var(--kg-ink)] active:shadow-kg-sm",
    },
    {
      variant: "outline",
      interactive: true,
      class: "hover:-translate-0.5 hover:shadow-kg-sm active:shadow-none",
    },
    { variant: "ghost", interactive: true, class: "hover:bg-kg-muted" },
    { variant: "inset", interactive: true, class: "hover:bg-kg-muted" },
  ],
})

type CardVariantProps = VariantProps<typeof cardVariants>
export type CardVariant = NonNullable<CardVariantProps["variant"]>
export type CardPadding = NonNullable<CardVariantProps["padding"]>
export type CardTitleElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div"

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  /** Lifts the sheet on hover and settles it on press. Pair with asChild for whole-card links. */
  interactive?: boolean
  /** Render the child element (e.g. an <a>) as the card, so the whole surface is one link. */
  asChild?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "elevated",
      padding = "md",
      interactive = false,
      asChild = false,
      className,
      ...props
    },
    ref,
  ) => {
    const Root = asChild ? Slot : "div"
    return (
      <Root
        ref={ref}
        className={cardVariants({ variant, padding, interactive, className })}
        data-variant={variant}
        data-padding={padding}
        data-interactive={interactive || undefined}
        {...props}
      />
    )
  },
)

Card.displayName = "Card"

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx("kg-card__header grid gap-1.5", className)} {...props} />
  ),
)

CardHeader.displayName = "CardHeader"

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Pick the level that fits the page outline. */
  as?: CardTitleElement
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ as: Tag = "h3", className, ...props }, ref) => (
    <Tag ref={ref} className={cx(
        "kg-card__title m-0 text-kg-md font-semibold leading-[1.3] tracking-[-0.012em] text-balance text-kg-fg",
        className,
      )} {...props} />
  ),
)

CardTitle.displayName = "CardTitle"

export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cx(
        "kg-card__description m-0 text-kg-base leading-[1.55] text-pretty text-kg-fg-muted",
        className,
      )} {...props} />
  ),
)

CardDescription.displayName = "CardDescription"

export type CardContentProps = HTMLAttributes<HTMLDivElement>

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx("kg-card__content min-w-0 text-kg-base leading-[1.55]", className)} {...props} />
  ),
)

CardContent.displayName = "CardContent"

export type CardFooterProps = HTMLAttributes<HTMLDivElement>

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx("kg-card__footer mt-auto flex flex-wrap items-center gap-2", className)} {...props} />
  ),
)

CardFooter.displayName = "CardFooter"

export interface CardMediaProps extends HTMLAttributes<HTMLDivElement> {
  /** Width / height, e.g. `16 / 9` or `"4 / 5"`. */
  ratio?: number | string
  /** Gently scale the image while the card is hovered or holds focus. */
  zoom?: boolean
  /** Keep the media inside the card padding instead of bleeding to the edges. */
  inset?: boolean
}

const mediaVariants = variants({
  base: [
    "kg-card__media relative overflow-hidden bg-kg-muted",
    "empty:bg-kg-paper-sage has-[>img:not([src])]:bg-kg-paper-sage has-[>img[src='']]:bg-kg-paper-sage",
    "[&>:is(img,video,picture,svg)]:block [&>:is(img,video,picture,svg)]:size-full [&>:is(img,video,picture,svg)]:object-cover",
    "[&>picture>img]:size-full [&>picture>img]:object-cover",
    "[&>img:not([src])]:invisible [&>img[src='']]:invisible",
  ],
  variants: {
    inset: {
      true: "rounded-(--_inner)",
      false: [
        "-mx-(--_pad) first:-mt-(--_pad) last:-mb-(--_pad)",
        "first:rounded-t-[calc(var(--_radius)-2px)] last:rounded-b-[calc(var(--_radius)-2px)]",
      ],
    },
    zoom: {
      true: [
        "[&>*]:transition-[scale] [&>*]:duration-[var(--kg-duration-slower)] [&>*]:ease-kg-out motion-reduce:[&>*]:transition-none",
        "[@media(hover:hover)]:[.kg-card:hover>&>*]:scale-[1.045]",
        "[.kg-card:focus-visible>&>*]:scale-[1.045] [.kg-card:has(:focus-visible)>&>*]:scale-[1.045]",
      ],
      false: "",
    },
  },
})

/** Bleeds to the card edges and crops its <img>/<video> to `ratio` with object-fit: cover. */
export const CardMedia = forwardRef<HTMLDivElement, CardMediaProps>(
  ({ ratio = 16 / 9, zoom = true, inset = false, className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={mediaVariants({ inset, zoom, className })}
      data-zoom={zoom || undefined}
      data-inset={inset || undefined}
      style={{ aspectRatio: ratio, ...style } as CSSProperties}
      {...props}
    />
  ),
)

CardMedia.displayName = "CardMedia"
