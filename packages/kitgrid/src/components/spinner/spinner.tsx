import { forwardRef, type HTMLAttributes } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/* A loading indicator is information, so under reduced motion it keeps moving, just slower. */
const spinnerVariants = variants({
  base: [
    "kg-spinner relative inline-flex size-(--_size) shrink-0 items-center justify-center align-middle",
    "[--_thickness:max(2px,calc(var(--_size)*0.12))] [--_dots:1.1s]",
    "motion-reduce:[--_dots:2.6s] [[data-kg-motion=reduce]_&]:[--_dots:2.6s]",
  ],
  variants: {
    size: {
      xs: "[--_size:0.875rem]",
      sm: "[--_size:1rem]",
      md: "[--_size:1.25rem]",
      lg: "[--_size:1.75rem]",
      xl: "[--_size:2.5rem]",
    },
    tone: {
      current: "",
      neutral: "text-kg-fg-muted",
      accent: "text-kg-accent-strong",
      success: "text-kg-success",
      warning: "text-kg-warning",
      danger: "text-kg-danger",
      info: "text-kg-info",
    },
    variant: {
      ring: "",
      dots: "",
    },
  },
  defaults: { size: "md", tone: "current", variant: "ring" },
})

type SpinnerVariantProps = VariantProps<typeof spinnerVariants>
export type SpinnerSize = NonNullable<SpinnerVariantProps["size"]>
export type SpinnerTone = NonNullable<SpinnerVariantProps["tone"]>
export type SpinnerVariant = NonNullable<SpinnerVariantProps["variant"]>

const dot = [
  "aspect-square w-[calc(var(--_size)*0.24)] rounded-full bg-current",
  "[animation-name:kg-spinner-dot] [animation-duration:var(--_dots)] [animation-timing-function:var(--kg-ease-in-out)]",
  "[animation-iteration-count:infinite] [animation-fill-mode:both]",
].join(" ")

export interface SpinnerProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> {
  size?: SpinnerSize
  /** `current` inherits the surrounding text color, e.g. inside a button. */
  tone?: SpinnerTone
  variant?: SpinnerVariant
  /** Announced to screen readers; never shown. */
  label?: string
}

/** An indeterminate loading indicator. Keeps turning under reduced motion, only slower. */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(
  (
    {
      size = "md",
      tone = "current",
      variant = "ring",
      label = "Loading",
      className,
      ...props
    },
    ref,
  ) => (
    <span
      ref={ref}
      role="status"
      className={spinnerVariants({ size, tone, variant, className })}
      data-size={size}
      data-tone={tone}
      data-variant={variant}
      {...props}
    >
      {variant === "dots" ? (
        <span
          className="kg-spinner__dots inline-flex w-full items-center justify-between"
          aria-hidden="true"
        >
          <span className={dot} />
          <span className={`${dot} [animation-delay:calc(var(--_dots)*0.15)]`} />
          <span className={`${dot} [animation-delay:calc(var(--_dots)*0.3)]`} />
        </span>
      ) : (
        <span
          className={[
            "kg-spinner__ring size-full rounded-full border-solid border-(length:--_thickness)",
            "border-[color-mix(in_oklab,currentColor_16%,transparent)] border-t-current",
            "animate-spin [animation-duration:0.8s] motion-reduce:[animation-duration:2.4s] [[data-kg-motion=reduce]_&]:[animation-duration:2.4s]",
          ].join(" ")}
          aria-hidden="true"
        />
      )}
      <span className="kg-visually-hidden">{label}</span>
    </span>
  ),
)

Spinner.displayName = "Spinner"
