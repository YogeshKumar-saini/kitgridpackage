import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  version,
} from "react"
import { Slot } from "../../primitives/slot.js"
import { cx } from "../../utils/cx.js"

export type SkeletonShape = "text" | "rect" | "circle"
export type SkeletonAnimation = "shimmer" | "pulse" | "none"

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  shape?: SkeletonShape
  /** Number → px. Any CSS length otherwise. */
  width?: number | string
  height?: number | string
  /** Renders a paragraph of text lines with a shorter, ragged last line. */
  lines?: number
  animation?: SkeletonAnimation
  /**
   * With children: while true the child keeps its layout but renders as a placeholder; when
   * false the child renders untouched.
   */
  loading?: boolean
}

export interface SkeletonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Sets aria-busy and announces `label` once for every placeholder inside. */
  loading?: boolean
  label?: string
}

/*
 * Paper Layers: a placeholder is a flat muted sheet. Shimmer slides a lighter solid band across
 * it; reduced motion leaves it still, since the shimmer is decoration.
 */
const base =
  "kg-skeleton pointer-events-none select-none [--_base:color-mix(in_oklab,var(--kg-muted),var(--kg-border)_55%)]"

const still = "motion-reduce:animate-none [[data-kg-motion=reduce]_&]:animate-none"

const ANIMATION: Record<SkeletonAnimation, string> = {
  shimmer: [
    "relative overflow-hidden after:absolute after:inset-y-0 after:start-0 after:w-2/5 after:-skew-x-12",
    "after:bg-[color-mix(in_oklab,var(--kg-surface)_45%,transparent)] after:animate-[kg-skeleton-sweep_1.6s_var(--kg-ease-in-out)_infinite]",
    "motion-reduce:after:hidden [[data-kg-motion=reduce]_&]:after:hidden",
  ].join(" "),
  pulse: `animate-[kg-pulse_1.8s_var(--kg-ease-in-out)_infinite] ${still}`,
  none: "",
}

const SHAPE: Record<SkeletonShape, string> = {
  text: "h-[0.8em] w-full rounded-kg-xs",
  rect: "h-[4rem] w-full rounded-kg-md",
  circle: "size-[2.5rem] rounded-full",
}

/* Wrapping mode paints the child itself, so `!` beats the child's own component styles. */
const WRAPS_RADIUS: Record<SkeletonShape | "none", string> = {
  none: "rounded-kg-sm!",
  text: "rounded-kg-xs!",
  rect: "",
  circle: "rounded-full!",
}

const wraps = [
  "border-transparent! bg-(--_base)! bg-none! text-transparent! shadow-none! outline-none!",
  "*:invisible [&>*]:before:invisible [&>*]:after:invisible",
].join(" ")

const toLength = (value: number | string | undefined) =>
  typeof value === "number" ? `${value}px` : value

// React 18 only renders `inert` as a string attribute; React 19 expects a boolean.
const inertProps = (
  Number.parseInt(version, 10) >= 19 ? { inert: true } : { inert: "" }
) as HTMLAttributes<HTMLElement>

/**
 * A placeholder for content that is still loading. Purely visual and hidden from assistive
 * technology: wrap a set of them in `SkeletonGroup` to announce the loading state once.
 */
export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(
  (
    {
      shape,
      width,
      height,
      lines,
      animation = "shimmer",
      loading = true,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    if (children != null) {
      if (!loading) return <>{children}</>
      const only = Children.count(children) === 1 && isValidElement(children)
      const Root = only ? Slot : "span"
      return (
        <Root
          ref={ref}
          className={cx(
            base,
            wraps,
            WRAPS_RADIUS[shape ?? "none"],
            animation !== "none" && `animate-[kg-pulse_1.8s_var(--kg-ease-in-out)_infinite] ${still}`,
            className,
          )}
          data-shape={shape}
          data-animation={animation}
          data-wraps=""
          aria-hidden="true"
          {...inertProps}
          style={{ width: toLength(width), height: toLength(height), ...style }}
          {...props}
        >
          {children}
        </Root>
      )
    }

    const resolved = shape ?? "text"
    const size =
      resolved === "circle"
        ? { width: toLength(width ?? height), height: toLength(height ?? width) }
        : { width: toLength(width), height: toLength(height) }

    if (resolved === "text" && lines !== undefined && lines > 1) {
      return (
        <span
          ref={ref}
          className={cx("kg-skeleton-lines grid w-full gap-[0.65em]", className)}
          aria-hidden="true"
          style={{ width: size.width, ...style }}
          {...props}
        >
          {Array.from({ length: lines }, (_, index) => (
            <span
              key={index}
              className={cx(
                base,
                "block shrink-0 bg-(--_base)",
                index === lines - 1 ? "h-[0.8em] w-[62%] rounded-kg-xs" : SHAPE.text,
                ANIMATION[animation],
              )}
              data-shape="text"
              data-animation={animation}
              data-last={index === lines - 1 || undefined}
              style={size.height ? { height: size.height } : undefined}
            />
          ))}
        </span>
      )
    }

    return (
      <span
        ref={ref}
        className={cx(
          base,
          "block shrink-0 bg-(--_base)",
          SHAPE[resolved],
          ANIMATION[animation],
          className,
        )}
        data-shape={resolved}
        data-animation={animation}
        aria-hidden="true"
        style={{ ...size, ...style } as CSSProperties}
        {...props}
      />
    )
  },
)

Skeleton.displayName = "Skeleton"

/** The busy container for a loading region: one announcement instead of one per placeholder. */
export const SkeletonGroup = forwardRef<HTMLDivElement, SkeletonGroupProps>(
  ({ loading = true, label = "Loading", className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cx("kg-skeleton-group", className)}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="kg-visually-hidden">{label}</span>}
      {children}
    </div>
  ),
)

SkeletonGroup.displayName = "SkeletonGroup"
