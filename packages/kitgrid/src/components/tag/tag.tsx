import { forwardRef, type HTMLAttributes, type MouseEvent, type ReactNode } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: a tag is a round paper chip with ink text. --_height and --_pad stay on the
 * root because a nested Avatar sizes itself from them. Removal is a transition, so
 * getAnimations() can wait for it.
 */
const tagVariants = variants({
  base: [
    "kg-tag inline-flex h-(--_height) max-w-full items-center rounded-full border-2 px-(--_pad) align-middle",
    "font-semibold leading-none whitespace-nowrap text-kg-fg text-(length:--_text)",
    "transition-[opacity,scale] duration-(--kg-duration-base) ease-[var(--kg-ease-in)]",
    "data-[state=closed]:pointer-events-none data-[state=closed]:scale-[0.85] data-[state=closed]:opacity-0",
  ],
  variants: {
    tone: {
      neutral: "[--_paper:var(--kg-muted)]",
      accent: "[--_paper:var(--kg-paper-sage)]",
      success: "[--_paper:var(--kg-paper-sage)]",
      warning: "[--_paper:var(--kg-paper-butter)]",
      danger: "[--_paper:var(--kg-paper-rose)]",
      info: "[--_paper:var(--kg-paper-sky)]",
    },
    variant: {
      soft: "border-transparent bg-(--_paper)",
      outline: "border-kg-ink bg-kg-surface shadow-kg-xs",
    },
    size: {
      sm: "gap-1 [--_height:1.375rem] [--_pad:0.5rem] [--_text:var(--kg-text-xs)]",
      md: "gap-1.5 [--_height:1.75rem] [--_pad:0.625rem] [--_text:var(--kg-text-sm)]",
      lg: "gap-1.5 [--_height:2rem] [--_pad:0.75rem] [--_text:var(--kg-text-base)]",
    },
    removable: {
      true: "pe-[calc(var(--_pad)*0.4)]",
      false: "",
    },
  },
  defaults: { tone: "neutral", variant: "soft", size: "md", removable: false },
})

type TagVariantProps = VariantProps<typeof tagVariants>
export type TagTone = NonNullable<TagVariantProps["tone"]>
export type TagVariant = NonNullable<TagVariantProps["variant"]>
export type TagSize = NonNullable<TagVariantProps["size"]>

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone
  variant?: TagVariant
  size?: TagSize
  /** Decorative leading icon. */
  icon?: ReactNode
  /** A small leading image or `<Avatar>`, cropped to a circle. */
  avatar?: ReactNode
  /** Adds a remove button. Unmount the tag in this callback. */
  onRemove?: () => void
  /** Defaults to “Remove <children>” when children is plain text. */
  removeLabel?: string
  /** Fade and shrink before calling onRemove. Instant under reduced motion. */
  animateExit?: boolean
}

const removeTag = (
  event: MouseEvent<HTMLButtonElement>,
  onRemove: () => void,
  animate: boolean,
) => {
  const node = event.currentTarget.closest<HTMLElement>(".kg-tag")
  if (node?.dataset.state === "closed") return
  const finish = () => {
    onRemove()
    // If the parent kept the tag (e.g. the removal was rejected), bring it back.
    requestAnimationFrame(() => {
      if (node?.isConnected) delete node.dataset.state
    })
  }
  if (!node || !animate || typeof node.getAnimations !== "function") return finish()
  node.dataset.state = "closed"
  const running = node.getAnimations()
  if (running.length === 0) return finish()
  void Promise.allSettled(running.map((animation) => animation.finished)).then(finish)
}

/**
 * A chip for selected filters, keywords and recipients. Server-safe: the remove button only
 * exists when an `onRemove` handler is passed, which already implies a client tree.
 */
export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  (
    {
      tone = "neutral",
      variant = "soft",
      size = "md",
      icon,
      avatar,
      onRemove,
      removeLabel,
      animateExit = true,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const text =
      typeof children === "string" || typeof children === "number" ? children : null
    const label = removeLabel ?? (text !== null ? `Remove ${text}` : "Remove")

    return (
      <span
        ref={ref}
        className={tagVariants({ tone, variant, size, removable: Boolean(onRemove), className })}
        data-tone={tone}
        data-variant={variant}
        data-size={size}
        data-removable={onRemove ? "" : undefined}
        {...props}
      >
        {avatar != null && (
          <span
            className="kg-tag__avatar -ms-[calc(var(--_pad)*0.55)] inline-flex shrink-0 [--kg-avatar-size:calc(var(--_height)-0.5rem)] [--kg-avatar-text:0.5625rem] [&>img]:size-[calc(var(--_height)-0.5rem)] [&>img]:rounded-full [&>img]:object-cover"
            aria-hidden="true"
          >
            {avatar}
          </span>
        )}
        {icon != null && (
          <span className="kg-tag__icon inline-flex shrink-0 [&_svg]:size-[1.1em]" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="kg-tag__label min-w-0 overflow-hidden text-ellipsis">{children}</span>
        {onRemove && (
          <button
            type="button"
            className={[
              "kg-tag__remove relative inline-grid size-[calc(var(--_height)-0.625rem)] shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-inherit",
              "before:absolute before:-inset-[0.3125rem] transition-colors duration-(--kg-duration-fast) ease-kg-out [&_svg]:size-3",
              "hover:bg-[color-mix(in_oklab,currentColor_14%,transparent)]",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
            ].join(" ")}
            aria-label={label}
            onClick={(event) => removeTag(event, onRemove, animateExit)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M17 7 7 17M7 7l10 10" />
            </svg>
          </button>
        )}
      </span>
    )
  },
)

Tag.displayName = "Tag"
