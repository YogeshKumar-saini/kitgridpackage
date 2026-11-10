import {
  type CSSProperties,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
} from "react"
import { cx } from "../../utils/cx.js"
import type { TextEffectElement } from "../text-reveal/split-text.js"

export type GlitchTextTrigger = "always" | "hover"

export interface GlitchTextProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: string
  as?: TextEffectElement
  /** `hover` glitches only while hovered or focused within. */
  trigger?: GlitchTextTrigger
  /** One full glitch cycle, in ms. */
  speed?: number
  /** Horizontal slice offset, in em. */
  offset?: number
}

const GLITCH = [
  "kg-glitch-text relative inline-block",
  "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:[clip-path:inset(50%_0_50%_0)] before:content-[attr(data-text)] before:text-[color:color-mix(in_oklab,var(--kg-paper-rose),var(--kg-fg)_35%)] data-[trigger=always]:before:opacity-100 data-[trigger=always]:before:animate-[kg-glitch-a_var(--_speed)_steps(1,end)_infinite] data-[trigger=hover]:hover:before:opacity-100 data-[trigger=hover]:hover:before:animate-[kg-glitch-a_var(--_speed)_steps(1,end)_infinite] data-[trigger=hover]:focus-within:before:opacity-100 data-[trigger=hover]:focus-within:before:animate-[kg-glitch-a_var(--_speed)_steps(1,end)_infinite] motion-reduce:before:animate-none! motion-reduce:before:opacity-0! [[data-kg-motion=reduce]_&]:before:animate-none! [[data-kg-motion=reduce]_&]:before:opacity-0!",
  "after:pointer-events-none after:absolute after:inset-0 after:opacity-0 after:[clip-path:inset(50%_0_50%_0)] after:content-[attr(data-text)] after:text-[color:color-mix(in_oklab,var(--kg-paper-sky),var(--kg-fg)_35%)] data-[trigger=always]:after:opacity-100 data-[trigger=always]:after:animate-[kg-glitch-b_var(--_speed)_steps(1,end)_infinite] data-[trigger=hover]:hover:after:opacity-100 data-[trigger=hover]:hover:after:animate-[kg-glitch-b_var(--_speed)_steps(1,end)_infinite] data-[trigger=hover]:focus-within:after:opacity-100 data-[trigger=hover]:focus-within:after:animate-[kg-glitch-b_var(--_speed)_steps(1,end)_infinite] motion-reduce:after:animate-none! motion-reduce:after:opacity-0! [[data-kg-motion=reduce]_&]:after:animate-none! [[data-kg-motion=reduce]_&]:after:opacity-0!",
].join(" ")

/**
 * Text torn into shifting horizontal slices by two offset copies. The copies are pseudo
 * elements, so the accessible text is the plain string. Pure CSS: server-safe, and the loop
 * stops under reduced motion.
 */
export const GlitchText = forwardRef<HTMLElement, GlitchTextProps>(
  (
    { children, as = "span", trigger = "always", speed = 2400, offset = 0.06, className, style, ...props },
    ref,
  ) => {
    const Tag = as as ElementType
    return (
      <Tag
        ref={ref}
        className={cx(GLITCH, className)}
        data-text={children}
        data-trigger={trigger}
        style={
          {
            "--_speed": `${speed}ms`,
            "--_offset": `${offset}em`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {children}
      </Tag>
    )
  },
)

GlitchText.displayName = "GlitchText"
