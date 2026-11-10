import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: the same white sheet as Input. Focus, or an open popup, lifts it off the page
 * with an offset in ink, or in danger while invalid.
 */
export const inputGroupVariants = variants({
  base: [
    "kg-input-group relative flex items-center gap-2 w-full min-w-0 min-h-(--_h) text-kg-fg cursor-text",
    "rounded-kg-md border-2 border-kg-ink bg-kg-surface",
    "transition-[border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
    "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kg-ring",
    "focus-within:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
    "data-[state=open]:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
    "data-invalid:border-kg-danger data-invalid:[--_lift:var(--kg-danger)]",
    "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:shadow-none",
  ],
  variants: {
    size: {
      sm: "text-kg-sm [--_h:var(--kg-control-sm)] [--_px:calc(var(--kg-space)*2.5)]",
      md: "text-kg-base [--_h:var(--kg-control-md)] [--_px:calc(var(--kg-space)*3)]",
      lg: "text-kg-md [--_h:var(--kg-control-lg)] [--_px:calc(var(--kg-space)*4)]",
    },
    multiline: {
      true: "flex-wrap py-1 ps-1.5",
      false: "ps-(--_px)",
    },
    /** `tight` pulls trailing buttons toward the edge. */
    end: {
      pad: "pe-(--_px)",
      tight: "pe-[calc(var(--_px)*0.6)]",
    },
  },
  defaults: { size: "md", multiline: false, end: "pad" },
})

export type InputGroupSize = NonNullable<
  VariantProps<typeof inputGroupVariants>["size"]
>

export const inputGroupAddon = (kind: "text" | "icon" = "icon") =>
  cx(
    "kg-input-group__addon inline-flex items-center shrink-0 leading-none select-none",
    "transition-colors duration-(--kg-duration-fast) ease-kg-out [&_svg]:size-[1.1em]",
    kind === "text"
      ? "text-kg-fg-muted whitespace-nowrap"
      : "text-kg-fg-faint [.kg-input-group:focus-within_&]:text-kg-fg-muted",
  )

/** A bare native input inside the group. */
export const inputGroupControl = cx(
  "kg-input-group__control flex-1 self-stretch min-w-[3ch] min-h-[calc(var(--_h)-4px)] m-0 p-0 border-0 bg-transparent",
  "[font:inherit] text-inherit caret-kg-accent-strong text-ellipsis outline-none",
  "[[data-multiline]>&]:min-h-[calc(var(--_h)-4px-var(--kg-space)*2)] [[data-multiline]>&]:ps-1.5",
  "placeholder:text-kg-fg-faint placeholder:opacity-100 disabled:cursor-not-allowed",
  "autofill:[-webkit-text-fill-color:var(--kg-fg)] autofill:[transition:background-color_600000s_0s]",
)

/** Small square button inside the group: clear, reveal, stepper, calendar. */
export const inputGroupButton = cx(
  "kg-input-group__button relative inline-grid place-items-center shrink-0 size-7 -mx-1 p-0",
  "border-0 rounded-kg-sm bg-transparent text-kg-fg-muted cursor-pointer [&_svg]:size-4",
  "transition-[background-color,color,scale] duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:bg-kg-muted interactive:hover:text-kg-fg interactive:active:scale-92",
  "aria-pressed:text-kg-fg disabled:cursor-not-allowed disabled:opacity-45",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
)

export interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  size?: InputGroupSize
  invalid?: boolean
  disabled?: boolean
  /** Lets the group grow past one line, for chips that wrap. */
  multiline?: boolean
  children?: ReactNode
}

export interface InputGroupAddonProps extends HTMLAttributes<HTMLSpanElement> {
  /** `text` for prefixes like `https://`, `icon` for decorative glyphs. */
  kind?: "text" | "icon"
}

/**
 * The surface of a text field without the input: hosts chips, segments, buttons and native
 * inputs side by side and shows one focus halo for all of them. Server-component safe.
 */
export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ size = "md", invalid, disabled, multiline = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={inputGroupVariants({ size, multiline, className })}
      data-size={size}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      data-multiline={multiline || undefined}
      {...props}
    />
  ),
)

InputGroup.displayName = "InputGroup"

export const InputGroupAddon = forwardRef<HTMLSpanElement, InputGroupAddonProps>(
  ({ kind = "icon", className, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden={kind === "icon" ? true : undefined}
      className={cx(inputGroupAddon(kind), className)}
      data-kind={kind}
      {...props}
    />
  ),
)

InputGroupAddon.displayName = "InputGroupAddon"
