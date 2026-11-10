"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useRovingFocus } from "../../hooks/use-roving-focus.js"
import { variants } from "../../utils/variants.js"

export type EnvironmentSwitcherTone = "neutral" | "info" | "warning" | "danger"
export type EnvironmentSwitcherSize = "sm" | "md"

export interface EnvironmentSwitcherEnvironment {
  id: string
  label: string
  /** `danger` marks production, so it never looks like a safe default. */
  tone?: EnvironmentSwitcherTone
}

export interface EnvironmentSwitcherProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  environments?: readonly EnvironmentSwitcherEnvironment[]
  value?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  size?: EnvironmentSwitcherSize
  /** Required name for the radio group. */
  "aria-label": string
}

/*
 * Paper Layers: a sunken track in an ink edge; the thumb is a lifted slip whose paper follows the
 * selected tone, and production turns the thumb danger red.
 */
const rootVariants = variants({
  base: [
    "kg-environment-switcher relative isolate inline-grid grid-cols-[repeat(var(--_count,3),minmax(0,1fr))] p-[3px]",
    "rounded-kg-md border-2 border-kg-ink bg-kg-surface-sunken",
  ],
  variants: {
    size: { sm: "h-kg-sm", md: "h-kg-md" },
  },
  defaults: { size: "md" },
})

const thumbVariants = variants({
  base: [
    "kg-environment-switcher__thumb absolute inset-y-[3px] start-[3px] -z-10 w-(--_thumb)",
    "rounded-[calc(var(--kg-radius-md)-3px)] border-2 border-kg-ink shadow-kg-xs",
    "translate-x-(--_shift) rtl:-translate-x-(--_shift)",
    "transition-[translate,background-color] duration-(--kg-duration-base) ease-kg-spring motion-reduce:transition-none",
  ],
  variants: {
    tone: {
      neutral: "bg-kg-surface",
      info: "bg-kg-paper-sky",
      warning: "bg-kg-paper-butter",
      danger: "bg-kg-danger",
    },
  },
  defaults: { tone: "neutral" },
})

const optionVariants = variants({
  base: [
    "kg-environment-switcher__option group/option inline-flex min-w-0 items-center justify-center gap-1.75 px-3",
    "rounded-[calc(var(--kg-radius-md)-3px)] border-0 bg-transparent [font-family:inherit] text-kg-xs font-semibold whitespace-nowrap",
    "cursor-pointer transition-colors duration-(--kg-duration-fast) ease-kg-out",
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
  ],
  variants: {
    checked: {
      true: "",
      false: "text-kg-fg-muted interactive:hover:text-kg-fg",
    },
    tone: { neutral: "", info: "", warning: "", danger: "" },
  },
  compound: [
    { checked: true, tone: "neutral", class: "text-kg-fg" },
    { checked: true, tone: "info", class: "text-kg-fg" },
    { checked: true, tone: "warning", class: "text-kg-fg" },
    { checked: true, tone: "danger", class: "text-kg-danger-fg" },
  ],
})

const dotVariants = variants({
  base: [
    "kg-environment-switcher__dot size-[0.4375rem] shrink-0 rounded-full",
    "transition-transform duration-(--kg-duration-base) ease-kg-out group-aria-checked/option:scale-130 motion-reduce:transition-none",
  ],
  variants: {
    tone: {
      neutral: "bg-kg-fg-faint",
      info: "bg-kg-info",
      warning: "bg-kg-warning",
      danger: "bg-kg-danger group-aria-checked/option:bg-kg-danger-fg",
    },
  },
  defaults: { tone: "neutral" },
})

const defaults: EnvironmentSwitcherEnvironment[] = [
  { id: "development", label: "Development", tone: "neutral" },
  { id: "staging", label: "Staging", tone: "warning" },
  { id: "production", label: "Production", tone: "danger" },
]

/**
 * A radio group for the environment a view targets. A sliding thumb carries the selection and
 * each environment keeps its tone, so production always reads as production.
 */
export const EnvironmentSwitcher = forwardRef<HTMLDivElement, EnvironmentSwitcherProps>(
  (
    {
      environments = defaults,
      value: valueProp,
      defaultValue,
      onValueChange,
      size = "md",
      className,
      style,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? environments[0]?.id,
      onChange: (next) => {
        if (next != null) onValueChange?.(next)
      },
    })
    const roving = useRovingFocus({ orientation: "horizontal" })
    const index = Math.max(
      environments.findIndex((env) => env.id === value),
      0,
    )
    const selected = environments[index]

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const item = roving(event)
      if (item?.dataset.value) setValue(item.dataset.value)
    }

    return (
      <div
        ref={ref}
        role="radiogroup"
        className={rootVariants({ size, className })}
        data-size={size}
        data-tone={selected?.tone ?? "neutral"}
        style={
          {
            "--_count": environments.length,
            "--_index": index,
            "--_thumb": `calc((100% - 6px) / ${Math.max(environments.length, 1)})`,
            "--_shift": `${index * 100}%`,
            ...style,
          } as CSSProperties
        }
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span className={thumbVariants({ tone: selected?.tone ?? "neutral" })} aria-hidden="true" />
        {environments.map((env) => {
          const checked = env.id === selected?.id
          return (
            <button
              key={env.id}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              className={optionVariants({ checked, tone: env.tone ?? "neutral" })}
              data-tone={env.tone ?? "neutral"}
              data-kg-item=""
              data-value={env.id}
              onClick={() => setValue(env.id)}
            >
              <span className={dotVariants({ tone: env.tone ?? "neutral" })} aria-hidden="true" />
              {env.label}
            </button>
          )
        })}
      </div>
    )
  },
)

EnvironmentSwitcher.displayName = "EnvironmentSwitcher"
