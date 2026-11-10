"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"
import { getInitials, hueFromString } from "./avatar-utils.js"

/*
 * Paper Layers: a disc of paper in an ink ring. Initials sit on a category paper picked from the
 * name, so the same person keeps the same colour. A container resizes the avatars it nests by
 * setting --kg-avatar-size and --kg-avatar-text, as --kg-avatar-ring retunes the ring.
 */
export const avatarVariants = variants({
  base: [
    "kg-avatar group/avatar relative inline-flex size-(--_size) shrink-0 align-middle select-none",
    "[--_ring:var(--kg-avatar-ring,var(--kg-surface))]",
  ],
  variants: {
    size: {
      xs: "[--_size:var(--kg-avatar-size,1.5rem)] [--_text:var(--kg-avatar-text,0.625rem)]",
      sm: "[--_size:var(--kg-avatar-size,2rem)] [--_text:var(--kg-avatar-text,var(--kg-text-xs))]",
      md: "[--_size:var(--kg-avatar-size,2.5rem)] [--_text:var(--kg-avatar-text,var(--kg-text-base))]",
      lg: "[--_size:var(--kg-avatar-size,3rem)] [--_text:var(--kg-avatar-text,var(--kg-text-md))]",
      xl: "[--_size:var(--kg-avatar-size,4rem)] [--_text:var(--kg-avatar-text,var(--kg-text-xl))]",
    },
    shape: {
      circle: "[--_radius:var(--kg-radius-full)]",
      square: "[--_radius:calc(var(--_size)*0.26)]",
    },
  },
  defaults: { size: "md", shape: "circle" },
})

export const avatarFrame =
  "kg-avatar__frame relative grid size-full overflow-hidden rounded-(--_radius) border-2 border-kg-ink *:[grid-area:1/1]"

export const avatarFallback = [
  "kg-avatar__fallback grid place-items-center font-semibold leading-none tracking-[0.01em]",
  "transition-opacity duration-(--kg-duration-base) ease-kg-out group-data-[state=loaded]/avatar:opacity-0",
  "[&_svg]:mt-[18%] [&_svg]:size-[62%] [&_svg]:opacity-70",
].join(" ")

const papers = [
  "bg-kg-paper-sage",
  "bg-kg-paper-peach",
  "bg-kg-paper-sky",
  "bg-kg-paper-butter",
  "bg-kg-paper-rose",
]

const statusVariants = variants({
  base: [
    "kg-avatar__status absolute end-0 bottom-0 size-(--_dot) rounded-full bg-(--_tone)",
    "shadow-[0_0_0_2px_var(--_ring)] [--_dot:max(0.5rem,calc(var(--_size)*0.28))]",
    "after:absolute after:rounded-[inherit] after:bg-(--_ring)",
    "group-data-[shape=square]/avatar:-end-[calc(var(--_dot)*0.2)] group-data-[shape=square]/avatar:-bottom-[calc(var(--_dot)*0.2)]",
  ],
  variants: {
    status: {
      online: "[--_tone:var(--kg-success)] after:hidden",
      away: "[--_tone:var(--kg-warning)] after:inset-[-12%_38%_38%_-12%]",
      busy: "[--_tone:var(--kg-danger)] after:inset-[42%_22%]",
      offline: "[--_tone:var(--kg-fg-faint)] after:inset-[24%]",
    },
  },
})

type AvatarVariantProps = VariantProps<typeof avatarVariants>
export type AvatarSize = NonNullable<AvatarVariantProps["size"]>
export type AvatarShape = NonNullable<AvatarVariantProps["shape"]>
export type AvatarStatus = "online" | "away" | "busy" | "offline"
export type AvatarStatusLabels = Partial<Record<AvatarStatus, string>>

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  src?: string
  /** Drives the initials, the fallback hue and the accessible name. */
  name?: string
  /** Overrides the accessible name. Pass `""` for a purely decorative avatar. */
  alt?: string
  size?: AvatarSize
  shape?: AvatarShape
  status?: AvatarStatus
  statusLabels?: AvatarStatusLabels
  /** Replaces the initials, e.g. with an icon. */
  fallback?: ReactNode
  imageProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">
}

const defaultStatusLabels: Record<AvatarStatus, string> = {
  online: "Online",
  away: "Away",
  busy: "Busy",
  offline: "Offline",
}

type LoadResult = { src: string; ok: boolean }

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="9" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0z" />
  </svg>
)

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      src,
      name,
      alt,
      size = "md",
      shape = "circle",
      status,
      statusLabels,
      fallback,
      imageProps,
      className,
      ...props
    },
    ref,
  ) => {
    const image = useRef<HTMLImageElement>(null)
    const [result, setResult] = useState<LoadResult | null>(null)
    // Keyed by src, so a new src starts over without an effect resetting state.
    const state = !src
      ? "error"
      : result?.src !== src
        ? "loading"
        : result.ok
          ? "loaded"
          : "error"

    // An image cached by the browser can finish before hydration attaches onLoad.
    useEffect(() => {
      const node = image.current
      if (src && node?.complete && node.naturalWidth > 0) setResult({ src, ok: true })
    }, [src])

    const label = alt ?? name ?? ""
    const statusText = status ? { ...defaultStatusLabels, ...statusLabels }[status] : ""
    const accessibleName = [label, statusText].filter(Boolean).join(", ")
    const initials = name ? getInitials(name) : ""

    return (
      <span
        ref={ref}
        className={avatarVariants({ size, shape, className })}
        data-size={size}
        data-shape={shape}
        data-state={state}
        data-tinted={name ? "" : undefined}
        role={accessibleName ? "img" : undefined}
        aria-label={accessibleName || undefined}
        aria-hidden={accessibleName ? undefined : true}
        {...props}
      >
        <span
          className={cx(
            avatarFrame,
            name
              ? [papers[hueFromString(name) % papers.length], "text-kg-fg"]
              : "bg-kg-muted text-kg-fg-muted",
          )}
        >
          <span
            className={cx(avatarFallback, "text-[length:var(--_text)]")}
            aria-hidden="true"
          >
            {fallback ?? (initials || <PersonIcon />)}
          </span>
          {src && state !== "error" && (
            <img
              ref={image}
              {...imageProps}
              className={cx(
                "kg-avatar__image size-full object-cover opacity-0 transition-opacity duration-(--kg-duration-base) ease-kg-out group-data-[state=loaded]/avatar:opacity-100",
                imageProps?.className,
              )}
              src={src}
              alt=""
              onLoad={(event) => {
                setResult({ src, ok: true })
                imageProps?.onLoad?.(event)
              }}
              onError={(event) => {
                setResult({ src, ok: false })
                imageProps?.onError?.(event)
              }}
            />
          )}
        </span>
        {status && <span className={statusVariants({ status })} data-status={status} />}
      </span>
    )
  },
)

Avatar.displayName = "Avatar"
