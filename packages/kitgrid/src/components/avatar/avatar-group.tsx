import {
  Children,
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
} from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"
import {
  type AvatarProps,
  type AvatarShape,
  type AvatarSize,
  avatarFallback,
  avatarFrame,
  avatarVariants,
} from "./avatar.js"

const groupVariants = variants({
  base: [
    "kg-avatar-group isolate inline-flex items-center",
    "*:rounded-(--_radius) *:shadow-[0_0_0_2px_var(--_ring)]",
    "*:transition-[translate] *:duration-(--kg-duration-fast) *:ease-kg-out",
    "*:hover:z-1 *:hover:-translate-y-0.5 motion-reduce:*:hover:translate-y-0",
  ],
  variants: {
    overlap: {
      none: "gap-1.5",
      sm: "*:not-first:-ms-[calc(var(--_size)*0.16)]",
      md: "*:not-first:-ms-[calc(var(--_size)*0.28)]",
      lg: "*:not-first:-ms-[calc(var(--_size)*0.4)]",
    },
  },
})

export type AvatarGroupOverlap = NonNullable<VariantProps<typeof groupVariants>["overlap"]>

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** How many avatars to show before collapsing the rest into a “+N” chip. */
  max?: number
  size?: AvatarSize
  shape?: AvatarShape
  overlap?: AvatarGroupOverlap
  /** Accessible name for the “+N” chip. */
  overflowLabel?: (hidden: number) => string
}

const defaultOverflowLabel = (hidden: number) => `${hidden} more`

/** Stacks avatars with a surface-colored ring between them. Server-safe. */
export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    {
      max,
      size = "md",
      shape = "circle",
      overlap = "md",
      overflowLabel = defaultOverflowLabel,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const items = Children.toArray(children).filter(
      (child): child is ReactElement<AvatarProps> => isValidElement(child),
    )
    const limit =
      max !== undefined && max >= 0 && max < items.length ? max : items.length
    const hidden = items.length - limit

    return (
      <div
        ref={ref}
        role="group"
        className={groupVariants({ overlap, className })}
        data-overlap={overlap}
        {...props}
      >
        {items.slice(0, limit).map((child) =>
          cloneElement(child, {
            size: child.props.size ?? size,
            shape: child.props.shape ?? shape,
          }),
        )}
        {hidden > 0 && (
          <span
            className={avatarVariants({
              size,
              shape,
              className: "kg-avatar-group__overflow",
            })}
            data-size={size}
            data-shape={shape}
            role="img"
            aria-label={overflowLabel(hidden)}
          >
            <span className={cx(avatarFrame, "bg-kg-surface-sunken text-kg-fg")}>
              <span
                className={cx(
                  avatarFallback,
                  "text-[length:calc(var(--_text)*0.92)] tabular-nums",
                )}
                aria-hidden="true"
              >
                +{hidden}
              </span>
            </span>
          </span>
        )}
      </div>
    )
  },
)

AvatarGroup.displayName = "AvatarGroup"
