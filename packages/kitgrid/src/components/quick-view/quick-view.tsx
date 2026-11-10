"use client"

import { forwardRef, type ReactNode, useEffect, useState } from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import {
  AddToCartButton,
  type AddToCartButtonLabels,
} from "../add-to-cart-button/add-to-cart-button.js"
import { useCartActions } from "../cart/cart.js"
import {
  Dialog,
  type DialogContentProps,
  DialogDescription,
} from "../dialog/dialog.js"
import {
  ModalCloseButton,
  useModalContext,
  useModalPart,
  useModalSurface,
} from "../dialog/modal.js"
import { Price } from "../price/price.js"
import { ProductGallery } from "../product-gallery/product-gallery.js"
import { QuantityStepper } from "../quantity-stepper/quantity-stepper.js"
import { Rating } from "../rating/rating.js"
import { StockIndicator } from "../stock-indicator/stock-indicator.js"
import { VariantPicker } from "../variant-picker/variant-picker.js"
import { withVariantAvailability } from "../variant-picker/variant-availability.js"
import {
  type QuickViewProduct,
  type QuickViewVariant,
  toCartItem,
  useProductVariant,
} from "./product-model.js"

export interface QuickViewAddDetail {
  product: QuickViewProduct
  variant: QuickViewVariant | undefined
  quantity: number
}

export interface QuickViewLabels {
  viewDetails?: ReactNode
  /** Shown while some option is not chosen yet. */
  chooseOptions?: string
  addToCart?: AddToCartButtonLabels
}

export interface QuickViewProps extends Omit<DialogContentProps, "children" | "title"> {
  /** `null` keeps the dialog closed, so one QuickView can serve a whole grid. */
  product: QuickViewProduct | null
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  currency?: string
  locale?: string
  /** Runs before the item is added to the surrounding `CartProvider`; reject to cancel. */
  onAddToCart?: (detail: QuickViewAddDetail) => void | Promise<unknown>
  /** Add to the surrounding `CartProvider` on success. */
  addToCart?: boolean
  /** Close the dialog once the item is added. */
  closeOnAdd?: boolean
  /** Link for "View full details". Defaults to `product.href`. */
  detailsHref?: string
  lowStockThreshold?: number
  labels?: QuickViewLabels
}

/* Its own frame, not Dialog's: a wide sheet split into a flush gallery and a scrolling column. */
const frameVariants = variants({
  base: [
    "kg-quick-view fixed inset-0 m-auto max-w-none overflow-hidden p-0 text-kg-fg bg-kg-surface outline-none origin-[50%_100%]",
    "open:flex open:flex-col",
    "data-[state=open]:animate-[kg-dialog-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
    "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-dialog-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
    "backdrop:bg-kg-overlay backdrop:animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
    "data-[state=closed]:backdrop:animate-[kg-fade-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
  ],
  variants: {
    size: {
      sm: "[--_width:24rem]",
      md: "[--_width:32rem]",
      lg: "[--_width:60rem]",
      full: "size-full max-h-none rounded-none border-0",
    },
  },
  compound: [
    {
      size: "sm",
      class: "h-fit max-h-[calc(100dvh-var(--kg-space)*8)] w-[min(var(--_width),calc(100%-var(--kg-space)*8))] rounded-kg-xl border-2 border-kg-ink shadow-kg-lg",
    },
    {
      size: "md",
      class: "h-fit max-h-[calc(100dvh-var(--kg-space)*8)] w-[min(var(--_width),calc(100%-var(--kg-space)*8))] rounded-kg-xl border-2 border-kg-ink shadow-kg-lg",
    },
    {
      size: "lg",
      class: "h-fit max-h-[calc(100dvh-var(--kg-space)*8)] w-[min(var(--_width),calc(100%-var(--kg-space)*8))] rounded-kg-xl border-2 border-kg-ink shadow-kg-lg",
    },
  ],
  defaults: { size: "lg" },
})

const QuickViewTitle = ({ children }: { children: ReactNode }) => {
  const context = useModalContext("QuickViewTitle")
  useModalPart(context.setHasTitle)
  return (
    <h2
      className="kg-quick-view__title m-0 pe-8 text-[length:var(--kg-text-2xl)] leading-[1.15] font-semibold tracking-[-0.025em] text-balance text-kg-fg"
      id={context.titleId}
    >
      {children}
    </h2>
  )
}

const defaultLabels = {
  viewDetails: "View full details",
  chooseOptions: "Choose your options",
}

interface BodyProps {
  product: QuickViewProduct
  currency: string | undefined
  locale: string | undefined
  onAddToCart: QuickViewProps["onAddToCart"]
  addToCart: boolean
  onAdded: () => void
  detailsHref: string | undefined
  lowStockThreshold: number | undefined
  labels: QuickViewLabels | undefined
}

const QuickViewBody = ({
  product,
  currency,
  locale,
  onAddToCart,
  addToCart,
  onAdded,
  detailsHref,
  lowStockThreshold,
  labels,
}: BodyProps) => {
  const text = { ...defaultLabels, ...labels }
  const state = useProductVariant(product)
  const { variant } = state
  const [quantity, setQuantity] = useState(1)
  const [image, setImage] = useState(variant?.image ?? 0)
  const cart = useCartActions()
  const soldOut = variant !== undefined && variant.stock <= 0
  const incomplete = variant === undefined

  useEffect(() => {
    if (variant?.image !== undefined) setImage(variant.image)
    if (variant) setQuantity((current) => Math.min(current, Math.max(variant.stock, 1)))
  }, [variant])

  const handleAdd = async () => {
    await onAddToCart?.({ product, variant, quantity })
    if (addToCart && cart) cart.addItem(toCartItem(product, variant), quantity)
    onAdded()
  }

  const href = detailsHref ?? product.href

  return (
    <div className="kg-quick-view__layout grid min-h-0 grid-cols-2 overflow-y-auto overscroll-contain max-md:grid-cols-1">
      <ProductGallery
        className="kg-quick-view__gallery sticky top-0 self-start [--_edge:0px] [--_radius:0px] max-md:static"
        images={product.images}
        index={image}
        onIndexChange={setImage}
        thumbnails="none"
        lightbox={false}
      />
      <div className="kg-quick-view__info grid content-start gap-4 px-7 py-8 max-md:p-5">
        {product.vendor && (
          <p className="kg-quick-view__vendor m-0 -mb-2 text-kg-xs font-semibold tracking-[0.08em] text-kg-fg-muted uppercase">
            {product.vendor}
          </p>
        )}
        <QuickViewTitle>{product.title}</QuickViewTitle>
        {product.rating !== undefined && (
          <Rating
            value={product.rating}
            count={product.reviewCount}
            size="sm"
            locale={locale}
            href={href ? `${href}#reviews` : undefined}
          />
        )}
        <Price
          amount={state.price}
          compareAt={state.compareAt}
          currency={currency}
          locale={locale}
          size="lg"
        />
        {product.description && (
          <DialogDescription className="kg-quick-view__description line-clamp-3">
            {product.description}
          </DialogDescription>
        )}
        {product.options.map((option) => (
          <VariantPicker
            key={option.name}
            label={option.name}
            type={option.type ?? "chip"}
            size="sm"
            options={withVariantAvailability(
              option.values,
              state.availability[option.name],
            )}
            value={state.selection[option.name] ?? null}
            onValueChange={(value) => state.select(option.name, value)}
            allowUnavailable={option.type === "swatch"}
          />
        ))}
        {variant ? (
          <StockIndicator
            quantity={variant.stock}
            lowStockThreshold={lowStockThreshold}
            showBar
            size="sm"
          />
        ) : (
          <p className="kg-quick-view__hint m-0 text-kg-sm text-kg-fg-muted">{text.chooseOptions}</p>
        )}
        <div className="kg-quick-view__buy flex gap-3">
          <QuantityStepper
            className="shrink-0"
            label={product.title}
            value={quantity}
            onValueChange={setQuantity}
            max={Math.max(variant?.stock ?? 1, 1)}
            disabled={soldOut || incomplete}
          />
          <AddToCartButton
            className="kg-quick-view__add flex-auto"
            soldOut={soldOut}
            disabled={incomplete}
            onAdd={handleAdd}
            labels={labels?.addToCart}
          />
        </div>
        {href && (
          <a
            className="kg-quick-view__details justify-self-start rounded-kg-xs text-kg-sm font-[550] text-kg-fg underline decoration-kg-border underline-offset-[0.25em] transition-[text-decoration-color] duration-(--kg-duration-fast) ease-kg-out hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
            href={href}
          >
            {text.viewDetails}
            <span aria-hidden="true"> →</span>
          </a>
        )}
      </div>
    </div>
  )
}

const QuickViewFrame = forwardRef<HTMLDialogElement, DialogContentProps>(
  (
    {
      size = "lg",
      dismissible = true,
      initialFocus,
      finalFocus,
      closeButton = true,
      closeLabel = "Close",
      onCancel,
      onClose,
      onPointerDown,
      onClick,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
      className,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const context = useModalContext("QuickView")
    const surface = useModalSurface(context, {
      dismissible,
      initialFocus,
      finalFocus,
      onCancel,
      onClose,
      onPointerDown,
      onClick,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
    })
    const ref = useComposedRefs(surface.ref, forwardedRef)
    if (!surface.present) return null
    return (
      <dialog
        ref={ref}
        className={frameVariants({ size, className })}
        data-size={size}
        data-state={surface.state}
        {...props}
        {...surface.props}
      >
        {children}
        {closeButton && (
          <div className="absolute end-3 top-3 z-1">
            <ModalCloseButton label={closeLabel} className="kg-quick-view__close" />
          </div>
        )}
      </dialog>
    )
  },
)

QuickViewFrame.displayName = "QuickViewFrame"

/** A product preview dialog: compact gallery, SKU-aware options, quantity and add to cart. */
export const QuickView = forwardRef<HTMLDialogElement, QuickViewProps>(
  (
    {
      product,
      open,
      defaultOpen,
      onOpenChange,
      currency,
      locale,
      onAddToCart,
      addToCart = true,
      closeOnAdd = false,
      detailsHref,
      lowStockThreshold,
      labels,
      className,
      size = "lg",
      dismissible = true,
      initialFocus,
      finalFocus,
      closeButton = true,
      closeLabel = "Close",
      ...props
    },
    ref,
  ) => {
    const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false)
    const isOpen = (open ?? internalOpen) && product !== null
    // Keeps the last product rendered while the dialog animates out after `product` clears.
    const [shown, setShown] = useState(product)
    if (product && product !== shown) setShown(product)
    const setOpen = (next: boolean) => {
      if (open === undefined) setInternalOpen(next)
      onOpenChange?.(next)
    }

    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <QuickViewFrame
          ref={ref}
          size={size}
          dismissible={dismissible}
          initialFocus={initialFocus}
          finalFocus={finalFocus}
          closeButton={closeButton}
          closeLabel={closeLabel}
          className={className}
          {...props}
        >
          {shown && (
            <QuickViewBody
              key={shown.id}
              product={shown}
              currency={currency}
              locale={locale}
              onAddToCart={onAddToCart}
              addToCart={addToCart}
              onAdded={() => {
                if (closeOnAdd) setTimeout(() => setOpen(false), 650)
              }}
              detailsHref={detailsHref}
              lowStockThreshold={lowStockThreshold}
              labels={labels}
            />
          )}
        </QuickViewFrame>
      </Dialog>
    )
  },
)

QuickView.displayName = "QuickView"
