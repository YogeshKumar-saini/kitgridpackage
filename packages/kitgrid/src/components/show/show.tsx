import { forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"

/** `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem. */
export type ShowBreakpoint = "sm" | "md" | "lg" | "xl"

export interface ShowProps extends HTMLAttributes<HTMLDivElement> {
  /** From this width up. */
  above?: ShowBreakpoint
  /** Below this width. */
  below?: ShowBreakpoint
  /**
   * What the widths are measured on: the viewport, or the nearest size container such as a
   * `Container`, `Section` or `Grid`.
   */
  scope?: "viewport" | "container"
}

export type HideProps = ShowProps

type Kind = "show" | "hide"
type Scope = NonNullable<ShowProps["scope"]>
type Points = Record<ShowBreakpoint, string>

// Written out in full so Tailwind sees every class it has to generate.
const NARROWER: Record<Scope, Points> = {
  viewport: {
    sm: "max-[40rem]:hidden",
    md: "max-[48rem]:hidden",
    lg: "max-[64rem]:hidden",
    xl: "max-[80rem]:hidden",
  },
  container: {
    sm: "@max-[40rem]:hidden",
    md: "@max-[48rem]:hidden",
    lg: "@max-[64rem]:hidden",
    xl: "@max-[80rem]:hidden",
  },
}

const WIDER: Record<Scope, Points> = {
  viewport: {
    sm: "min-[40rem]:hidden",
    md: "min-[48rem]:hidden",
    lg: "min-[64rem]:hidden",
    xl: "min-[80rem]:hidden",
  },
  container: {
    sm: "@min-[40rem]:hidden",
    md: "@min-[48rem]:hidden",
    lg: "@min-[64rem]:hidden",
    xl: "@min-[80rem]:hidden",
  },
}

const BETWEEN: Record<Scope, Record<string, string>> = {
  viewport: {
    "sm-md": "min-[40rem]:max-[48rem]:hidden",
    "sm-lg": "min-[40rem]:max-[64rem]:hidden",
    "sm-xl": "min-[40rem]:max-[80rem]:hidden",
    "md-lg": "min-[48rem]:max-[64rem]:hidden",
    "md-xl": "min-[48rem]:max-[80rem]:hidden",
    "lg-xl": "min-[64rem]:max-[80rem]:hidden",
  },
  container: {
    "sm-md": "@min-[40rem]:@max-[48rem]:hidden",
    "sm-lg": "@min-[40rem]:@max-[64rem]:hidden",
    "sm-xl": "@min-[40rem]:@max-[80rem]:hidden",
    "md-lg": "@min-[48rem]:@max-[64rem]:hidden",
    "md-xl": "@min-[48rem]:@max-[80rem]:hidden",
    "lg-xl": "@min-[64rem]:@max-[80rem]:hidden",
  },
}

const hiding = (kind: Kind, scope: Scope, above?: ShowBreakpoint, below?: ShowBreakpoint) => {
  if (kind === "show") return [above && NARROWER[scope][above], below && WIDER[scope][below]]
  if (above && below) return BETWEEN[scope][`${above}-${below}`]
  return [above && WIDER[scope][above], below && NARROWER[scope][below]]
}

const visibility = (kind: Kind, name: string) => {
  const Component = forwardRef<HTMLDivElement, ShowProps>(
    ({ above, below, scope = "viewport", className, ...props }, ref) => (
      <div
        ref={ref}
        className={cx("kg-show contents", hiding(kind, scope, above, below), className)}
        data-kind={kind}
        data-scope={scope}
        data-above={above}
        data-below={below}
        {...props}
      />
    ),
  )
  Component.displayName = name
  return Component
}

/**
 * Renders its children only within a width range, in CSS alone, so it works on the server and
 * never flashes. The wrapper has `display: contents` and adds no box.
 */
export const Show = visibility("show", "Show")

/** The inverse of `Show`: hides its children within a width range. */
export const Hide = visibility("hide", "Hide")
