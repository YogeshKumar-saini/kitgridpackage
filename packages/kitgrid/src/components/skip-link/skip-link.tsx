"use client"

import { type AnchorHTMLAttributes, forwardRef, type MouseEvent } from "react"
import { cx } from "../../utils/cx.js"

export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The id of the landmark to jump to, with or without the leading `#`. */
  target?: string
}

/**
 * The first stop for keyboard users: hidden until focused, then jumps past the navigation.
 * Focus is moved by hand so the link also works under hash routers, where following
 * `#main` would change the route.
 */
export const SkipLink = forwardRef<HTMLAnchorElement, SkipLinkProps>(
  (
    { target = "main", className, children = "Skip to content", onClick, ...props },
    ref,
  ) => {
    const id = target.replace(/^#/, "")
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      const node = document.getElementById(id)
      if (event.defaultPrevented || !node) return
      event.preventDefault()
      if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1")
      node.focus({ preventScroll: true })
      node.scrollIntoView?.({ block: "start" })
    }
    return (
      <a
        ref={ref}
        href={`#${id}`}
        className={cx(
          "kg-skip-link absolute top-2 start-2 z-kg-toast px-3.5 py-2 text-kg-sm font-semibold no-underline",
          "text-kg-accent-fg bg-kg-accent border-2 border-kg-ink rounded-kg-md shadow-[3px_3px_0_var(--kg-paper-sage)]",
          "-translate-y-[calc(100%+var(--kg-space)*4)] opacity-0 pointer-events-none",
          "transition-[translate,opacity] duration-(--kg-duration-base) ease-kg-out motion-reduce:transition-none",
          "focus:translate-y-0 focus:opacity-100 focus:pointer-events-auto",
          "focus:outline-2 focus:outline-offset-2 focus:outline-kg-ring",
          className,
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </a>
    )
  },
)

SkipLink.displayName = "SkipLink"
