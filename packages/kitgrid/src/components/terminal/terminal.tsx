"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useRef,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export type TerminalLineKind = "input" | "output" | "success" | "error" | "muted"

export interface TerminalLine {
  text: string
  kind?: TerminalLineKind
  /** Overrides the terminal prompt for this input line. */
  prompt?: string
  /** Extra pause before this line, in ms. */
  delay?: number
}

export interface TerminalProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  lines: TerminalLine[]
  title?: ReactNode
  prompt?: string
  /** Types input lines and reveals output once scrolled into view. */
  animate?: boolean
  /** Milliseconds per typed character. */
  typingSpeed?: number
  /** Pause after each line, in ms. */
  lineDelay?: number
}

interface Scheduled extends TerminalLine {
  start: number
  duration: number
}

const LINE_INK: Record<TerminalLineKind, string> = {
  input: "text-kg-fg",
  output: "text-kg-fg-muted",
  success: "text-[color-mix(in_oklab,var(--kg-success)_85%,var(--kg-fg))]",
  error: "text-[color-mix(in_oklab,var(--kg-danger)_85%,var(--kg-fg))]",
  muted: "text-kg-fg-faint",
}

const still = "motion-reduce:animate-none motion-reduce:opacity-100 [[data-kg-motion=reduce]_&]:animate-none [[data-kg-motion=reduce]_&]:opacity-100"

const schedule = (lines: TerminalLine[], speed: number, gap: number) => {
  let t = 250
  const out: Scheduled[] = lines.map((line) => {
    t += line.delay ?? 0
    const typed = (line.kind ?? "output") === "input"
    const duration = typed ? Math.max(1, line.text.length) * speed : 0
    const item = { ...line, start: t, duration }
    t += duration + (typed ? gap * 2.5 : gap)
    return item
  })
  return { lines: out, total: t }
}

/**
 * Paper Layers: a fixed night-paper sheet; the keyframes live in terminal.css and each line's
 * timing is composed here into --_show, --_type and --_caret.
 *
 * A terminal transcript that types its commands. The typing is pure CSS (`clip-path` stepped
 * per character), so nothing re-renders per frame; screen readers get the full transcript.
 */
export const Terminal = forwardRef<HTMLDivElement, TerminalProps>(
  (
    {
      lines,
      title,
      prompt = "$",
      animate = true,
      typingSpeed = 38,
      lineDelay = 140,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const ref = useRef<HTMLDivElement>(null)
    const composed = useComposedRefs(ref, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(ref, { once: true, amount: 0.3 })
    const plan = schedule(lines, typingSpeed, lineDelay)
    const state = !animate || reduced ? "static" : inView ? "playing" : "idle"
    const transcript = lines
      .map((line) =>
        (line.kind ?? "output") === "input" ? `${line.prompt ?? prompt} ${line.text}` : line.text,
      )
      .join("\n")

    return (
      <div
        ref={composed}
        className={cx(
          "kg-terminal relative grid min-w-0 overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-bg font-kg-mono text-kg-sm leading-[1.7] shadow-kg-md",
          className,
        )}
        data-state={state}
        style={{ "--_total": `${plan.total}ms` } as CSSProperties}
        {...props}
      >
        {title != null && (
          <div
            data-theme="dark"
            className="kg-terminal__bar flex items-center gap-2 border-b-2 border-kg-border bg-kg-surface px-3.5 py-2 text-kg-xs text-kg-fg-muted"
          >
            <span
              className="kg-terminal__glyph inline-grid size-5 place-items-center rounded-kg-sm bg-kg-accent-soft text-kg-accent-strong [&_svg]:size-[0.8125rem]"
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16">
                <path
                  d="M3 4.5l3.5 3.5L3 11.5M8.5 12H13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="kg-terminal__title min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {title}
            </span>
          </div>
        )}
        <pre className="kg-terminal__sr absolute m-0 size-px overflow-hidden whitespace-pre [clip-path:inset(50%)]">
          {transcript}
        </pre>
        <div
          data-theme="dark"
          className="kg-terminal__body overflow-x-auto bg-kg-bg px-4 py-3.5 text-kg-fg [scrollbar-width:thin]"
          aria-hidden="true"
        >
          {plan.lines.map((line, index) => {
            const kind = line.kind ?? "output"
            const last = index === plan.lines.length - 1
            const steps = Math.max(1, line.text.length)
            const playing = state === "playing"
            return (
              <div
                key={index}
                className={cx(
                  "kg-terminal__line flex gap-2.5 whitespace-pre",
                  LINE_INK[kind],
                  state === "idle" && "opacity-0",
                  playing && `animate-(--_show) ${still}`,
                  last &&
                    `after:-ms-1.5 after:h-[1.2em] after:w-[0.55em] after:flex-none after:self-center after:rounded-[1px] after:bg-kg-accent ${
                      reduced ? "" : "after:animate-(--_caret)"
                    } motion-reduce:after:animate-none [[data-kg-motion=reduce]_&]:after:animate-none`,
                )}
                data-kind={kind}
                data-last={index === plan.lines.length - 1 || undefined}
                style={
                  {
                    "--_start": `${line.start}ms`,
                    "--_dur": `${line.duration}ms`,
                    "--_steps": steps,
                    ...(playing
                      ? {
                          "--_show":
                            kind === "input"
                              ? `kg-terminal-show 1ms linear ${line.start}ms both`
                              : `kg-terminal-rise var(--kg-duration-base) var(--kg-ease-out) ${line.start}ms both`,
                          "--_type": `kg-terminal-type ${line.duration}ms steps(${steps}, end) ${line.start}ms both`,
                        }
                      : null),
                    ...(last
                      ? {
                          "--_caret": playing
                            ? `kg-terminal-show 1ms linear ${plan.total}ms both, kg-terminal-caret 1.1s steps(1) ${plan.total}ms infinite`
                            : "kg-terminal-caret 1.1s steps(1) infinite",
                        }
                      : null),
                  } as CSSProperties
                }
              >
                {kind === "input" && (
                  <span className="kg-terminal__prompt flex-none font-semibold text-kg-accent-strong select-none">{line.prompt ?? prompt}</span>
                )}
                <span
                  className={cx(
                    "kg-terminal__text relative",
                    playing && kind === "input" && `animate-(--_type) ${still}`,
                  )}
                >{line.text || " "}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)
Terminal.displayName = "Terminal"
