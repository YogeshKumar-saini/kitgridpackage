"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"
import { Dialog, DialogContent, DialogTitle } from "../dialog/dialog.js"
import { IconButton } from "../icon-button/icon-button.js"

const arrowSlot =
  "absolute top-1/2 z-2 -translate-y-1/2 opacity-0 transition-opacity duration-(--kg-duration-base) ease-kg-out group-hover/stage:opacity-100 group-focus-within/stage:opacity-100 [@media(hover:none)]:hidden"

export type ProductGalleryThumbnails = "horizontal" | "vertical" | "none"

export interface ProductGalleryImage {
  src: string
  alt: string
  width?: number
  height?: number
  /** Smaller file for the thumbnail strip. */
  thumbnail?: string
  /** Larger file for the hover zoom and the lightbox. */
  zoomSrc?: string
}

export interface ProductGalleryLabels {
  /** Names the carousel region. */
  region?: string
  previous?: string
  next?: string
  /** Slide names and the live status, e.g. "Image 2 of 6". */
  slide?: (position: number, total: number) => string
  thumbnail?: (position: number, total: number) => string
  open?: (position: number, total: number) => string
  lightbox?: string
  zoomIn?: string
  zoomOut?: string
  close?: string
}

export interface ProductGalleryProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  images: readonly ProductGalleryImage[]
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  /** Width / height of the stage. Defaults to the first image's size, else 4 / 5. */
  ratio?: number | string
  thumbnails?: ProductGalleryThumbnails
  /** Magnify under the pointer on hover (mouse and trackpad only). */
  zoom?: boolean
  zoomScale?: number
  /** Open a fullscreen viewer on click. */
  lightbox?: boolean
  /** Load the first image eagerly with high priority (above-the-fold product pages). */
  priority?: boolean
  labels?: ProductGalleryLabels
}

const defaultLabels: Required<ProductGalleryLabels> = {
  region: "Product images",
  previous: "Previous image",
  next: "Next image",
  slide: (position, total) => `Image ${position} of ${total}`,
  thumbnail: (position, total) => `Show image ${position} of ${total}`,
  open: (position, total) => `Open image ${position} of ${total} in fullscreen`,
  lightbox: "Image viewer",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  close: "Close",
}

const Chevron = ({ flip = false }: { flip?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={flip ? { transform: "scaleX(-1)" } : undefined}
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
)

const KEYS_NEXT = new Set(["ArrowRight", "ArrowDown"])
const KEYS_PREV = new Set(["ArrowLeft", "ArrowUp"])

const isRtl = (node: Element) => getComputedStyle(node).direction === "rtl"

/**
 * Product media: a scroll-snap stage (swipe on touch), arrows, thumbnails, keyboard support,
 * hover zoom on fine pointers and a fullscreen lightbox built on Dialog.
 */
export const ProductGallery = forwardRef<HTMLDivElement, ProductGalleryProps>(
  (
    {
      images,
      index: indexProp,
      defaultIndex = 0,
      onIndexChange,
      ratio,
      thumbnails = "horizontal",
      zoom = true,
      zoomScale = 2.2,
      lightbox = true,
      priority = false,
      labels,
      className,
      style,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const total = images.length
    const [rawIndex, setIndex] = useControllableState({
      value: indexProp,
      defaultValue: defaultIndex,
      onChange: onIndexChange,
    })
    const index = clamp(rawIndex, 0, Math.max(total - 1, 0))
    const reduced = useReducedMotion()
    const track = useRef<HTMLDivElement>(null)
    const zoomPanes = useRef<(HTMLSpanElement | null)[]>([])
    const syncing = useRef<number | null>(null)
    const positioned = useRef(false)
    const [viewerOpen, setViewerOpen] = useState(false)
    const [zoomed, setZoomed] = useState(false)
    const viewerImage = useRef<HTMLImageElement>(null)

    const first = images[0]
    const stageRatio =
      ratio ??
      (first?.width && first.height ? `${first.width} / ${first.height}` : "4 / 5")

    const go = (next: number) => {
      if (total === 0) return
      setIndex(((next % total) + total) % total)
    }

    // Brings the scroller to `index` whenever it changes from outside a swipe.
    useEffect(() => {
      const node = track.current
      if (!node || !node.clientWidth) return
      const current = Math.round(Math.abs(node.scrollLeft) / node.clientWidth)
      const initial = !positioned.current
      positioned.current = true
      if (current === index) return
      syncing.current = index
      node.scrollTo?.({
        left: (isRtl(node) ? -1 : 1) * index * node.clientWidth,
        behavior: reduced || initial ? "auto" : "smooth",
      })
    }, [index, reduced])

    const handleScroll = () => {
      const node = track.current
      if (!node || !node.clientWidth) return
      const current = Math.round(Math.abs(node.scrollLeft) / node.clientWidth)
      if (syncing.current !== null) {
        if (current === syncing.current) syncing.current = null
        return
      }
      if (current !== index) setIndex(current)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement
      if (target.closest("input, textarea, select, [contenteditable]")) return
      const rtl = isRtl(event.currentTarget)
      let next: number | null = null
      if (event.key === "Home") next = 0
      else if (event.key === "End") next = total - 1
      else if (KEYS_NEXT.has(event.key))
        next = index + (rtl && event.key === "ArrowRight" ? -1 : 1)
      else if (KEYS_PREV.has(event.key))
        next = index - (rtl && event.key === "ArrowLeft" ? -1 : 1)
      if (next === null) return
      // Up/Down only drive the vertical thumbnail strip; elsewhere they keep scrolling the page.
      if (
        (event.key === "ArrowUp" || event.key === "ArrowDown") &&
        !(thumbnails === "vertical" && target.closest(".kg-product-gallery__thumbs"))
      ) {
        return
      }
      event.preventDefault()
      const resolved = ((next % total) + total) % total
      go(resolved)
      // Roving focus: keep the keyboard on the same kind of control for the new image.
      const part =
        target.closest<HTMLElement>("[data-gallery-part]")?.dataset.galleryPart
      if (part) {
        event.currentTarget
          .querySelector<HTMLElement>(
            `[data-gallery-part="${part}"][data-index="${resolved}"]`,
          )
          ?.focus({ preventScroll: true })
      }
    }

    const canZoom = (event: PointerEvent) =>
      zoom && event.pointerType === "mouse" && !reduced && !viewerOpen

    const moveZoom = (event: PointerEvent<HTMLElement>) => {
      const pane = zoomPanes.current[index]
      if (!pane || !canZoom(event)) return
      const rect = event.currentTarget.getBoundingClientRect()
      const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)
      const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)
      if (!pane.dataset.active) {
        const image = images[index]
        if (!image) return
        pane.style.backgroundImage = `url("${image.zoomSrc ?? image.src}")`
        pane.dataset.active = ""
      }
      pane.style.backgroundPosition = `${x}% ${y}%`
    }

    const endZoom = () => {
      for (const pane of zoomPanes.current) if (pane) delete pane.dataset.active
    }

    const openViewer = () => {
      endZoom()
      setZoomed(false)
      setViewerOpen(true)
    }

    const toggleViewerZoom = (event: MouseEvent<HTMLButtonElement>) => {
      const img = viewerImage.current
      if (img) {
        const rect = img.getBoundingClientRect()
        const x = rect.width ? ((event.clientX - rect.left) / rect.width) * 100 : 50
        const y = rect.height ? ((event.clientY - rect.top) / rect.height) * 100 : 50
        img.style.transformOrigin = `${clamp(x, 0, 100)}% ${clamp(y, 0, 100)}%`
      }
      setZoomed((value) => !value)
    }

    const panViewer = (event: PointerEvent<HTMLButtonElement>) => {
      const img = viewerImage.current
      if (!zoomed || !img) return
      const rect = event.currentTarget.getBoundingClientRect()
      const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)
      const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)
      img.style.transformOrigin = `${x}% ${y}%`
    }

    const current = images[index]
    const layout = total > 1 ? thumbnails : "none"
    const vertical = layout === "vertical"

    return (
      <div
        ref={ref}
        className={cx(
          "kg-product-gallery grid min-w-0 gap-3 [--_thumb:4.5rem]",
          vertical && "grid-cols-[var(--_thumb)_minmax(0,1fr)] items-start max-sm:grid-cols-[minmax(0,1fr)]",
          className,
        )}
        data-thumbnails={total > 1 ? thumbnails : "none"}
        role="region"
        aria-roledescription="carousel"
        aria-label={text.region}
        style={
          { "--_ratio": stageRatio, "--_zoom": zoomScale, ...style } as CSSProperties
        }
        onKeyDown={handleKeyDown}
        {...props}
      >
        <div
          className="kg-product-gallery__stage group/stage relative min-w-0 overflow-hidden rounded-[var(--_radius,var(--kg-radius-xl))] border-solid border-kg-ink [border-width:var(--_edge,2px)] bg-kg-muted data-placeholder:bg-kg-paper-sage"
          data-placeholder={total === 0 ? "" : undefined}
        >
          <div
            ref={track}
            className="kg-product-gallery__track flex aspect-(--_ratio) snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={handleScroll}
            onPointerDown={() => {
              syncing.current = null
            }}
            onWheel={() => {
              syncing.current = null
            }}
          >
            {images.map((image, i) => {
              const active = i === index
              const media = (
                <>
                  <img
                    className="kg-product-gallery__image block size-full object-cover select-none"
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                    {...(priority && i === 0
                      ? { fetchPriority: "high" as const }
                      : null)}
                  />
                  {zoom && (
                    <span
                      ref={(node) => {
                        zoomPanes.current[i] = node
                      }}
                      className="kg-product-gallery__zoom pointer-events-none absolute inset-0 bg-kg-surface bg-[length:calc(var(--_zoom)*100%)] bg-no-repeat opacity-0 transition-opacity duration-(--kg-duration-base) ease-kg-out data-active:opacity-100"
                      aria-hidden="true"
                    />
                  )}
                </>
              )
              return (
                <div
                  key={`${image.src}-${i}`}
                  className="kg-product-gallery__slide relative shrink-0 grow-0 basis-full snap-center snap-always overflow-hidden"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={text.slide(i + 1, total)}
                  aria-hidden={!active || undefined}
                  data-active={active || undefined}
                  onPointerMove={active ? moveZoom : undefined}
                  onPointerLeave={endZoom}
                >
                  {lightbox ? (
                    <button
                      type="button"
                      className="kg-product-gallery__open block size-full cursor-zoom-in border-0 bg-transparent p-0 outline-none focus-visible:rounded-kg-xl focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-kg-ring"
                      aria-label={text.open(i + 1, total)}
                      aria-haspopup="dialog"
                      tabIndex={active ? 0 : -1}
                      data-gallery-part="slide"
                      data-index={i}
                      onClick={openViewer}
                    >
                      {media}
                    </button>
                  ) : (
                    media
                  )}
                </div>
              )
            })}
          </div>

          {total > 1 && (
            <>
              {/* Touch devices swipe instead; the arrows would only cover the product. */}
              <div className={cx(arrowSlot, "start-3")}>
                <IconButton
                  className="kg-product-gallery__arrow rtl:[&_svg]:-scale-x-100"
                  data-direction="previous"
                  label={text.previous}
                  icon={<Chevron flip />}
                  variant="outline"
                  size="sm"
                  round
                  onClick={() => go(index - 1)}
                />
              </div>
              <div className={cx(arrowSlot, "end-3")}>
                <IconButton
                  className="kg-product-gallery__arrow rtl:[&_svg]:-scale-x-100"
                  data-direction="next"
                  label={text.next}
                  icon={<Chevron />}
                  variant="outline"
                  size="sm"
                  round
                  onClick={() => go(index + 1)}
                />
              </div>
              <div
                className={cx(
                  "kg-product-gallery__dots absolute bottom-3 left-1/2 -translate-x-1/2 gap-1.5 rounded-full border-2 border-kg-ink bg-kg-surface px-2.5 py-1.5",
                  layout === "none" ? "flex" : "hidden max-sm:flex",
                )}
                aria-hidden="true"
              >
                {images.map((image, i) => (
                  <span
                    key={`${image.src}-${i}`}
                    className="size-1.5 rounded-full bg-kg-fg opacity-30 transition-[opacity,scale] duration-(--kg-duration-base) ease-kg-out data-active:scale-[1.3] data-active:opacity-100"
                    data-active={i === index || undefined}
                  />
                ))}
              </div>
            </>
          )}
          <span className="kg-visually-hidden" aria-live="polite" aria-atomic="true">
            {total > 1 ? text.slide(index + 1, total) : ""}
          </span>
        </div>

        {total > 1 && thumbnails !== "none" && (
          <div
            className={cx(
              "kg-product-gallery__thumbs flex min-w-0 gap-2 p-[2px] [scrollbar-width:none] max-sm:hidden",
              vertical
                ? "col-start-1 row-start-1 flex-col self-stretch overflow-x-hidden overflow-y-auto [contain:size]"
                : "overflow-x-auto overflow-y-hidden",
            )}
          >
            {images.map((image, i) => (
              <button
                key={`${image.src}-${i}`}
                type="button"
                className={cx(
                  "kg-product-gallery__thumb aspect-(--_ratio) shrink-0 grow-0 basis-(--_thumb) cursor-pointer overflow-hidden rounded-kg-md border-2 border-kg-border bg-kg-muted p-0 opacity-65",
                  "transition-[opacity,border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out hover:opacity-100",
                  "aria-[current=true]:border-kg-ink aria-[current=true]:opacity-100 aria-[current=true]:shadow-kg-xs",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring [&>img]:block [&>img]:size-full [&>img]:object-cover",
                )}
                aria-label={text.thumbnail(i + 1, total)}
                aria-current={i === index || undefined}
                tabIndex={i === index ? 0 : -1}
                data-gallery-part="thumb"
                data-index={i}
                onClick={() => go(i)}
              >
                <img
                  src={image.thumbnail ?? image.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        )}

        {lightbox && (
          <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
            <DialogContent
              size="full"
              className="kg-product-gallery__viewer [--_dialog-bg:var(--kg-bg)]"
              closeLabel={text.close}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                  event.preventDefault()
                  const rtl = isRtl(event.currentTarget)
                  const forward = (event.key === "ArrowRight") !== rtl
                  setZoomed(false)
                  go(index + (forward ? 1 : -1))
                }
              }}
            >
              <DialogTitle className="kg-visually-hidden">
                {text.lightbox}
              </DialogTitle>
              {current && (
                <button
                  type="button"
                  className={cx(
                    "kg-product-gallery__viewer-stage relative grid min-h-0 flex-auto cursor-zoom-in place-items-center overflow-hidden border-0 bg-transparent p-4 outline-none",
                    "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-kg-ring data-zoomed:cursor-zoom-out data-zoomed:touch-none",
                    "[&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-contain [&>img]:p-4 [&>img]:select-none",
                    "[&>img]:transition-[scale] [&>img]:duration-(--kg-duration-slow) [&>img]:ease-kg-out data-zoomed:[&>img]:scale-(--_zoom)",
                  )}
                  data-zoomed={zoomed || undefined}
                  aria-label={zoomed ? text.zoomOut : text.zoomIn}
                  aria-pressed={zoomed}
                  onClick={toggleViewerZoom}
                  onPointerMove={panViewer}
                >
                  <img
                    ref={viewerImage}
                    key={current.src}
                    src={current.zoomSrc ?? current.src}
                    alt={current.alt}
                    draggable={false}
                  />
                </button>
              )}
              {total > 1 && (
                <div className="kg-product-gallery__viewer-bar flex items-center justify-center gap-4 px-4 pt-3 pb-[max(calc(var(--kg-space)*4),env(safe-area-inset-bottom))]">
                  <IconButton
                    label={text.previous}
                    icon={<Chevron flip />}
                    variant="outline"
                    round
                    onClick={() => {
                      setZoomed(false)
                      go(index - 1)
                    }}
                  />
                  <span
                    className="kg-product-gallery__counter min-w-16 text-center text-kg-sm font-[550] text-kg-fg-muted tabular-nums"
                    aria-live="polite"
                  >
                    <span className="kg-visually-hidden">
                      {text.slide(index + 1, total)}
                    </span>
                    <span aria-hidden="true">
                      {index + 1} / {total}
                    </span>
                  </span>
                  <IconButton
                    label={text.next}
                    icon={<Chevron />}
                    variant="outline"
                    round
                    onClick={() => {
                      setZoomed(false)
                      go(index + 1)
                    }}
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
  },
)

ProductGallery.displayName = "ProductGallery"
