"use client"

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  forwardRef,
  type MouseEvent,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type WishlistButtonVariant = "floating" | "inline"
export type WishlistButtonSize = "sm" | "md" | "lg"

export interface WishlistButtonLabels {
  /**
   * The accessible name. It stays the same in both states because the button exposes
   * `aria-pressed` (WAI-ARIA APG: a toggle's label must not change with its state).
   */
  label?: string
  /** Announced politely after the shopper adds the item. */
  added?: string
  /** Announced politely after the shopper removes the item. */
  removed?: string
  /** Visible text of the inline variant, unpressed and pressed. */
  inline?: string
  inlinePressed?: string
}

export interface WishlistButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-pressed"
> {
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  /** `floating`: a round button to place over product imagery. `inline`: icon and text. */
  variant?: WishlistButtonVariant
  size?: WishlistButtonSize
  labels?: WishlistButtonLabels
}

const defaultLabels: Required<WishlistButtonLabels> = {
  label: "Add to wishlist",
  added: "Added to wishlist",
  removed: "Removed from wishlist",
  inline: "Wishlist",
  inlinePressed: "Wishlisted",
}

const PARTICLES = 8

const HeartIcon = () => (
  <svg
    className={cx(
      "kg-wishlist-button__heart size-full overflow-visible fill-transparent stroke-current",
      "transition-[fill,stroke,scale] duration-(--kg-duration-base) ease-kg-out group-hover/wish:scale-[1.08]",
      "group-data-[state=on]/wish:fill-kg-danger group-data-[state=on]/wish:stroke-kg-danger",
      "in-data-pop:animate-[kg-wishlist-beat_var(--kg-duration-slower)_var(--kg-ease-out)]",
    )}
    viewBox="0 0 24 24"
    strokeWidth="1.8"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 20.3s-7.8-4.6-9.3-9.6C1.6 7.2 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.6 3.2 4.5 6.7-1.5 5-9.3 9.6-9.3 9.6Z" />
  </svg>
)

/* Paper Layers: a floating sheet with an ink edge and offset, or an inline outlined control. */
const wishlistVariants = variants({
  base: [
    "kg-wishlist-button group/wish relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-[inherit] leading-none font-[550] text-kg-fg select-none",
    "transition-[background-color,border-color,color,translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out [-webkit-tap-highlight-color:transparent]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  variants: {
    variant: {
      floating: [
        "size-(--_size) rounded-full border-2 border-kg-ink bg-kg-surface p-0 shadow-kg-xs",
        "interactive:hover:-translate-px interactive:hover:shadow-kg-sm interactive:active:translate-x-[2px] interactive:active:translate-y-[2px] interactive:active:shadow-none",
        "before:absolute before:inset-[min(0px,calc((var(--_size)-2.5rem)/2))] before:rounded-[inherit] before:content-['']",
      ],
      inline: "h-(--_size) rounded-kg-md border-2 border-kg-ink bg-transparent px-3 interactive:hover:bg-kg-paper-rose",
    },
    size: {
      sm: "text-kg-sm [--_icon:1rem] [--_size:var(--kg-control-sm)]",
      md: "text-kg-base [--_icon:1.25rem] [--_size:var(--kg-control-md)]",
      lg: "text-kg-md [--_icon:1.5rem] [--_size:var(--kg-control-lg)]",
    },
  },
  defaults: { variant: "floating", size: "md" },
})

/** A heart toggle whose activation pops with a CSS-only ring and particle burst. */
export const WishlistButton = forwardRef<HTMLButtonElement, WishlistButtonProps>(
  (
    {
      pressed: pressedProp,
      defaultPressed = false,
      onPressedChange,
      variant = "floating",
      size = "md",
      labels,
      className,
      type,
      onClick,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const [pressed, setPressed] = useControllableState({
      value: pressedProp,
      defaultValue: defaultPressed,
      onChange: onPressedChange,
    })
    // Counts user activations so the burst replays every time but never on first render.
    const [bursts, setBursts] = useState(0)
    const [announcement, setAnnouncement] = useState("")

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (event.defaultPrevented) return
      const next = !pressed
      setPressed(next)
      setAnnouncement(next ? text.added : text.removed)
      if (next) setBursts((count) => count + 1)
    }

    const burst = pressed && bursts > 0

    return (
      <>
        <button
          ref={ref}
          type={type ?? "button"}
          className={wishlistVariants({ variant, size, className })}
          data-variant={variant}
          data-size={size}
          data-state={pressed ? "on" : "off"}
          aria-pressed={pressed}
          aria-label={text.label}
          onClick={handleClick}
          {...props}
        >
          <span
            className="kg-wishlist-button__icon relative inline-grid size-(--_icon) place-items-center"
            key={burst ? bursts : 0}
            data-pop={burst || undefined}
          >
            <HeartIcon />
            {burst && (
              <span
                className={cx(
                  "kg-wishlist-button__burst pointer-events-none absolute inset-0 motion-reduce:hidden",
                  "before:absolute before:-inset-[45%] before:rounded-full before:border-2 before:border-kg-ink before:opacity-0 before:content-['']",
                  "before:animate-[kg-wishlist-ring_var(--kg-duration-slower)_var(--kg-ease-out)]",
                )}
                aria-hidden="true"
              >
                {Array.from({ length: PARTICLES }, (_, index) => (
                  <i
                    key={index}
                    className={cx(
                      "absolute top-1/2 left-1/2 rounded-full text-(length:--_icon) opacity-0",
                      "animate-[kg-wishlist-particle_var(--kg-duration-slower)_var(--kg-ease-out)]",
                      index % 2 ? "-m-[0.08em] size-[0.16em] bg-kg-ink" : "-m-[0.11em] size-[0.22em] bg-kg-danger",
                    )}
                    style={{ "--_angle": `${index * 45}deg` } as CSSProperties}
                  />
                ))}
              </span>
            )}
          </span>
          {variant === "inline" && (
            <span className="kg-wishlist-button__text" aria-hidden="true">
              {pressed ? text.inlinePressed : text.inline}
            </span>
          )}
        </button>
        <span className="kg-visually-hidden" role="status">
          {announcement}
        </span>
      </>
    )
  },
)

WishlistButton.displayName = "WishlistButton"
