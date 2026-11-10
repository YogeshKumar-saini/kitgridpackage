import {
  Children,
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react"
import { Slot } from "../../primitives/slot.js"
import { cx } from "../../utils/cx.js"

export interface SettingsNavProps extends HTMLAttributes<HTMLElement> {
  /** Accessible name of the navigation landmark. */
  label?: string
}

/**
 * The section list beside a settings page. Vertical in wide layouts; in a narrow container
 * it turns into a scrolling row of pills. Server-safe.
 */
export const SettingsNav = forwardRef<HTMLElement, SettingsNavProps>(
  ({ label = "Settings", className, children, ...props }, ref) => (
    <nav
      ref={ref}
      aria-label={label}
      className={cx("kg-settings-nav @container min-w-0", className)}
      {...props}
    >
      <ul
        className={cx(
          "kg-settings-nav__list grid gap-[2px] m-0 p-0 list-none",
          "max-[40rem]:flex max-[40rem]:gap-1 max-[40rem]:p-[3px] max-[40rem]:overflow-x-auto",
          "max-[40rem]:[scrollbar-width:none] max-[40rem]:snap-x max-[40rem]:snap-proximity",
        )}
      >
        {children}
      </ul>
    </nav>
  ),
)

SettingsNav.displayName = "SettingsNav"

export interface SettingsNavItemProps extends HTMLAttributes<HTMLElement> {
  icon?: ReactNode
  /** One line under the label, hidden in the narrow row. */
  description?: ReactNode
  /** Marks the current section with `aria-current="page"`. */
  active?: boolean
  href?: string
  /** Render the single child (e.g. a router `Link`) as the item, keeping its own children. */
  asChild?: boolean
}

/* Paper Layers: the current section is a white sheet on an ink edge, its icon an ink tile. */
const itemClass = (current: boolean) =>
  cx(
    "kg-settings-nav__item relative flex items-start gap-3 w-full px-3 py-2.5",
    "[font:inherit] text-start no-underline border-2 rounded-kg-lg cursor-pointer",
    "transition-[color,background-color,border-color] duration-(--kg-duration-fast) ease-kg-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
    "max-[40rem]:items-center max-[40rem]:gap-2 max-[40rem]:py-1.5 max-[40rem]:rounded-full max-[40rem]:whitespace-nowrap",
    current
      ? "text-kg-fg bg-kg-surface border-kg-ink shadow-kg-xs"
      : "text-kg-fg-muted bg-transparent border-transparent hover:text-kg-fg hover:bg-kg-muted",
  )

const Inner = ({
  icon,
  description,
  current,
  children,
}: {
  icon?: ReactNode
  description?: ReactNode
  current: boolean
  children?: ReactNode
}) => (
  <>
    {icon != null && (
      <span
        className={cx(
          "kg-settings-nav__icon grid place-items-center shrink-0 size-[1.875rem] rounded-kg-md border-2 [&_svg]:size-4",
          "transition-[color,background-color] duration-(--kg-duration-fast) ease-kg-out",
          "max-[40rem]:size-[1.5rem] max-[40rem]:rounded-full max-[40rem]:border-0",
          current
            ? "text-kg-accent-fg bg-kg-accent border-kg-accent"
            : "text-kg-fg-muted bg-kg-surface border-kg-border",
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
    )}
    <span className="kg-settings-nav__text grid gap-px min-w-0 py-0.75">
      <span
        className={cx(
          "kg-settings-nav__label text-kg-base leading-[1.35]",
          current ? "font-semibold" : "font-medium",
        )}
      >
        {children}
      </span>
      {description != null && (
        <span className="kg-settings-nav__description text-kg-xs leading-[1.4] text-kg-fg-muted @max-[14rem]:hidden max-[40rem]:hidden">
          {description}
        </span>
      )}
    </span>
  </>
)

export const SettingsNavItem = forwardRef<HTMLElement, SettingsNavItemProps>(
  (
    {
      icon,
      description,
      active = false,
      href,
      asChild = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const shared = {
      // One ref type for whichever element renders.
      ref: ref as Ref<HTMLAnchorElement & HTMLButtonElement>,
      className: cx(itemClass(active), className),
      "aria-current": active ? ("page" as const) : undefined,
      ...props,
    }
    const child = asChild ? Children.only(children) : null
    let element: ReactNode
    if (isValidElement(child)) {
      const own = (child.props as { children?: ReactNode }).children
      element = (
        <Slot {...shared}>
          {cloneElement(
            child as ReactElement<{ children?: ReactNode }>,
            undefined,
            <Inner icon={icon} description={description} current={active}>
              {own}
            </Inner>,
          )}
        </Slot>
      )
    } else if (href !== undefined) {
      element = (
        <a href={href} {...shared}>
          <Inner icon={icon} description={description} current={active}>
            {children}
          </Inner>
        </a>
      )
    } else {
      element = (
        <button type="button" {...shared}>
          <Inner icon={icon} description={description} current={active}>
            {children}
          </Inner>
        </button>
      )
    }
    return <li className="kg-settings-nav__entry max-[40rem]:shrink-0 max-[40rem]:snap-start">{element}</li>
  },
)

SettingsNavItem.displayName = "SettingsNavItem"
