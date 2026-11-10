"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useState } from "react"
import { cx } from "../../utils/cx.js"
import { Price } from "../price/price.js"
import { Switch } from "../switch/switch.js"

export type ProductCompareSpec = string | number | boolean | null | undefined

export interface ProductCompareProduct {
  id: string
  name: string
  image?: string
  href?: string
  price: number
  compareAt?: number
  /** Values keyed by attribute key. Booleans render as marks. */
  specs: Record<string, ProductCompareSpec>
}

export interface ProductCompareAttribute {
  key: string
  label: string
}

export interface ProductCompareLabels {
  caption?: string
  differences?: string
  remove?: (name: string) => string
  yes?: string
  no?: string
  attribute?: string
}

export interface ProductCompareProps extends HTMLAttributes<HTMLDivElement> {
  products: readonly ProductCompareProduct[]
  attributes: readonly ProductCompareAttribute[]
  currency?: string
  locale?: string
  onRemove?: (id: string) => void
  /** Footer cell per product, e.g. an add-to-cart button. */
  renderAction?: (product: ProductCompareProduct) => ReactNode
  defaultDifferencesOnly?: boolean
  labels?: ProductCompareLabels
}

const defaultLabels: Required<ProductCompareLabels> = {
  caption: "Compare products",
  differences: "Only differences",
  remove: (name) => `Remove ${name} from comparison`,
  yes: "Yes",
  no: "No",
  attribute: "Attribute",
}

/**
 * Side-by-side spec table. Rows where every product matches can be hidden, and rows that differ
 * are tinted so the eye lands on what actually separates the options.
 */
export const ProductCompare = forwardRef<HTMLDivElement, ProductCompareProps>(
  (
    {
      products,
      attributes,
      currency = "USD",
      locale,
      onRemove,
      renderAction,
      defaultDifferencesOnly = false,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const [differencesOnly, setDifferencesOnly] = useState(defaultDifferencesOnly)
    const rows = attributes.map((attribute) => {
      const values = products.map((product) => product.specs[attribute.key])
      const differs = new Set(values.map((value) => String(value ?? ""))).size > 1
      return { attribute, values, differs }
    })
    const visible = differencesOnly ? rows.filter((row) => row.differs) : rows

    const cell = (value: ProductCompareSpec) =>
      value === true ? (
        <span
          className="kg-product-compare__mark inline-grid size-5 place-items-center rounded-full bg-kg-accent text-kg-accent-fg [&_svg]:size-[0.8rem]"
          data-value="yes"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="kg-visually-hidden">{text.yes}</span>
        </span>
      ) : value === false || value == null ? (
        <span className="kg-product-compare__mark inline-grid place-items-center text-kg-fg-faint" data-value="no">
          <span aria-hidden="true">-</span>
          <span className="kg-visually-hidden">{text.no}</span>
        </span>
      ) : (
        value
      )

    return (
      <div ref={ref} className={cx("kg-product-compare grid gap-3 text-kg-fg", className)} {...props}>
        <div className="kg-product-compare__toolbar flex justify-end">
          <Switch
            size="sm"
            label={text.differences}
            checked={differencesOnly}
            onCheckedChange={setDifferencesOnly}
          />
        </div>
        <div className="kg-product-compare__scroll overflow-x-auto rounded-kg-xl border-2 border-kg-ink bg-kg-surface shadow-kg-sm">
          <table
            className="kg-product-compare__table w-full table-fixed border-collapse text-kg-sm"
            style={{ minWidth: `calc(9rem + ${products.length} * 10rem)` }}
          >
            <caption className="kg-visually-hidden">{text.caption}</caption>
            <thead>
              <tr>
                <td className="kg-product-compare__corner w-36 px-4 py-3 align-middle" />
                {products.map((product) => (
                  <th key={product.id} scope="col" className="kg-product-compare__product px-4 py-3 text-start align-top font-[inherit]">
                    <div className="kg-product-compare__head relative grid gap-1.5">
                      {onRemove && (
                        <button
                          type="button"
                          className="kg-product-compare__remove absolute end-1.5 top-1.5 z-1 grid size-7 cursor-pointer place-items-center rounded-full border-2 border-kg-ink bg-kg-surface p-0 text-kg-fg shadow-kg-xs transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out hover:-translate-px hover:shadow-kg-sm active:translate-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring [&_svg]:size-[0.8rem]"
                          aria-label={text.remove(product.name)}
                          onClick={() => onRemove(product.id)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M7 7l10 10M17 7 7 17" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                      <span
                        className="kg-product-compare__image mb-1.5 block aspect-square overflow-hidden rounded-kg-lg border-2 border-kg-ink bg-kg-muted data-placeholder:bg-kg-paper-sage"
                        data-placeholder={product.image ? undefined : ""}
                      >
                        {product.image && (
                          <img className="kg-product-compare__img size-full object-cover" src={product.image} alt="" />
                        )}
                      </span>
                      {product.href ? (
                        <a
                          className="kg-product-compare__name rounded-kg-xs font-semibold text-inherit no-underline hover:underline hover:underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
                          href={product.href}
                        >
                          {product.name}
                        </a>
                      ) : (
                        <span className="kg-product-compare__name font-semibold">{product.name}</span>
                      )}
                      <Price
                        amount={product.price}
                        compareAt={product.compareAt}
                        currency={currency}
                        locale={locale}
                        size="sm"
                        savings={false}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(({ attribute, values, differs }) => (
                <tr
                  key={attribute.key}
                  className="kg-product-compare__row group/row border-t border-kg-border"
                  data-differs={differs || undefined}
                >
                  <th
                    scope="row"
                    className="kg-product-compare__attribute px-4 py-3 align-middle text-start font-medium text-kg-fg-muted group-data-differs/row:bg-kg-paper-butter group-data-differs/row:text-kg-fg group-data-differs/row:shadow-[inset_3px_0_0_var(--kg-ink)]"
                  >
                    {attribute.label}
                  </th>
                  {values.map((value, index) => (
                    <td
                      key={products[index]?.id ?? index}
                      className="kg-product-compare__cell px-4 py-3 align-middle tabular-nums group-data-differs/row:bg-kg-paper-butter"
                    >
                      {cell(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {renderAction && (
              <tfoot>
                <tr className="kg-product-compare__foot">
                  <td className="border-t border-kg-border" />
                  {products.map((product) => (
                    <td key={product.id} className="kg-product-compare__action border-t border-kg-border px-4 py-3 align-middle">
                      {renderAction(product)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    )
  },
)

ProductCompare.displayName = "ProductCompare"
