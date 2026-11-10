"use client"

import { useCallback, useMemo, useState } from "react"
import type { CartItemInput } from "../cart/cart.js"
import type { ProductGalleryImage } from "../product-gallery/product-gallery.js"
import {
  findVariant,
  resolveVariantAvailability,
  type VariantAvailability,
  type VariantCombination,
} from "../variant-picker/variant-availability.js"
import type {
  VariantOption,
  VariantPickerType,
} from "../variant-picker/variant-picker.js"

export interface QuickViewOption {
  /** Option name, matching the keys of each variant's `options`, e.g. "Color". */
  name: string
  type?: VariantPickerType
  values: VariantOption[]
}

export interface QuickViewVariant {
  id: string
  /** Option name → value, e.g. `{ Color: "sage", Size: "M" }`. */
  options: Record<string, string>
  /** Overrides the product price for this SKU. */
  price?: number
  compareAt?: number
  stock: number
  /** Index into `images` to show when this variant is chosen. */
  image?: number
}

/** The product model shared by QuickView and product pages. */
export interface QuickViewProduct {
  id: string
  title: string
  vendor?: string
  description?: string
  price: number
  compareAt?: number
  rating?: number
  reviewCount?: number
  images: ProductGalleryImage[]
  options: QuickViewOption[]
  variants: QuickViewVariant[]
  badges?: string[]
  href?: string
}

export type QuickViewSelection = Record<string, string | null>

export interface ProductVariantState {
  selection: QuickViewSelection
  /** Chooses a value. If that leaves no SKU in stock, the other options follow the first one that is. */
  select: (name: string, value: string) => void
  /** The SKU matching every chosen option. */
  variant: QuickViewVariant | undefined
  availability: VariantAvailability
  price: number
  compareAt: number | undefined
  stock: number
  /** "Sage / M": the chosen values' labels. */
  variantTitle: string
}

const firstInStock = (product: QuickViewProduct): QuickViewVariant | undefined =>
  product.variants.find((variant) => variant.stock > 0) ?? product.variants[0]

const initialSelection = (product: QuickViewProduct): QuickViewSelection => {
  const variant = firstInStock(product)
  return Object.fromEntries(
    product.options.map((option) => [
      option.name,
      variant?.options[option.name] ?? null,
    ]),
  )
}

const labelOf = (
  product: QuickViewProduct,
  name: string,
  value: string | null | undefined,
) =>
  product.options
    .find((option) => option.name === name)
    ?.values.find((entry) => entry.value === value)?.label ??
  value ??
  ""

export const getVariantTitle = (
  product: QuickViewProduct,
  options: Readonly<Record<string, string | null | undefined>>,
): string =>
  product.options
    .map((option) => labelOf(product, option.name, options[option.name]))
    .filter(Boolean)
    .join(" / ")

/** Variant-selection state for a product: SKU-aware availability, price and stock. */
export const useProductVariant = (product: QuickViewProduct): ProductVariantState => {
  const [selection, setSelection] = useState<QuickViewSelection>(() =>
    initialSelection(product),
  )
  const combinations = useMemo<VariantCombination[]>(
    () =>
      product.variants.map((variant) => ({
        options: variant.options,
        quantity: variant.stock,
      })),
    [product.variants],
  )

  const select = useCallback(
    (name: string, value: string) => {
      setSelection((current) => {
        const next = { ...current, [name]: value }
        const exact = findVariant(next, product.variants)
        if (exact && exact.stock > 0) return next
        const fallback = product.variants.find(
          (variant) => variant.stock > 0 && variant.options[name] === value,
        )
        return fallback ? { ...next, ...fallback.options } : next
      })
    },
    [product.variants],
  )

  const variant =
    product.options.length === 0
      ? product.variants[0]
      : findVariant(selection, product.variants)
  const availability = useMemo(
    () => resolveVariantAvailability(selection, combinations),
    [selection, combinations],
  )

  return {
    selection,
    select,
    variant,
    availability,
    price: variant?.price ?? product.price,
    compareAt: variant?.compareAt ?? product.compareAt,
    stock: variant?.stock ?? 0,
    variantTitle: getVariantTitle(product, selection),
  }
}

/** The `CartItemInput` for a chosen SKU. */
export const toCartItem = (
  product: QuickViewProduct,
  variant: QuickViewVariant | undefined,
): CartItemInput => {
  const image = product.images[variant?.image ?? 0] ?? product.images[0]
  const variantTitle = variant ? getVariantTitle(product, variant.options) : ""
  return {
    productId: product.id,
    title: product.title,
    price: variant?.price ?? product.price,
    ...(variant ? { variantId: variant.id, maxQuantity: variant.stock } : null),
    ...(variantTitle ? { variantTitle } : null),
    ...((variant?.compareAt ?? product.compareAt) !== undefined
      ? { compareAt: variant?.compareAt ?? product.compareAt }
      : null),
    ...(image ? { image: image.thumbnail ?? image.src } : null),
    ...(product.href ? { href: product.href } : null),
  }
}
