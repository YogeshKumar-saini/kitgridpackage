"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type AvatarUploadSize = "sm" | "md" | "lg"

const avatarUploadVariants = variants({
  base: "kg-avatar-upload inline-flex items-center gap-4 [--_badge:calc(var(--_size)*0.34)]",
  variants: {
    size: {
      sm: "[--_size:3.5rem]",
      md: "[--_size:5rem]",
      lg: "[--_size:7rem]",
    },
  },
  defaults: { size: "md" },
})

export interface AvatarUploadLabels {
  change: string
  remove: string
}

export interface AvatarUploadProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Current image URL, e.g. the saved avatar. */
  src?: string | null
  /** Called with the chosen file, or `null` once removed. */
  onFileChange?: (file: File | null) => void
  /** Shown while there is no image, e.g. initials. */
  fallback?: ReactNode
  accept?: string
  size?: AvatarUploadSize
  disabled?: boolean
  labels?: Partial<AvatarUploadLabels>
  name?: string
}

const defaultLabels: AvatarUploadLabels = { change: "Change photo", remove: "Remove photo" }

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path
      d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.3-2h6l1.3 2h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12.5" r="3.25" />
  </svg>
)

const Placeholder = () => (
  <svg className="kg-avatar-upload__placeholder size-full fill-kg-fg-faint opacity-35" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="25" r="11" />
    <path d="M12 58c2-11 10-17 20-17s18 6 20 17Z" />
  </svg>
)

/** A round photo with a change button over it and a remove button beside it. */
export const AvatarUpload = forwardRef<HTMLDivElement, AvatarUploadProps>(
  (
    {
      src = null,
      onFileChange,
      fallback,
      accept = "image/*",
      size = "md",
      disabled,
      labels: labelsProp,
      name,
      className,
      ...props
    },
    ref,
  ) => {
    const labels = { ...defaultLabels, ...labelsProp }
    const inputRef = useRef<HTMLInputElement>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [removed, setRemoved] = useState(false)

    useEffect(
      () => () => {
        if (preview) URL.revokeObjectURL(preview)
      },
      [preview],
    )

    const shown = preview ?? (removed ? null : src)

    return (
      <div
        ref={ref}
        className={avatarUploadVariants({ size, className })}
        data-size={size}
        data-empty={shown ? undefined : ""}
        {...props}
      >
        <button
          type="button"
          className={cx(
            "kg-avatar-upload__button group relative shrink-0 size-(--_size) p-0 rounded-full cursor-pointer",
            "border-0 bg-transparent shadow-kg-sm",
            "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
            "interactive:hover:-translate-px interactive:hover:shadow-kg-md",
            "interactive:active:translate-x-[3px] interactive:active:translate-y-[3px] interactive:active:shadow-none",
            "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kg-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
          )}
          aria-label={labels.change}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <span
            className={cx(
              "kg-avatar-upload__image relative grid place-items-center size-full overflow-hidden rounded-[inherit]",
              "border-2 border-kg-ink bg-kg-muted text-kg-fg-muted font-[650] text-[length:var(--_badge)]",
              "[&_img]:size-full [&_img]:object-cover [&_img]:animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
            )}
          >
            {shown ? (
              <img src={shown} alt="" />
            ) : fallback != null && fallback !== false ? (
              <span aria-hidden="true">{fallback}</span>
            ) : (
              <Placeholder />
            )}
            <span
              className={cx(
                "kg-avatar-upload__overlay absolute inset-0 grid place-items-center [&_svg]:size-[36%]",
                "bg-kg-accent/80 text-kg-accent-fg opacity-0 transition-opacity duration-(--kg-duration-base) ease-kg-out",
                "group-hover:opacity-100 group-focus-visible:opacity-100 group-disabled:hidden",
              )}
              aria-hidden="true"
            >
              <CameraIcon />
            </span>
          </span>
          <span
            className={cx(
              "kg-avatar-upload__badge absolute right-0 bottom-0 grid place-items-center size-(--_badge) min-w-6 min-h-6",
              "rounded-full border-2 border-kg-surface bg-kg-accent text-kg-accent-fg [&_svg]:size-[55%]",
              "transition-[rotate,scale] duration-(--kg-duration-base) ease-kg-spring",
              "group-enabled:group-hover:-rotate-12 group-enabled:group-hover:scale-108",
            )}
            aria-hidden="true"
          >
            <CameraIcon />
          </span>
        </button>
        {shown && (
          <button
            type="button"
            className={cx(
              "kg-avatar-upload__remove p-0 border-0 bg-transparent rounded-kg-xs cursor-pointer [font-family:inherit]",
              "text-kg-sm font-medium text-kg-fg-muted underline decoration-kg-border-strong underline-offset-3",
              "interactive:hover:text-[color-mix(in_oklab,var(--kg-danger),var(--kg-fg)_30%)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            disabled={disabled}
            onClick={() => {
              setPreview(null)
              setRemoved(true)
              if (inputRef.current) inputRef.current.value = ""
              onFileChange?.(null)
            }}
          >
            {labels.remove}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          tabIndex={-1}
          name={name}
          accept={accept}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setPreview(typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null)
            setRemoved(false)
            onFileChange?.(file)
          }}
        />
      </div>
    )
  },
)

AvatarUpload.displayName = "AvatarUpload"
