"use client"

import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { XIcon } from "../combobox/internal.js"

export type FileDropzoneStatus = "uploading" | "done" | "error"

export interface FileDropzoneItem {
  id: string
  name: string
  /** Bytes. */
  size: number
  type?: string
  /** 0 to 100 while uploading. */
  progress?: number
  status?: FileDropzoneStatus
  error?: string
  previewUrl?: string
}

export type FileDropzoneRejectReason = "type" | "size" | "count"

export interface FileDropzoneRejection {
  file: File
  reason: FileDropzoneRejectReason
}

export interface FileDropzoneLabels {
  title: ReactNode
  /** Short constraint line, e.g. "PNG or JPG, up to 5 MB". */
  hint?: ReactNode
  dropping: ReactNode
  remove: (name: string) => string
  rejected: (reason: FileDropzoneRejectReason) => string
}

export interface FileDropzoneProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onDrop" | "children"> {
  /** Same syntax as the input's `accept`: `image/*,.pdf`. */
  accept?: string
  multiple?: boolean
  /** Bytes. */
  maxSize?: number
  maxFiles?: number
  onFilesAccepted?: (files: File[]) => void
  onFilesRejected?: (rejections: FileDropzoneRejection[]) => void
  /** Rows to show. Pass them to drive progress yourself; leave unset to list accepted files. */
  items?: readonly FileDropzoneItem[]
  onRemove?: (id: string) => void
  labels?: Partial<FileDropzoneLabels>
  disabled?: boolean
  name?: string
  /** Extra content inside the drop target, below the title. */
  children?: ReactNode
}

const defaultLabels: FileDropzoneLabels = {
  title: "Drop files or browse",
  dropping: "Release to add",
  remove: (name) => `Remove ${name}`,
  rejected: (reason) =>
    reason === "type" ? "File type not allowed" : reason === "size" ? "File too large" : "Too many files",
}

const units = ["B", "KB", "MB", "GB"]
export const formatBytes = (bytes: number): string => {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export const matchesAccept = (file: { name: string; type: string }, accept?: string): boolean => {
  if (!accept) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) =>
      rule.startsWith(".")
        ? name.endsWith(rule)
        : rule.endsWith("/*")
          ? type.startsWith(rule.slice(0, -1))
          : type === rule,
    )
}

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <path d="M12 15V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
  </svg>
)

const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" strokeLinejoin="round" />
    <path d="M14 3v5h5" strokeLinejoin="round" />
  </svg>
)

let counter = 0

const errorText = "text-[color-mix(in_oklab,var(--kg-danger),var(--kg-fg)_30%)]"
const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"

/**
 * A drop target with a real button for browsing, type and size checks, image previews and a
 * progress row per file. Drive `items` to show upload progress from your own uploader.
 */
export const FileDropzone = forwardRef<HTMLDivElement, FileDropzoneProps>(
  (
    {
      accept,
      multiple = true,
      maxSize,
      maxFiles,
      onFilesAccepted,
      onFilesRejected,
      items: itemsProp,
      onRemove,
      labels: labelsProp,
      disabled = false,
      name,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const labels = { ...defaultLabels, ...labelsProp }
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState<"accept" | "reject" | null>(null)
    const [own, setOwn] = useState<FileDropzoneItem[]>([])
    const [notice, setNotice] = useState("")
    const depth = useRef(0)
    const urls = useRef(new Set<string>())
    const hintId = useId()
    const items = itemsProp ?? own

    useEffect(
      () => () => {
        for (const url of urls.current) URL.revokeObjectURL(url)
      },
      [],
    )

    const take = (list: FileList | null) => {
      if (!list || disabled) return
      const accepted: File[] = []
      const rejected: FileDropzoneRejection[] = []
      const room = maxFiles === undefined ? Number.POSITIVE_INFINITY : maxFiles - items.length
      for (const file of Array.from(list)) {
        if (!matchesAccept(file, accept)) rejected.push({ file, reason: "type" })
        else if (maxSize !== undefined && file.size > maxSize) rejected.push({ file, reason: "size" })
        else if (accepted.length >= room || (!multiple && accepted.length >= 1))
          rejected.push({ file, reason: "count" })
        else accepted.push(file)
      }
      if (accepted.length) {
        onFilesAccepted?.(accepted)
        if (itemsProp === undefined) {
          const rows = accepted.map((file) => {
            const previewUrl =
              file.type.startsWith("image/") && typeof URL.createObjectURL === "function"
                ? URL.createObjectURL(file)
                : undefined
            if (previewUrl) urls.current.add(previewUrl)
            return {
              id: `file-${++counter}`,
              name: file.name,
              size: file.size,
              type: file.type,
              status: "done" as const,
              previewUrl,
            }
          })
          setOwn((prev) => (multiple ? [...prev, ...rows] : rows))
        }
      }
      if (rejected.length) onFilesRejected?.(rejected)
      const first = rejected[0]
      setNotice(first ? `${first.file.name}: ${labels.rejected(first.reason)}` : "")
    }

    const remove = (item: FileDropzoneItem) => {
      onRemove?.(item.id)
      if (itemsProp !== undefined) return
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
        urls.current.delete(item.previewUrl)
      }
      setOwn((prev) => prev.filter((row) => row.id !== item.id))
    }

    const dragProps = {
      onDragEnter: (event: ReactDragEvent<HTMLDivElement>) => {
        if (disabled || !event.dataTransfer.types.includes("Files")) return
        event.preventDefault()
        depth.current++
        const types = Array.from(event.dataTransfer.items ?? []).map((item) => item.type)
        const ok = types.length === 0 || types.every((type) => matchesAccept({ name: "", type }, accept) || !type)
        setDragging(ok || !accept ? "accept" : "reject")
      },
      onDragOver: (event: ReactDragEvent<HTMLDivElement>) => {
        if (disabled) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
      },
      // Child elements fire their own enter and leave, so count depth instead of trusting one.
      onDragLeave: () => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setDragging(null)
      },
      onDrop: (event: ReactDragEvent<HTMLDivElement>) => {
        event.preventDefault()
        depth.current = 0
        setDragging(null)
        take(event.dataTransfer.files)
      },
    }

    return (
      <div
        ref={ref}
        className={cx("kg-file-dropzone grid gap-2 w-full data-disabled:opacity-50", className)}
        data-disabled={disabled || undefined}
        {...props}
      >
        <div
          className={cx(
            "kg-file-dropzone__target relative grid justify-items-center gap-1.5 px-5 py-8 text-center",
            "bg-kg-surface border-2 border-dashed border-kg-ink rounded-kg-xl",
            "transition-[background-color,border-color,box-shadow] duration-(--kg-duration-base) ease-kg-out",
            "has-[>button:enabled:hover]:shadow-kg-sm",
            "data-[dragging=accept]:border-solid data-[dragging=accept]:bg-kg-paper-sage data-[dragging=accept]:shadow-kg-md",
            "data-[dragging=reject]:border-solid data-[dragging=reject]:border-kg-danger data-[dragging=reject]:bg-kg-paper-rose",
            "data-[dragging=reject]:shadow-[5px_5px_0_var(--kg-danger)]",
          )}
          data-dragging={dragging ?? undefined}
          {...dragProps}
        >
          <span
            className={cx(
              "kg-file-dropzone__orbit grid place-items-center size-11 mb-1 [&_svg]:size-5",
              "text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-full shadow-kg-xs",
              "transition-[translate,rotate] duration-(--kg-duration-base) ease-kg-spring",
              "[[data-dragging=accept]>&]:-translate-y-1 [[data-dragging=accept]>&]:-rotate-8",
            )}
            aria-hidden="true"
          >
            <UploadIcon />
          </span>
          <button
            type="button"
            className={cx(
              "kg-file-dropzone__browse p-0 border-0 bg-transparent rounded-kg-xs cursor-pointer [font-family:inherit]",
              "text-kg-base font-semibold text-kg-fg underline-offset-[0.25em] interactive:hover:underline",
              // The whole target is clickable; the button stays the single focus stop.
              "after:absolute after:inset-0 after:rounded-kg-xl",
              "focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-kg-ring",
              "disabled:cursor-not-allowed",
            )}
            disabled={disabled}
            aria-describedby={labels.hint ? hintId : undefined}
            onClick={() => inputRef.current?.click()}
          >
            {dragging ? labels.dropping : labels.title}
          </button>
          {labels.hint && (
            <span id={hintId} className="kg-file-dropzone__hint text-kg-sm text-kg-fg-muted">
              {labels.hint}
            </span>
          )}
          {children}
          <input
            ref={inputRef}
            type="file"
            tabIndex={-1}
            hidden
            name={name}
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={(event) => {
              take(event.target.files)
              event.target.value = ""
            }}
          />
        </div>
        <p className={cx("kg-file-dropzone__notice m-0 text-kg-xs empty:hidden", errorText)} role="status">
          {notice}
        </p>
        {items.length > 0 && (
          <ul className="kg-file-dropzone__list grid gap-2 m-0 p-0 list-none">
            {items.map((item) => (
              <li
                key={item.id}
                className={cx(
                  "kg-file-dropzone__item flex items-center gap-3 p-2.5",
                  "bg-kg-surface border-2 border-kg-ink rounded-kg-lg shadow-kg-xs",
                  "animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
                  "data-[status=error]:border-kg-danger data-[status=error]:shadow-[2px_2px_0_var(--kg-danger)]",
                )}
                data-status={item.status ?? (item.progress !== undefined ? "uploading" : "done")}
              >
                <span
                  className={cx(
                    "kg-file-dropzone__thumb grid place-items-center shrink-0 size-10 overflow-hidden",
                    "text-kg-fg-muted bg-kg-muted rounded-kg-md",
                    "[&_img]:size-full [&_img]:object-cover [&_svg]:size-[1.125rem]",
                  )}
                  aria-hidden="true"
                >
                  {item.previewUrl ? <img src={item.previewUrl} alt="" /> : <FileIcon />}
                </span>
                <span className="kg-file-dropzone__meta grid gap-[0.2rem] flex-1 min-w-0">
                  <span className="kg-file-dropzone__name truncate text-kg-sm font-[550]">{item.name}</span>
                  <span
                    className={cx(
                      "kg-file-dropzone__detail text-kg-xs tabular-nums text-kg-fg-muted",
                      "[[data-status=error]_&]:text-[color-mix(in_oklab,var(--kg-danger),var(--kg-fg)_30%)]",
                    )}
                  >
                    {item.status === "error" && item.error ? item.error : formatBytes(item.size)}
                    {item.status === "uploading" && item.progress !== undefined && (
                      <span className="kg-file-dropzone__percent">{` ${Math.round(item.progress)}%`}</span>
                    )}
                  </span>
                  {item.status === "uploading" && (
                    <span
                      role="progressbar"
                      aria-label={`${item.name} upload`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={item.progress === undefined ? undefined : Math.round(item.progress)}
                      className={cx(
                        "kg-file-dropzone__progress relative block h-1.5 mt-0.5 overflow-hidden bg-kg-muted rounded-full",
                        "after:absolute after:inset-0 after:rounded-[inherit] after:bg-kg-accent",
                        "after:origin-left rtl:after:origin-right after:scale-x-(--_progress)",
                        "after:transition-[scale] after:duration-(--kg-duration-base) after:ease-kg-out",
                      )}
                      style={{ "--_progress": (item.progress ?? 0) / 100 } as CSSProperties}
                    />
                  )}
                </span>
                <button
                  type="button"
                  className={cx(
                    "kg-file-dropzone__remove inline-grid place-items-center shrink-0 size-7 p-0 [&_svg]:size-3.5",
                    "text-kg-fg-muted bg-transparent border-0 rounded-full cursor-pointer",
                    "transition-[background-color,color] duration-(--kg-duration-fast) ease-kg-out",
                    "interactive:hover:text-kg-fg interactive:hover:bg-kg-muted",
                    focusRing,
                  )}
                  aria-label={labels.remove(item.name)}
                  onClick={() => remove(item)}
                >
                  <XIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
)

FileDropzone.displayName = "FileDropzone"
