import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs/tabs.js"

export interface ProductTabsSection {
  id: string
  label: string
  content: ReactNode
}

export type ProductTabsLayout = "tabs" | "accordion"

export interface ProductTabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  sections: readonly ProductTabsSection[]
  /** `accordion` stacks native disclosures, which suits narrow columns and mobile. */
  layout?: ProductTabsLayout
  /** Section open first. Defaults to the first. */
  defaultSection?: string
  /** Accessible name of the tab list. */
  label?: string
}

const panelClass =
  "kg-product-tabs__panel text-kg-sm leading-[1.6] text-kg-fg-muted [&_p]:mt-0 [&_p]:mb-[0.75em] [&_ul]:m-0 [&_ul]:ps-[1.1em]"

const Plus = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
    className="kg-product-tabs__icon size-4 shrink-0 text-kg-fg transition-transform duration-[var(--kg-duration-slow)] ease-kg-out group-open/item:rotate-180"
  >
    <path d="M3 8h10" />
    <path
      className="kg-product-tabs__plus-v origin-center transition-transform duration-[var(--kg-duration-slow)] ease-kg-out group-open/item:scale-y-0"
      d="M8 3v10"
    />
  </svg>
)

/** Product details, shipping and returns as tabs, or as an accordion of native disclosures. */
export const ProductTabs = forwardRef<HTMLDivElement, ProductTabsProps>(
  (
    {
      sections,
      layout = "tabs",
      defaultSection,
      label = "Product information",
      className,
      ...props
    },
    ref,
  ) => {
    const first = defaultSection ?? sections[0]?.id
    if (layout === "accordion") {
      return (
        <div
          ref={ref}
          className={cx("kg-product-tabs border-t-2 border-kg-ink text-kg-fg", className)}
          data-layout="accordion"
          {...props}
        >
          {sections.map((section) => (
            <details
              key={section.id}
              className="kg-product-tabs__item group/item border-b-2 border-kg-border"
              open={section.id === first || undefined}
            >
              <summary
                className={cx(
                  "kg-product-tabs__summary flex cursor-pointer list-none items-center justify-between gap-3 rounded-kg-xs py-4",
                  "text-kg-base font-semibold text-kg-fg [&::-webkit-details-marker]:hidden",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                )}
              >
                {section.label}
                <Plus />
              </summary>
              <div
                className={cx(
                  panelClass,
                  "pb-4 group-open/item:animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
                )}
              >
                {section.content}
              </div>
            </details>
          ))}
        </div>
      )
    }
    return (
      <Tabs
        ref={ref}
        defaultValue={first}
        className={cx("kg-product-tabs text-kg-fg", className)}
        data-layout="tabs"
        {...props}
      >
        <TabsList aria-label={label} variant="underline">
          {sections.map((section) => (
            <TabsTrigger key={section.id} value={section.id}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map((section) => (
          <TabsContent key={section.id} value={section.id} className={panelClass}>
            {section.content}
          </TabsContent>
        ))}
      </Tabs>
    )
  },
)

ProductTabs.displayName = "ProductTabs"
