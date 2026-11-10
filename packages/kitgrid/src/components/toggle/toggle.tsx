"use client"

import { type ButtonHTMLAttributes, forwardRef } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: pressed is an ink fill with mint text. Ghost sits flat on the page; outline is
 * a raised sheet like an outline Button, and pressed it lifts on sage like a solid one.
 */
export const toggleVariants = variants({
  base: [
    "kg-toggle relative inline-flex items-center justify-center gap-1.5",
    "h-(--_size) min-w-(--_size) px-2.5 rounded-kg-md border-2",
    "font-medium leading-none select-none cursor-pointer [-webkit-tap-highlight-color:transparent]",
    "transition-[translate,scale,box-shadow,background-color,border-color,color] duration-(--kg-duration-fast) ease-kg-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "aria-pressed:border-kg-accent aria-pressed:bg-kg-accent aria-pressed:text-kg-accent-fg",
    "[&_svg]:size-[1.1em] [&_svg]:shrink-0",
  ],
  variants: {
    variant: {
      ghost: [
        "border-transparent bg-transparent text-kg-fg-muted",
        "interactive:hover:not-aria-pressed:bg-kg-muted interactive:hover:not-aria-pressed:text-kg-fg",
        "interactive:active:scale-95",
      ],
      outline: [
        "border-kg-ink bg-kg-surface text-kg-fg shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
        "aria-pressed:[--_lift:var(--kg-paper-sage)]",
        "interactive:hover:-translate-px interactive:hover:shadow-[5px_5px_0_var(--_lift,var(--kg-ink))]",
        "interactive:active:translate-x-[3px] interactive:active:translate-y-[3px] interactive:active:shadow-none",
        "disabled:shadow-none",
      ],
    },
    size: {
      sm: "[--_size:var(--kg-control-sm)] text-kg-xs",
      md: "[--_size:var(--kg-control-md)] text-kg-sm",
      lg: "[--_size:var(--kg-control-lg)] text-kg-base",
    },
  },
  defaults: { variant: "ghost", size: "md" },
})

type ToggleVariantProps = VariantProps<typeof toggleVariants>
export type ToggleSize = NonNullable<ToggleVariantProps["size"]>
export type ToggleVariant = NonNullable<ToggleVariantProps["variant"]>

export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  size?: ToggleSize
  variant?: ToggleVariant
}

/**
 * A two-state button (`aria-pressed`). For formatting bars, filters and view switches. Give
 * icon-only toggles an `aria-label`; it stays the same in both states.
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      pressed: pressedProp,
      defaultPressed = false,
      onPressedChange,
      size = "md",
      variant = "ghost",
      className,
      onClick,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const [pressed, setPressed] = useControllableState({
      value: pressedProp,
      defaultValue: defaultPressed,
      onChange: onPressedChange,
    })
    return (
      <button
        ref={ref}
        type={type}
        aria-pressed={pressed}
        className={toggleVariants({ variant, size, className })}
        data-size={size}
        data-variant={variant}
        data-state={pressed ? "on" : "off"}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) setPressed(!pressed)
        }}
        {...props}
      />
    )
  },
)

Toggle.displayName = "Toggle"
