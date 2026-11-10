"use client"

import { type FieldsetHTMLAttributes, forwardRef, useId } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useLocale } from "../../hooks/use-locale.js"
import { cx } from "../../utils/cx.js"

export type StoreLocatorListStock = "in-stock" | "low-stock" | "out-of-stock"

export interface StoreLocatorListStore {
  id: string
  name: string
  address: string
  /** Distance from the shopper, in `unit`. */
  distance?: number
  /** e.g. "Closes 8 pm". */
  hours?: string
  open?: boolean
  stock?: StoreLocatorListStock
  directionsHref?: string
}

export interface StoreLocatorListLabels {
  legend?: string
  open?: string
  closed?: string
  directions?: string
  stock?: Partial<Record<StoreLocatorListStock, string>>
}

export interface StoreLocatorListProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "defaultValue" | "onChange"
> {
  stores: readonly StoreLocatorListStore[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (id: string) => void
  unit?: "km" | "mi"
  locale?: string
  showLegend?: boolean
  name?: string
  labels?: StoreLocatorListLabels
}

const defaultStock: Record<StoreLocatorListStock, string> = {
  "in-stock": "In stock",
  "low-stock": "Only a few left",
  "out-of-stock": "Out of stock",
}

const dot =
  "inline-flex items-center gap-[0.4em] font-[550] before:size-[0.45rem] before:shrink-0 before:rounded-full before:content-['']"

const stockTone: Record<StoreLocatorListStock, string> = {
  "in-stock": "text-kg-success before:bg-current",
  "low-stock": "text-kg-fg before:bg-kg-warning",
  "out-of-stock": "text-kg-danger before:bg-current",
}

/** Pickup-store chooser: distance, opening status and per-store stock, sorted by the caller. */
export const StoreLocatorList = forwardRef<HTMLFieldSetElement, StoreLocatorListProps>(
  (
    {
      stores,
      value: valueProp,
      defaultValue = null,
      onValueChange,
      unit = "km",
      locale: localeProp,
      showLegend = false,
      name,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const locale = useLocale(localeProp)
    const generated = useId()
    const stockText = { ...defaultStock, ...labels?.stock }
    const [value, setValue] = useControllableState<string | null>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((value: string | null) => void) | undefined,
    })
    const distance = new Intl.NumberFormat(locale, {
      style: "unit",
      unit: unit === "km" ? "kilometer" : "mile",
      maximumFractionDigits: 1,
    })

    return (
      <fieldset ref={ref} className={cx("kg-store-list m-0 min-w-0 border-0 p-0 text-kg-fg", className)} {...props}>
        <legend className={
            showLegend ? "kg-store-list__legend mb-3 p-0 text-kg-md font-[650]" : "kg-visually-hidden"
          }>
          {labels?.legend ?? "Pickup store"}
        </legend>
        <ul className="kg-store-list__list m-0 grid list-none gap-2 p-0">
          {stores.map((store) => {
            const inputId = `${generated}-${store.id}`
            const unavailable = store.stock === "out-of-stock"
            return (
              <li
                key={store.id}
                className={`kg-store-list__store relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 gap-y-1 rounded-kg-lg border-2 bg-kg-surface px-4 py-3.5 transition-[border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out ${
                  value === store.id
                    ? "border-kg-ink shadow-kg-sm"
                    : unavailable
                      ? "border-kg-border opacity-60"
                      : "border-kg-border hover:border-kg-ink"
                }`}
                data-state={value === store.id ? "checked" : "unchecked"}
              >
                <input
                  id={inputId}
                  type="radio"
                  className="kg-store-list__input row-span-2 mx-0 mt-[0.15rem] mb-0 size-[1.05rem] accent-kg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring disabled:cursor-not-allowed"
                  name={name ?? generated}
                  value={store.id}
                  checked={value === store.id}
                  disabled={unavailable}
                  aria-describedby={`${inputId}-meta`}
                  onChange={() => setValue(store.id)}
                />
                <label htmlFor={inputId} className={`kg-store-list__main flex items-baseline justify-between gap-2 after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] ${
                    unavailable ? "cursor-not-allowed" : "cursor-pointer"
                  }`}>
                  <span className="kg-store-list__name text-kg-sm font-[650]">{store.name}</span>{" "}
                  {store.distance !== undefined && (
                    <span className="kg-store-list__distance whitespace-nowrap text-kg-xs font-semibold text-kg-fg-muted tabular-nums">
                      {distance.format(store.distance)}
                    </span>
                  )}
                </label>
                <div id={`${inputId}-meta`} className="kg-store-list__meta col-start-2 grid gap-1 text-kg-xs text-kg-fg-muted">
                  <span className="kg-store-list__address">{store.address}<span className="kg-visually-hidden">.</span></span>{" "}
                  <span className="kg-store-list__facts flex flex-wrap gap-x-3 gap-y-1">
                    {store.open !== undefined && (
                      <span
                        className={`kg-store-list__open ${dot} ${store.open ? "text-kg-success before:bg-current" : "text-kg-fg-muted before:bg-kg-fg-faint"}`}
                        data-open={store.open}
                      >
                        {store.open ? (labels?.open ?? "Open") : (labels?.closed ?? "Closed")}
                        {store.hours && (
                          <span className="kg-store-list__hours -ms-[0.4em] font-normal text-kg-fg-muted">
                            , {store.hours}
                          </span>
                        )}
                        <span className="kg-visually-hidden">.</span>
                      </span>
                    )}{" "}
                    {store.stock && (
                      <span
                        className={`kg-store-list__stock ${dot} ${stockTone[store.stock]}`}
                        data-stock={store.stock}
                      >
                        {stockText[store.stock]}
                      </span>
                    )}
                  </span>
                </div>
                {store.directionsHref && (
                  <a
                    className="kg-store-list__directions relative z-1 col-start-3 row-start-2 self-end rounded-kg-xs text-kg-xs font-semibold text-kg-accent-strong underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"
                    href={store.directionsHref}
                  >
                    {labels?.directions ?? "Directions"}
                    <span className="kg-visually-hidden"> to {store.name}</span>
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      </fieldset>
    )
  },
)

StoreLocatorList.displayName = "StoreLocatorList"
