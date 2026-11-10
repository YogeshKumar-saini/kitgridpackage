"use client"

import {
  type CSSProperties,
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
} from "react"
import { usePresence } from "../../hooks/use-presence.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { useDocumentHidden } from "../countdown/use-document-hidden.js"
import { IconButton } from "../icon-button/icon-button.js"
import { variants } from "../../utils/variants.js"

/* The controls take the bar's own text colour, so they read on every tone. */
const controlClass = "kg-announcement-bar__control opacity-85 interactive:hover:opacity-100"
const controlStyle = {
  "--_fg": "currentColor",
  "--_fg-hover": "currentColor",
  "--_bg-hover": "color-mix(in oklab, currentColor 14%, transparent)",
} as CSSProperties

export type AnnouncementBarTone = "accent" | "neutral" | "inverse"

export interface AnnouncementBarLabels {
  /** Accessible name of the whole bar. */
  region?: string
  pause?: string
  play?: string
  previous?: string
  next?: string
  dismiss?: string
  /** Names each message, e.g. "2 of 3". */
  slide?: (position: number, total: number) => string
}

export interface AnnouncementBarProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  messages: ReactNode[]
  /** Milliseconds each message stays before rotating. */
  interval?: number
  /** Rotate automatically. Off by default under reduced motion; the controls still work. */
  autoPlay?: boolean
  tone?: AnnouncementBarTone
  /** Show a close button. The bar hides itself and calls `onDismiss` (persist it there). */
  dismissible?: boolean
  onDismiss?: () => void
  labels?: AnnouncementBarLabels
}

const defaultLabels: Required<AnnouncementBarLabels> = {
  region: "Announcements",
  pause: "Pause announcements",
  play: "Play announcements",
  previous: "Previous announcement",
  next: "Next announcement",
  dismiss: "Dismiss announcements",
  slide: (position, total) => `${position} of ${total}`,
}

const icon = (path: string) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={path} />
  </svg>
)

const PauseIcon = () => icon("M9 6v12M15 6v12")
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.4-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5Z" />
  </svg>
)
const PrevIcon = () => icon("m15 6-6 6 6 6")
const NextIcon = () => icon("m9 6 6 6-6 6")
const CloseIcon = () => icon("M7 7l10 10M17 7 7 17")

/* Paper Layers: a full-width ink or paper strip; links inherit its colour and keep an underline. */
const barVariants = variants({
  base: [
    "kg-announcement-bar grid w-full grid-rows-[1fr] text-kg-sm leading-[1.35] font-[550]",
    "data-[state=closed]:animate-[kg-announcement-collapse_var(--kg-duration-slow)_var(--kg-ease-in-out)_forwards]",
    "[&_a]:rounded-kg-xs [&_a]:text-inherit [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-[0.2em]",
    "[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-kg-ring",
  ],
  variants: {
    tone: {
      accent: "border-b-2 border-kg-ink bg-kg-accent text-kg-accent-fg [--kg-ring:currentColor]",
      neutral: "border-b-2 border-kg-ink bg-kg-paper-sage text-kg-fg",
      inverse: "border-b-2 border-kg-ink bg-kg-fg text-kg-bg [--kg-ring:currentColor]",
    },
  },
  defaults: { tone: "accent" },
})

const slideMotion = {
  next: {
    current: "animate-[kg-announcement-in-up_var(--kg-duration-slow)_var(--kg-ease-out)]",
    leaving: "animate-[kg-announcement-out-up_var(--kg-duration-slow)_var(--kg-ease-out)]",
  },
  prev: {
    current: "animate-[kg-announcement-in-down_var(--kg-duration-slow)_var(--kg-ease-out)]",
    leaving: "animate-[kg-announcement-out-down_var(--kg-duration-slow)_var(--kg-ease-out)]",
  },
} as const

interface Rotation {
  index: number
  previous: number | null
  direction: "next" | "prev"
}

/**
 * Site-wide promo strip following the APG carousel pattern: rotation pauses on hover and focus,
 * a visible pause control satisfies WCAG 2.2.2, and messages slide vertically.
 */
export const AnnouncementBar = forwardRef<HTMLElement, AnnouncementBarProps>(
  (
    {
      messages,
      interval = 6000,
      autoPlay = true,
      tone = "accent",
      dismissible = false,
      onDismiss,
      labels,
      className,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      ...props
    },
    forwardedRef,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const reduced = useReducedMotion()
    const hidden = useDocumentHidden()
    const [rotation, setRotation] = useState<Rotation>({
      index: 0,
      previous: null,
      direction: "next",
    })
    const [playing, setPlaying] = useState(autoPlay)
    const [hovered, setHovered] = useState(false)
    const [focused, setFocused] = useState(false)
    const [dismissed, setDismissed] = useState(false)
    const presence = usePresence<HTMLElement>(!dismissed)
    const ref = useComposedRefs(forwardedRef, presence.ref)

    const count = messages.length
    const multiple = count > 1
    const index = count ? rotation.index % count : 0
    const rotating = multiple && playing && !hovered && !focused && !hidden

    useEffect(() => {
      if (reduced) setPlaying(false)
    }, [reduced])

    const go = (direction: "next" | "prev") =>
      setRotation((current) => ({
        index: (current.index + (direction === "next" ? 1 : -1) + count) % count,
        previous: current.index,
        direction,
      }))

    useEffect(() => {
      if (!rotating) return
      const timer = setTimeout(() => go("next"), interval)
      return () => clearTimeout(timer)
    }, [rotating, rotation.index, interval, count])

    if (!presence.present || count === 0) return null

    const handleBlur = (event: FocusEvent<HTMLElement>) => {
      onBlur?.(event)
      if (!event.currentTarget.contains(event.relatedTarget as Node | null))
        setFocused(false)
    }

    return (
      <section
        ref={ref}
        className={barVariants({ tone, className })}
        aria-roledescription="carousel"
        aria-label={text.region}
        data-tone={tone}
        data-state={presence.state}
        data-direction={rotation.direction}
        data-animated={rotation.previous !== null || undefined}
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          if (event.pointerType === "mouse") setHovered(true)
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event)
          setHovered(false)
        }}
        onFocus={(event) => {
          onFocus?.(event)
          setFocused(true)
        }}
        onBlur={handleBlur}
        {...props}
      >
        <div className="kg-announcement-bar__inner grid min-h-0 grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-2 overflow-hidden px-2 py-1">
          {multiple && (
            <div className="kg-announcement-bar__controls flex gap-0.5 justify-self-start">
              <IconButton
                className={controlClass}
                style={controlStyle}
                size="sm"
                label={playing ? text.pause : text.play}
                icon={playing ? <PauseIcon /> : <PlayIcon />}
                onClick={() => setPlaying((value) => !value)}
              />
              <IconButton
                className={controlClass}
                style={controlStyle}
                size="sm"
                label={text.previous}
                icon={<PrevIcon />}
                onClick={() => go("prev")}
              />
            </div>
          )}
          <div
            className="kg-announcement-bar__viewport col-start-2 grid min-w-0 overflow-hidden py-1.5 text-center"
            aria-live={rotating ? "off" : "polite"}
          >
            {messages.map((message, position) => {
              const place =
                position === index
                  ? "current"
                  : position === rotation.previous
                    ? "leaving"
                    : "idle"
              return (
              <div
                key={position}
                className={cx(
                  "kg-announcement-bar__slide flex min-w-0 items-center justify-center gap-[0.5em] [grid-area:1/1]",
                  place !== "current" && "invisible",
                  rotation.previous !== null && place !== "idle" && slideMotion[rotation.direction][place],
                )}
                role={multiple ? "group" : undefined}
                aria-roledescription={multiple ? "slide" : undefined}
                aria-label={multiple ? text.slide(position + 1, count) : undefined}
                aria-hidden={position !== index || undefined}
                data-position={place}
              >
                {message}
              </div>
              )
            })}
          </div>
          {(multiple || dismissible) && (
            <div
              className="kg-announcement-bar__controls col-start-3 flex gap-0.5 justify-self-end"
              data-end=""
            >
              {multiple && (
                <IconButton
                  className={controlClass}
                  style={controlStyle}
                  size="sm"
                  label={text.next}
                  icon={<NextIcon />}
                  onClick={() => go("next")}
                />
              )}
              {dismissible && (
                <IconButton
                  className={controlClass}
                  style={controlStyle}
                  size="sm"
                  label={text.dismiss}
                  icon={<CloseIcon />}
                  onClick={() => {
                    setDismissed(true)
                    onDismiss?.()
                  }}
                />
              )}
            </div>
          )}
        </div>
      </section>
    )
  },
)

AnnouncementBar.displayName = "AnnouncementBar"
