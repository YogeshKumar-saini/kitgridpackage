"use client"

import { forwardRef, type ReactNode, useEffect, useRef, useState } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  type DrawerContentProps,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../drawer/drawer.js"

export interface MobileNavSheetItem {
  label: string
  href?: string
  icon?: ReactNode
  /** Nested destinations open as a new level that slides in over this one. */
  items?: MobileNavSheetItem[]
  /** Marks the current page. */
  active?: boolean
}

export interface MobileNavSheetProps
  extends Omit<DrawerContentProps, "children" | "title"> {
  items: MobileNavSheetItem[]
  /** Heading of the root level. */
  title?: string
  /** Accessible name of the hamburger trigger. */
  label?: string
  /** Pinned under the list, e.g. a sign-in button. */
  footer?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Called when a link is chosen, before the sheet closes. */
  onNavigate?: (item: MobileNavSheetItem) => void
  /** Accessible name of the back button. */
  backLabel?: string
}

const Chevron = ({ flip = false }: { flip?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    style={flip ? { transform: "scaleX(-1)" } : undefined}
  >
    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const triggerClass = [
  "kg-mobile-nav__trigger group/trigger inline-grid size-(--kg-control-md) place-items-center p-0 cursor-pointer",
  "text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-md shadow-kg-xs transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

const barClass =
  "block h-[1.5px] rounded-[1px] bg-current [transition:transform_var(--kg-duration-slow)_var(--kg-ease-out),opacity_var(--kg-duration-fast)_var(--kg-ease-out)]"

const itemClass = [
  "kg-mobile-nav__item flex min-h-[2.75rem] w-full items-center gap-3 px-3 cursor-pointer",
  "[font-family:inherit] text-kg-md font-medium text-kg-fg text-start no-underline bg-transparent border-0 rounded-kg-md",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted aria-[current=page]:bg-kg-paper-sage",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

const glyphClass = "grid size-[1.125rem] shrink-0 text-kg-fg-muted [&_svg]:size-full"

/**
 * A hamburger that opens a side sheet with drill-down navigation. Each nested level turns in
 * from the edge; Back returns focus to the item that opened it.
 */
export const MobileNavSheet = forwardRef<HTMLDialogElement, MobileNavSheetProps>(
  (
    {
      items,
      title = "Menu",
      label = "Open menu",
      footer,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      onNavigate,
      backLabel = "Back",
      side = "left",
      size = "sm",
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const [path, setPath] = useState<number[]>([])
    const [direction, setDirection] = useState<"forward" | "back">("forward")
    const list = useRef<HTMLUListElement>(null)
    const returnTo = useRef<number | null>(null)

    useEffect(() => {
      if (!open) setPath([])
    }, [open])

    const levels: { title: string; items: MobileNavSheetItem[] }[] = [{ title, items }]
    for (const index of path) {
      const parent = levels.at(-1)?.items[index]
      if (parent?.items) levels.push({ title: parent.label, items: parent.items })
    }
    const level = levels.at(-1) ?? { title, items }
    const depth = levels.length - 1

    useEffect(() => {
      if (!open || !list.current) return
      const buttons = list.current.querySelectorAll<HTMLElement>("a, button")
      const target =
        returnTo.current !== null ? buttons[returnTo.current] : depth > 0 ? buttons[0] : null
      returnTo.current = null
      target?.focus()
    }, [depth, path.join(".")])

    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger className={triggerClass} aria-label={label}>
          <span className="kg-mobile-nav__burger grid w-[1.125rem] gap-[4px]" aria-hidden="true">
            <span
              className={`${barClass} group-data-[state=open]/trigger:[transform:translateY(5.5px)_rotate(45deg)]`}
            />
            <span className={`${barClass} w-[70%] group-data-[state=open]/trigger:opacity-0`} />
            <span
              className={`${barClass} group-data-[state=open]/trigger:[transform:translateY(-5.5px)_rotate(-45deg)]`}
            />
          </span>
        </DrawerTrigger>
        <DrawerContent
          ref={ref}
          side={side}
          size={size}
          className={cx("kg-mobile-nav", className)}
          {...props}
        >
          <DrawerHeader className="kg-mobile-nav__header grid-flow-col items-center justify-start">
            {depth > 0 && (
              <button
                type="button"
                className="kg-mobile-nav__back -ms-2 me-1 grid size-[2rem] place-items-center p-0 text-kg-fg-muted bg-transparent border-0 rounded-full cursor-pointer hover:bg-kg-muted hover:text-kg-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring [&_svg]:size-[1.125rem]"
                aria-label={backLabel}
                onClick={() => {
                  setDirection("back")
                  returnTo.current = path.at(-1) ?? null
                  setPath((current) => current.slice(0, -1))
                }}
              >
                <Chevron flip />
              </button>
            )}
            <DrawerTitle>{level.title}</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="kg-mobile-nav__body">
            <ul
              key={path.join(".")}
              ref={list}
              className="kg-mobile-nav__list m-0 grid list-none gap-[2px] p-0 data-[direction=back]:animate-[kg-mobile-nav-back_var(--kg-duration-slow)_var(--kg-ease-out)] data-[direction=forward]:animate-[kg-mobile-nav-forward_var(--kg-duration-slow)_var(--kg-ease-out)]"
              data-direction={depth === 0 && direction === "forward" ? undefined : direction}
            >
              {level.items.map((item, index) => (
                <li key={`${item.label}-${index}`}>
                  {item.items ? (
                    <button
                      type="button"
                      className={itemClass}
                      onClick={() => {
                        setDirection("forward")
                        setPath((current) => [...current, index])
                      }}
                    >
                      {item.icon != null && (
                        <span className={`kg-mobile-nav__icon ${glyphClass}`} aria-hidden="true">
                          {item.icon}
                        </span>
                      )}
                      <span className="kg-mobile-nav__text min-w-0 flex-1">{item.label}</span>
                      <span className={`kg-mobile-nav__chevron ${glyphClass}`}>
                        <Chevron />
                      </span>
                    </button>
                  ) : (
                    <a
                      href={item.href}
                      className={itemClass}
                      aria-current={item.active ? "page" : undefined}
                      onClick={() => {
                        onNavigate?.(item)
                        setOpen(false)
                      }}
                    >
                      {item.icon != null && (
                        <span className={`kg-mobile-nav__icon ${glyphClass}`} aria-hidden="true">
                          {item.icon}
                        </span>
                      )}
                      <span className="kg-mobile-nav__text min-w-0 flex-1">{item.label}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </DrawerBody>
          {footer != null && <div className="kg-mobile-nav__footer shrink-0 border-t-2 border-kg-ink px-6 pt-4 pb-6">{footer}</div>}
        </DrawerContent>
      </Drawer>
    )
  },
)

MobileNavSheet.displayName = "MobileNavSheet"
