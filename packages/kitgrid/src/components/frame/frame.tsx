import { forwardRef, type HTMLAttributes } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

const frameVariants = variants({
  base: [
    "kg-frame relative block w-full overflow-hidden bg-kg-surface-sunken",
    "[&>:is(img,video,picture,canvas,svg,iframe)]:block [&>:is(img,video,picture,canvas,svg,iframe)]:size-full [&>:is(img,video,picture,canvas,svg,iframe)]:border-0",
    "[&>:is(img,video,picture,canvas,svg,iframe)]:object-[var(--_position,center)]",
    "[&>picture>img]:size-full [&>picture>img]:[object-fit:inherit] [&>picture>img]:[object-position:inherit]",
    "[&>img:is(:not([src]),[src=''])]:invisible",
    "[&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:bg-kg-muted",
    "[&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:before:pointer-events-none [&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:before:absolute",
    "[&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:before:start-1/2 [&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:before:top-[46%]",
    "[&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:before:aspect-square [&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:before:w-[min(28%,5.5rem)]",
    "[&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:before:-translate-x-1/2 [&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:before:-translate-y-1/2 [&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:before:rounded-full",
    "[&:is(:empty,:has(>img:is(:not([src]),[src=''])))]:before:bg-kg-border",
  ],
  variants: {
    fit: {
      cover: "[&>:is(img,video,picture,canvas,svg,iframe)]:object-cover",
      contain:
        "[&>:is(canvas,svg,iframe)]:object-cover [&>:is(img,video,picture)]:object-contain",
    },
    radius: {
      none: "rounded-none",
      sm: "rounded-kg-sm",
      md: "rounded-kg-md",
      lg: "rounded-kg-lg",
      xl: "rounded-kg-xl",
      full: "rounded-full",
    },
    // Drawn over the media, so the ink edge stays visible on images of any brightness.
    edge: {
      true: "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_2px_var(--kg-ink)]",
      false: "",
    },
  },
  defaults: { fit: "cover", radius: "lg", edge: true },
})

type FrameVariantProps = VariantProps<typeof frameVariants>
export type FrameFit = NonNullable<FrameVariantProps["fit"]>
export type FrameRadius = NonNullable<FrameVariantProps["radius"]>

export interface FrameProps extends HTMLAttributes<HTMLDivElement> {
  /** Width over height. */
  ratio?: number
  /** How the image or video meets the frame. `contain` letterboxes on the sunken surface. */
  fit?: FrameFit
  /** Object position, such as `"top"` or `"30% 70%"`, to keep the subject in shot. */
  position?: string
  radius?: FrameRadius
  /** An inner ink edge that keeps light images from bleeding into light pages. */
  edge?: boolean
}

/** A media frame: crops any image or video to a ratio, with a radius and an inner ink edge. */
export const Frame = forwardRef<HTMLDivElement, FrameProps>(
  (
    {
      ratio = 4 / 3,
      fit = "cover",
      position,
      radius = "lg",
      edge = true,
      className,
      style,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={frameVariants({ fit, radius, edge, className })}
      data-fit={fit}
      data-radius={radius}
      data-edge={edge || undefined}
      style={{
        aspectRatio: String(ratio > 0 ? ratio : 1),
        ...(position ? { "--_position": position } : {}),
        ...style,
      }}
      {...props}
    />
  ),
)

Frame.displayName = "Frame"
