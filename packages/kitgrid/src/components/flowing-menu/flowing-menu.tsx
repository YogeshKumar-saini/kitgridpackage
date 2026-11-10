"use client"

import { forwardRef, type HTMLAttributes, type PointerEvent } from "react"
import { cx } from "../../utils/cx.js"

export interface FlowingMenuItem {
  label: string
  href: string
  /** Shown as a pill between repeats in the hover marquee. */
  image?: string
}

export interface FlowingMenuProps extends HTMLAttributes<HTMLElement> {
  items: FlowingMenuItem[]
  /** Accessible name of the navigation landmark. */
  label?: string
}

const edgeOf = (event: PointerEvent<HTMLElement>): "top" | "bottom" => {
  const rect = event.currentTarget.getBoundingClientRect()
  return event.clientY - rect.top < rect.height / 2 ? "top" : "bottom"
}

/**
 * Full-width menu rows. Hovering a row floods it from the edge the pointer came through with
 * an accent band carrying a marquee of the label, and drains it toward the edge it leaves by.
 */
export const FlowingMenu = forwardRef<HTMLElement, FlowingMenuProps>(
  ({ items, label = "Menu", className, ...props }, ref) => {
    const enter = (event: PointerEvent<HTMLElement>) => {
      const row = event.currentTarget
      row.dataset.edge = edgeOf(event)
      // Commit the start edge before opening so the band slides in from it.
      void row.offsetWidth
      row.dataset.state = "open"
    }
    const leave = (event: PointerEvent<HTMLElement>) => {
      const row = event.currentTarget
      row.dataset.edge = edgeOf(event)
      row.dataset.state = "closed"
    }

    return (
      <nav ref={ref} className={cx(
          "kg-flowing-menu w-full [--_band-fg:var(--kg-flowing-menu-band-fg,var(--kg-surface))] [--_band:var(--kg-flowing-menu-band,var(--kg-ink))]",
          className,
        )} aria-label={label} {...props}>
        <ul className="kg-flowing-menu__list m-0 list-none p-0">
          {items.map((item) => (
            <li
              key={item.href + item.label}
              className="kg-flowing-menu__row group/row relative overflow-hidden border-t border-kg-border-strong [--_from:101%] last:border-b data-[edge=top]:[--_from:-101%]"
              data-state="closed"
              data-edge="bottom"
              onPointerEnter={enter}
              onPointerLeave={leave}
            >
              <a
                className="kg-flowing-menu__link flex min-h-[var(--kg-flowing-menu-row,5.5rem)] items-center justify-center text-kg-fg no-underline text-[length:var(--kg-flowing-menu-size,clamp(1.75rem,4vw,2.75rem))] font-[650] tracking-[-0.03em] uppercase focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-kg-ring"
                href={item.href}
              >
                {item.label}
              </a>
              <span
                className="kg-flowing-menu__band pointer-events-none absolute inset-0 flex translate-y-(--_from) items-center overflow-hidden bg-(--_band) text-(--_band-fg) transition-transform duration-(--kg-duration-slower) ease-kg-out group-focus-within/row:translate-y-0 group-data-[state=open]/row:translate-y-0"
                aria-hidden="true"
              >
                <span className="kg-flowing-menu__track flex w-max animate-[kg-flowing-menu-scroll_14s_linear_infinite] [animation-play-state:paused] group-focus-within/row:[animation-play-state:running] group-data-[state=open]/row:[animation-play-state:running] motion-reduce:animate-none [[data-kg-motion=reduce]_&]:animate-none">
                  {[0, 1].map((group) => (
                    <span key={group} className="kg-flowing-menu__group flex shrink-0">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="kg-flowing-menu__chunk inline-flex items-center gap-[2.5vw] whitespace-nowrap pe-[2.5vw] text-[length:var(--kg-flowing-menu-size,clamp(1.75rem,4vw,2.75rem))] font-[650] tracking-[-0.03em] uppercase"
                        >
                          <span>{item.label}</span>
                          {item.image ? (
                            <span
                              className="kg-flowing-menu__image h-[3.5rem] w-[8rem] rounded-full border-2 border-current bg-cover bg-center"
                              style={{ backgroundImage: `url("${item.image}")` }}
                            />
                          ) : (
                            <span className="kg-flowing-menu__dot size-[0.6em] rounded-full bg-current" />
                          )}
                        </span>
                      ))}
                    </span>
                  ))}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </nav>
    )
  },
)

FlowingMenu.displayName = "FlowingMenu"
