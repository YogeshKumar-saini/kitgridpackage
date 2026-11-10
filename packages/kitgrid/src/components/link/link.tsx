import { type AnchorHTMLAttributes, forwardRef } from "react"
import { Slot } from "../../primitives/slot.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/* --_ink is the text and hover underline, --_rest the quieter resting underline. */
const linkVariants = variants({
  base: [
    "kg-link group/link inline cursor-pointer rounded-kg-xs font-medium text-(--_ink)",
    "decoration-1 underline-offset-[0.22em] [text-decoration-skip-ink:auto]",
    "transition-[color,text-decoration-color] duration-(--kg-duration-fast) ease-kg-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  ],
  variants: {
    tone: {
      accent:
        "[--_ink:var(--kg-accent-strong)] [--_rest:color-mix(in_oklab,var(--kg-accent-strong)_40%,transparent)]",
      default:
        "[--_ink:var(--kg-fg)] [--_rest:color-mix(in_oklab,var(--kg-fg)_30%,transparent)]",
      muted:
        "[--_ink:var(--kg-fg-muted)] [--_rest:color-mix(in_oklab,var(--kg-fg-muted)_35%,transparent)] hover:[--_ink:var(--kg-fg)]",
    },
    underline: {
      always: "underline decoration-(color:--_rest) hover:decoration-(color:--_ink)",
      hover: "underline decoration-transparent hover:decoration-(color:--_ink)",
      none: "no-underline",
    },
  },
  defaults: { tone: "accent", underline: "always" },
})

type LinkVariantProps = VariantProps<typeof linkVariants>
export type LinkTone = NonNullable<LinkVariantProps["tone"]>
export type LinkUnderline = NonNullable<LinkVariantProps["underline"]>

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  tone?: LinkTone
  underline?: LinkUnderline
  /** Opens in a new tab, safely, with an arrow and a spoken hint. */
  external?: boolean
  /** Renders your router's link with these styles instead of an `a`. */
  asChild?: boolean
}

const Arrow = () => (
  <svg
    className="kg-link__icon ms-[0.15em] inline-block align-[-0.05em] transition-transform duration-(--kg-duration-fast) ease-kg-out group-hover/link:translate-x-px group-hover/link:-translate-y-px"
    viewBox="0 0 16 16"
    width="0.8em"
    height="0.8em"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5.5 4.5h6v6M11.5 4.5l-7 7" />
  </svg>
)

/** An inline link with an underline that sits clear of descenders, and a safe external mode. */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  (
    {
      tone = "accent",
      underline = "always",
      external = false,
      asChild = false,
      className,
      children,
      target,
      rel,
      ...props
    },
    ref,
  ) => {
    const shared = {
      ref,
      className: linkVariants({ tone, underline, className }),
      "data-tone": tone,
      "data-underline": underline,
      ...props,
    }
    if (asChild) return <Slot {...shared}>{children}</Slot>
    return (
      <a
        {...shared}
        target={external ? "_blank" : target}
        rel={external ? (rel ?? "noopener noreferrer") : rel}
      >
        {children}
        {external ? (
          <>
            <Arrow />
            <span className="kg-visually-hidden"> (opens in a new tab)</span>
          </>
        ) : null}
      </a>
    )
  },
)

Link.displayName = "Link"
