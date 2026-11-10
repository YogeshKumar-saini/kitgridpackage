import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { discountPercent } from "../../utils/money.js"
import { AddToCartButton } from "../add-to-cart-button/add-to-cart-button.js"
import { Badge, type BadgeTone } from "../badge/badge.js"
import { Price } from "../price/price.js"
import { Rating } from "../rating/rating.js"
import { Skeleton } from "../skeleton/skeleton.js"
import { WishlistButton } from "../wishlist-button/wishlist-button.js"

export type ProductCardVariant = "default" | "minimal" | "horizontal"
export type ProductCardHeadingLevel = "h2" | "h3" | "h4" | "h5" | "h6"

export interface ProductCardImage {
  src: string
  alt: string
  width?: number
  height?: number
}

export interface ProductCardBadge {
  label: string
  tone?: BadgeTone
}

export interface ProductCardSwatch {
  label: string
  /** Any CSS color or gradient. */
  color: string
}

export interface ProductCardLabels {
  /** Visible quick-add text. */
  quickAdd?: ReactNode
  /** Accessible names, which include the product title so every card's buttons are distinct. */
  quickAddLabel?: (title: string) => string
  quickView?: (title: string) => string
  wishlist?: (title: string) => string
  soldOut?: string
  /** Names the swatch list, e.g. "5 colors". */
  colors?: (count: number) => string
  /** Spoken for the "+3" overflow. */
  moreColors?: (count: number) => string
  /** The discount badge text. */
  discount?: (percent: number) => string
}

export interface ProductCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: string
  /** Makes the whole card one link; buttons inside stay separately clickable. */
  href?: string
  vendor?: string
  image?: ProductCardImage
  /** Cross-fades in on hover (fine pointers only). */
  hoverImage?: ProductCardImage
  price?: number
  compareAt?: number
  currency?: string
  locale?: string
  rating?: number
  reviewCount?: number
  badges?: (string | ProductCardBadge)[]
  /** Adds a discount badge when `compareAt` is higher than `price`. */
  showDiscount?: boolean
  soldOut?: boolean
  swatches?: ProductCardSwatch[]
  /** Swatches shown before collapsing the rest into "+N". */
  maxSwatches?: number
  /** Show the wishlist toggle. Implied by `onWishlistChange`. */
  wishlist?: boolean
  wishlisted?: boolean
  onWishlistChange?: (wishlisted: boolean) => void
  /** Shows a quick-add button that slides up over the image on hover and focus. */
  onQuickAdd?: () => void | Promise<unknown>
  onQuickView?: () => void
  variant?: ProductCardVariant
  /** Width / height of the media, e.g. `"4 / 5"`. */
  ratio?: number | string
  headingLevel?: ProductCardHeadingLevel
  /** Load the image eagerly with high priority: use for the first row above the fold. */
  priority?: boolean
  /** Render skeleton placeholders with the same footprint. */
  loading?: boolean
  labels?: ProductCardLabels
  /** Extra content under the price, e.g. a delivery promise. */
  children?: ReactNode
}

const defaultLabels: Required<ProductCardLabels> = {
  quickAdd: "Quick add",
  quickAddLabel: (title) => `Quick add: ${title}`,
  quickView: (title) => `Quick view: ${title}`,
  wishlist: (title) => `Add ${title} to wishlist`,
  soldOut: "Sold out",
  colors: (count) => `${count} colors`,
  moreColors: (count) => `and ${count} more`,
  discount: (percent) => `−${percent}%`,
}

const EyeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

/* Paper Layers: the photo is a sheet with an ink edge; the actions rise from its bottom edge. */
const cardVariants = variants({
  base: [
    "kg-product-card group/card relative grid min-w-0 rounded-kg-xl text-kg-fg",
    "has-[.kg-product-card\\_\\_link:focus-visible]:outline-2 has-[.kg-product-card\\_\\_link:focus-visible]:outline-offset-4 has-[.kg-product-card\\_\\_link:focus-visible]:outline-kg-ring",
  ],
  variants: {
    variant: {
      default: "grid-rows-[auto_1fr] gap-3",
      minimal: "grid-rows-[auto_1fr] gap-2",
      horizontal: "grid-cols-[minmax(5rem,32%)_minmax(0,1fr)] items-start gap-4",
    },
  },
  defaults: { variant: "default" },
})

const mediaClass =
  "kg-product-card__media relative block aspect-(--_ratio) w-full overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-muted data-placeholder:bg-kg-paper-sage"

const imageClass = [
  "kg-product-card__image absolute inset-0 size-full object-cover",
  "transition-[opacity,scale] duration-(--kg-duration-slower) ease-kg-out pointer-fine:group-hover/card:scale-[1.04]",
  "group-data-sold-out/card:opacity-70 group-data-sold-out/card:[filter:grayscale(0.85)_contrast(0.92)]",
]

const toBadge = (badge: string | ProductCardBadge): ProductCardBadge =>
  typeof badge === "string" ? { label: badge } : badge

const bodyClass = "kg-product-card__body grid min-w-0 content-start px-0.5"

/**
 * A merchandising tile. Server-safe: the hover image, quick-add reveal and stretched link are
 * CSS, and only the wishlist and quick-add buttons hydrate.
 */
export const ProductCard = forwardRef<HTMLElement, ProductCardProps>(
  (
    {
      title,
      href,
      vendor,
      image,
      hoverImage,
      price,
      compareAt,
      currency,
      locale,
      rating,
      reviewCount,
      badges = [],
      showDiscount = true,
      soldOut = false,
      swatches,
      maxSwatches = 4,
      wishlist,
      wishlisted,
      onWishlistChange,
      onQuickAdd,
      onQuickView,
      variant = "default",
      ratio = "4 / 5",
      headingLevel: Heading = "h3",
      priority = false,
      loading = false,
      labels,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const rootProps = {
      ref,
      className: cardVariants({ variant, className }),
      "data-variant": variant,
      style: { "--_ratio": ratio, ...style } as CSSProperties,
      ...props,
    }

    if (loading) {
      return (
        <article {...rootProps} data-loading="" aria-busy="true">
          <Skeleton
            shape="rect"
            className="kg-product-card__media block aspect-(--_ratio) w-full rounded-kg-xl"
            style={{ height: "auto" }}
          />
          <div className={cx(bodyClass, "gap-2")}>
            {vendor !== undefined && <Skeleton width="40%" />}
            <Skeleton width="80%" />
            <Skeleton width="30%" />
          </div>
        </article>
      )
    }

    const percent = price !== undefined ? discountPercent(price, compareAt) : 0
    const flags = [
      ...(soldOut ? [{ label: text.soldOut, tone: "neutral" as const }] : []),
      ...badges.map(toBadge),
      ...(showDiscount && percent > 0 && !soldOut
        ? [{ label: text.discount(percent), tone: "danger" as const }]
        : []),
    ]
    const shownSwatches = swatches?.slice(0, maxSwatches) ?? []
    const hiddenSwatches = (swatches?.length ?? 0) - shownSwatches.length
    const showWishlist = wishlist ?? onWishlistChange !== undefined
    const full = variant !== "minimal"

    return (
      <article {...rootProps} data-sold-out={soldOut || undefined}>
        <div className={mediaClass} data-placeholder={image ? undefined : ""}>
          {image && (
            <img
              className={cx(imageClass)}
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              {...(priority ? { fetchPriority: "high" as const } : null)}
            />
          )}
          {hoverImage && (
            <img
              className={cx(imageClass, "opacity-0 pointer-fine:group-hover/card:opacity-100")}
              data-hover=""
              src={hoverImage.src}
              alt=""
              loading="lazy"
              decoding="async"
            />
          )}
          {flags.length > 0 && (
            <div className="kg-product-card__badges pointer-events-none absolute start-3 top-3 z-2 flex flex-wrap gap-1.5">
              {flags.map((flag) => (
                <Badge
                  key={flag.label}
                  size="sm"
                  variant="solid"
                  tone={flag.tone ?? "neutral"}
                >
                  {flag.label}
                </Badge>
              ))}
            </div>
          )}
          {showWishlist && (
            <div className="absolute end-2.5 top-2.5 z-2">
              <WishlistButton
                className="kg-product-card__wishlist"
                size="sm"
                pressed={wishlisted}
                onPressedChange={onWishlistChange}
                labels={{ label: text.wishlist(title) }}
              />
            </div>
          )}
          {(onQuickAdd || onQuickView) && (
            <div
              className={cx(
                "kg-product-card__actions absolute inset-x-2.5 bottom-2.5 z-2 gap-2",
                "transition-[translate,opacity] duration-(--kg-duration-base) ease-kg-out",
                "pointer-fine:translate-y-3 pointer-fine:opacity-0 pointer-fine:group-hover/card:translate-y-0 pointer-fine:group-hover/card:opacity-100 pointer-fine:focus-within:translate-y-0 pointer-fine:focus-within:opacity-100",
                variant === "horizontal" ? "hidden" : "flex",
              )}
            >
              {onQuickAdd && (
                <AddToCartButton
                  className="kg-product-card__quick-add flex-auto"
                  size="sm"
                  variant="solid"
                  soldOut={soldOut}
                  onAdd={onQuickAdd}
                  hideIcon
                  aria-label={text.quickAddLabel(title)}
                >
                  {text.quickAdd}
                </AddToCartButton>
              )}
              {onQuickView && (
                <button
                  type="button"
                  className={cx(
                    "kg-product-card__quick-view grid size-(--kg-control-sm) shrink-0 cursor-pointer place-items-center rounded-kg-md border-2 border-kg-ink bg-kg-surface p-0 text-kg-fg shadow-kg-xs",
                    "transition-[background-color,translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-paper-sage active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring [&>svg]:size-[1.05rem]",
                  )}
                  aria-label={text.quickView(title)}
                  aria-haspopup="dialog"
                  onClick={onQuickView}
                >
                  <EyeIcon />
                </button>
              )}
            </div>
          )}
        </div>

        <div className={cx(bodyClass, "gap-1.5")}>
          {full && vendor && (
            <p className="kg-product-card__vendor m-0 text-[0.6875rem] leading-[1.2] font-semibold tracking-[0.09em] text-kg-fg-muted uppercase">
              {vendor}
            </p>
          )}
          <Heading
            className={cx(
              "kg-product-card__title m-0 leading-[1.3] font-semibold tracking-[-0.012em] text-balance",
              variant === "horizontal" ? "text-kg-md" : "text-kg-base",
            )}
          >
            {href ? (
              <a
                className="kg-product-card__link text-inherit no-underline outline-none group-hover/card:underline group-hover/card:decoration-1 group-hover/card:underline-offset-[0.2em] after:absolute after:inset-0 after:z-1 after:rounded-[inherit] after:content-['']"
                href={href}
              >
                {title}
              </a>
            ) : (
              title
            )}
          </Heading>
          {full && rating !== undefined && (
            <Rating
              className="kg-product-card__rating"
              value={rating}
              count={reviewCount}
              size="sm"
              locale={locale}
            />
          )}
          {price !== undefined && (
            <Price
              className="kg-product-card__price"
              amount={price}
              compareAt={compareAt}
              currency={currency}
              locale={locale}
              savings={false}
            />
          )}
          {full && shownSwatches.length > 0 && (
            <ul
              className="kg-product-card__swatches m-0 mt-1 flex list-none flex-wrap items-center gap-1.5 p-0"
              aria-label={text.colors(swatches?.length ?? 0)}
            >
              {shownSwatches.map((swatch) => (
                <li
                  key={swatch.label}
                  className="kg-product-card__swatch size-3 rounded-full border-[1.5px] border-kg-ink [background:var(--_swatch)]"
                  title={swatch.label}
                  style={{ "--_swatch": swatch.color } as CSSProperties}
                >
                  <span className="kg-visually-hidden">{swatch.label}</span>
                </li>
              ))}
              {hiddenSwatches > 0 && (
                <li className="kg-product-card__more text-kg-xs text-kg-fg-muted">
                  <span aria-hidden="true">+{hiddenSwatches}</span>
                  <span className="kg-visually-hidden">
                    {text.moreColors(hiddenSwatches)}
                  </span>
                </li>
              )}
            </ul>
          )}
          {children}
        </div>
      </article>
    )
  },
)

ProductCard.displayName = "ProductCard"
