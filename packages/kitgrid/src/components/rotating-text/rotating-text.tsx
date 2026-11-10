"use client"

import {
  type CSSProperties,
  type ElementType,
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { graphemes, type TextEffectElement } from "../text-reveal/split-text.js"
import { usePlayback } from "../text-reveal/use-playback.js"

export type RotatingTextTransition = "slide-up" | "blur" | "flip"
export type RotatingTextAlign = "start" | "center" | "end"

export interface RotatingTextProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "onChange"
> {
  words: string[]
  as?: TextEffectElement
  /** Time each word stays, in ms. */
  interval?: number
  transition?: RotatingTextTransition
  /** Length of each character's (or the word's) transition, in ms. */
  duration?: number
  /** Gap between characters, in ms. 0 moves each word as one piece. */
  stagger?: number
  /** Hold the current word while a pointer is over it or focus is inside. */
  pauseOnHover?: boolean
  /** Size the slot to the longest word so surrounding text never moves. */
  reserveWidth?: boolean
  /** Where shorter words sit inside the reserved slot. */
  align?: RotatingTextAlign
  /** Replaces the screen reader text, which defaults to the words joined by commas. */
  label?: string
  onChange?: (index: number, word: string) => void
}

interface Rotation {
  index: number
  previous: number
  tick: number
}

const motions: Record<RotatingTextTransition, { enter: string; exit: string }> = {
  "slide-up": {
    enter: "[animation-name:kg-rotating-text-slide-in] [animation-timing-function:var(--kg-ease-spring)]",
    exit: "[animation-name:kg-rotating-text-slide-out]",
  },
  blur: {
    enter: "[animation-name:kg-rotating-text-blur-in] [animation-timing-function:var(--kg-ease-out)]",
    exit: "[animation-name:kg-rotating-text-blur-out]",
  },
  flip: {
    enter: "[animation-name:kg-rotating-text-flip-in] [animation-timing-function:var(--kg-ease-spring)]",
    exit: "[animation-name:kg-rotating-text-flip-out]",
  },
}

const pieceBase =
  "kg-rotating-text__piece inline-block whitespace-pre backface-hidden [animation-fill-mode:both] motion-reduce:animate-none in-data-[kg-motion=reduce]:animate-none"

const Word = ({
  text,
  stagger,
  state,
  transition,
}: {
  text: string
  stagger: number
  state: string
  transition: RotatingTextTransition
}) => {
  // Exiting words leave a little faster and keep their final, invisible frame until replaced.
  const piece = cx(
    pieceBase,
    state === "exit"
      ? cx(
          motions[transition].exit,
          "[animation-duration:calc(var(--_duration,600ms)*0.7)] [animation-timing-function:var(--kg-ease-in)]",
        )
      : cx(
          "[animation-duration:var(--_duration,600ms)]",
          state === "enter" ? motions[transition].enter : undefined,
        ),
  )
  return (
    <span
      className={cx(
        "kg-rotating-text__word inline-block",
        transition === "flip" && "perspective-[24em]",
        state === "exit" && "pointer-events-none motion-reduce:invisible in-data-[kg-motion=reduce]:invisible",
      )}
      data-state={state}
    >
      {stagger > 0 ? (
        graphemes(text).map((char, i) => (
          <span
            key={i}
            className={piece}
            style={{ "--_i": i, animationDelay: `${i * stagger}ms` } as CSSProperties}
          >
            {char}
          </span>
        ))
      ) : (
        <span className={piece}>{text}</span>
      )}
    </span>
  )
}

/* Every word shares one grid cell: the invisible sizers fix the slot to the longest word, and the
   inline-grid's baseline is the first item's, so the slot sits on the sentence's baseline. */
const stageAlign: Record<RotatingTextAlign, string> = {
  start: "justify-items-start",
  center: "justify-items-center",
  end: "justify-items-end",
}

/**
 * Cycles through words in a fixed-width slot with a slide, blur or 3D flip. Only one state
 * update per word; the motion itself is CSS. Pauses on hover, on focus, offscreen and in hidden
 * tabs.
 */
export const RotatingText = forwardRef<HTMLElement, RotatingTextProps>(
  (
    {
      words,
      as = "span",
      interval = 2600,
      transition = "slide-up",
      duration = 600,
      stagger = 24,
      pauseOnHover = true,
      reserveWidth = true,
      align = "start",
      label,
      onChange,
      className,
      style,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const [hovered, setHovered] = useState(false)
    const [focused, setFocused] = useState(false)
    const held = pauseOnHover && (hovered || focused)
    const playing = usePlayback(local, !held)
    const [{ index, previous, tick }, setRotation] = useState<Rotation>({
      index: 0,
      previous: -1,
      tick: 0,
    })
    const count = words.length
    const changed = useEventCallback(onChange)

    useEffect(() => {
      if (!playing || count < 2) return
      const timer = setTimeout(() => {
        setRotation((current) => ({
          index: (current.index + 1) % count,
          previous: current.index,
          tick: current.tick + 1,
        }))
      }, interval)
      return () => clearTimeout(timer)
    }, [playing, count, interval, tick])

    useEffect(() => {
      if (tick > 0) changed(index, words[index] ?? "")
      // Only a rotation should report, not a re-render with new `words`.
    }, [tick])

    const current = words[index % Math.max(count, 1)] ?? ""
    const outgoing = previous >= 0 && !reduced ? words[previous] : undefined
    const Tag = as as ElementType

    return (
      <Tag
        ref={ref}
        className={cx("kg-rotating-text", className)}
        data-transition={transition}
        data-align={align}
        style={
          {
            "--_duration": `${duration}ms`,
            "--_stagger": `${stagger}ms`,
            ...style,
          } as CSSProperties
        }
        onPointerEnter={(event: PointerEvent<HTMLElement>) => {
          onPointerEnter?.(event)
          if (event.pointerType === "mouse") setHovered(true)
        }}
        onPointerLeave={(event: PointerEvent<HTMLElement>) => {
          onPointerLeave?.(event)
          setHovered(false)
        }}
        onFocus={(event: FocusEvent<HTMLElement>) => {
          onFocus?.(event)
          setFocused(true)
        }}
        onBlur={(event: FocusEvent<HTMLElement>) => {
          onBlur?.(event)
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setFocused(false)
        }}
        {...props}
      >
        <span className="kg-visually-hidden kg-rotating-text__label select-none">
          {label ?? words.join(", ")}
        </span>
        <span
          className={cx(
            "kg-rotating-text__stage inline-grid whitespace-nowrap *:[grid-area:1/1]",
            stageAlign[align],
            transition === "slide-up" && "[clip-path:inset(-0.1em_-0.6em_-0.18em)]",
          )}
          aria-hidden="true"
        >
          {reserveWidth &&
            words.map((word, i) => (
              <span key={`sizer-${i}`} className="kg-rotating-text__sizer invisible">
                {word}
              </span>
            ))}
          {outgoing !== undefined && (
            <Word
              key={tick - 1}
              text={outgoing}
              stagger={stagger}
              state="exit"
              transition={transition}
            />
          )}
          <Word
            key={tick}
            text={current}
            stagger={stagger}
            state={tick === 0 ? "idle" : "enter"}
            transition={transition}
          />
        </span>
      </Tag>
    )
  },
)

RotatingText.displayName = "RotatingText"
