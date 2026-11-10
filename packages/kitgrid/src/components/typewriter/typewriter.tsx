"use client"

import {
  type CSSProperties,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { graphemes, type TextEffectElement } from "../text-reveal/split-text.js"
import { usePlayback } from "../text-reveal/use-playback.js"

export type TypewriterCursor = "bar" | "block" | "underscore" | "none"

export interface TypewriterProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "prefix"
> {
  /** Typed in order, then deleted and replaced by the next. */
  words: string[]
  /** Static text before the typed words. It stays readable to assistive tech as normal text. */
  prefix?: ReactNode
  as?: TextEffectElement
  /** Time per typed character, in ms. */
  typeSpeed?: number
  /** Time per deleted character, in ms. */
  deleteSpeed?: number
  /** How long a finished word stays before it is deleted, in ms. */
  pause?: number
  /** Start over after the last word. When false, the last word stays typed. */
  loop?: boolean
  /** Type the first word from nothing. By default it is already present, which keeps SSR stable. */
  startEmpty?: boolean
  cursor?: TypewriterCursor
  blink?: boolean
  /** Any CSS color. Defaults to the accent. */
  cursorColor?: string
  /** Replaces the screen reader text, which defaults to the words joined by commas. */
  label?: string
}

/* A real caret holds steady while keys are pressed and only blinks at rest. */
const cursorShape: Record<Exclude<TypewriterCursor, "none">, string> = {
  bar: "h-[1.05em] w-[0.075em] align-[-0.16em]",
  block: "h-[1.05em] w-[0.56em] align-[-0.16em] opacity-85",
  underscore: "h-[0.08em] w-[0.56em] align-[-0.12em]",
}

type Phase = "typing" | "holding" | "deleting" | "done"

interface Machine {
  key: string
  word: number
  count: number
  phase: Phase
}

/**
 * Types and deletes a list of words behind a cursor. Characters are written straight to a text
 * node, so a running typewriter never re-renders. It idles while offscreen or in a hidden tab.
 */
export const Typewriter = forwardRef<HTMLElement, TypewriterProps>(
  (
    {
      words,
      prefix,
      as = "span",
      typeSpeed = 65,
      deleteSpeed = 35,
      pause = 1600,
      loop = true,
      startEmpty = false,
      cursor = "bar",
      blink = true,
      cursorColor,
      label,
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const textRef = useRef<HTMLSpanElement>(null)
    const machine = useRef<Machine | null>(null)
    const reduced = useReducedMotion()
    const playing = usePlayback(local)
    const key = words.join("\u241f")
    // Keyed on content, not identity, so an inline `words={[…]}` doesn't restart the effect.
    const list = useMemo(() => words.map(graphemes), [key])

    useEffect(() => {
      const root = local.current
      const node = textRef.current
      if (!root || !node || list.length === 0) return
      const lengthOf = (word: number) => list[word]?.length ?? 0

      let state = machine.current
      if (!state || state.key !== key) {
        state = machine.current = startEmpty
          ? { key, word: 0, count: 0, phase: "typing" }
          : { key, word: 0, count: lengthOf(0), phase: "holding" }
      }
      const current = state
      const write = () => {
        node.textContent = (list[current.word] ?? []).slice(0, current.count).join("")
      }
      const setTyping = (typing: boolean) => {
        if (typing) root.dataset.typing = ""
        else delete root.dataset.typing
      }
      setTyping(false)

      if (reduced) {
        // Same rhythm as the animated version, but each word lands whole.
        if (!loop) current.word = list.length - 1
        current.count = lengthOf(current.word)
        current.phase = current.word === list.length - 1 && !loop ? "done" : "holding"
        write()
        if (!playing || current.phase === "done" || list.length < 2) return
        const cycle = () => pause + lengthOf(current.word) * (typeSpeed + deleteSpeed)
        let timer = setTimeout(function next() {
          current.word = (current.word + 1) % list.length
          current.count = lengthOf(current.word)
          write()
          timer = setTimeout(next, cycle())
        }, cycle())
        return () => clearTimeout(timer)
      }

      write()
      if (!playing || current.phase === "done") return

      let timer: ReturnType<typeof setTimeout>
      const step = () => {
        if (current.phase === "typing") {
          if (current.count < lengthOf(current.word)) {
            current.count += 1
            write()
            setTyping(true)
            timer = setTimeout(step, typeSpeed)
            return
          }
          setTyping(false)
          if (!loop && current.word === list.length - 1) {
            current.phase = "done"
            return
          }
          current.phase = "holding"
          timer = setTimeout(step, pause)
          return
        }
        if (current.phase === "holding") current.phase = "deleting"
        if (current.count > 0) {
          current.count -= 1
          write()
          setTyping(true)
          timer = setTimeout(step, deleteSpeed)
          return
        }
        current.word = (current.word + 1) % list.length
        current.phase = "typing"
        timer = setTimeout(step, typeSpeed * 2)
      }

      const wait =
        current.phase === "holding"
          ? pause
          : current.phase === "deleting"
            ? deleteSpeed
            : typeSpeed
      timer = setTimeout(step, wait)
      return () => {
        clearTimeout(timer)
        setTyping(false)
      }
    }, [key, list, playing, reduced, loop, startEmpty, typeSpeed, deleteSpeed, pause])

    const Tag = as as ElementType

    return (
      <Tag
        ref={ref}
        className={cx(
          "kg-typewriter group/typewriter [--_cursor:var(--kg-typewriter-cursor,var(--kg-accent-strong))]",
          className,
        )}
        data-cursor={cursor}
        data-blink={(blink && cursor !== "none") || undefined}
        style={
          {
            ...(cursorColor ? { "--kg-typewriter-cursor": cursorColor } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {prefix != null && prefix !== false && <>{prefix} </>}
        <span className="kg-visually-hidden kg-typewriter__label select-none">
          {label ?? words.join(", ")}
        </span>
        <span className="kg-typewriter__visual" aria-hidden="true">
          <span key={key} ref={textRef} className="kg-typewriter__text whitespace-pre-wrap">
            {startEmpty ? "" : (words[0] ?? "")}
          </span>
          {cursor !== "none" && (
            <span
              className={cx(
                "kg-typewriter__cursor ms-[0.06em] inline-block bg-(--_cursor)",
                cursorShape[cursor],
                blink &&
                  "animate-[kg-typewriter-blink_1.1s_linear_infinite] group-data-typing/typewriter:animate-none motion-reduce:animate-none in-data-[kg-motion=reduce]:animate-none",
              )}
            />
          )}
        </span>
      </Tag>
    )
  },
)

Typewriter.displayName = "Typewriter"
