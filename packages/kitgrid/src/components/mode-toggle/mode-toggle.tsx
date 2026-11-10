"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { IconButton } from "../icon-button/icon-button.js"
import { MonitorIcon, MoonIcon, SunIcon } from "../chat-message/internal/icons.js"
import { SegmentedControl } from "../segmented-control/segmented-control.js"

export type ModeToggleValue = "light" | "dark" | "system"
export type ModeToggleVariant = "cycle" | "segmented"
export type ModeToggleLabels = Record<ModeToggleValue, string>

export interface ModeToggleProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "defaultValue" | "onChange"
> {
  value?: ModeToggleValue
  defaultValue?: ModeToggleValue
  onValueChange?: (value: ModeToggleValue) => void
  /** `cycle` is one icon button that steps light, dark, system; `segmented` shows all three. */
  variant?: ModeToggleVariant
  labels?: Partial<ModeToggleLabels>
  /** The name the cycle button announces before the current mode, e.g. "Color mode: Dark". */
  label?: string
  /** Segmented only: show the text beside each icon. */
  showLabels?: boolean
}

const ORDER: readonly ModeToggleValue[] = ["light", "dark", "system"]

const defaultLabels: ModeToggleLabels = {
  light: "Light",
  dark: "Dark",
  system: "System",
}

const glyphs: Record<ModeToggleValue, ReactNode> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  system: <MonitorIcon />,
}

/**
 * Light, dark or follow the system. It only reports the choice; apply it with
 * `data-theme` on the root. The cycle button turns its glyph in on every change.
 */
export const ModeToggle = forwardRef<HTMLElement, ModeToggleProps>(
  (
    {
      value: valueProp,
      defaultValue = "system",
      onValueChange,
      variant = "cycle",
      labels: labelsProp,
      label = "Color mode",
      showLabels = true,
      className,
      ...props
    },
    ref,
  ) => {
    const labels = { ...defaultLabels, ...labelsProp }
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })

    if (variant === "segmented")
      return (
        <SegmentedControl<ModeToggleValue>
          ref={ref as Ref<HTMLDivElement>}
          className={cx("kg-mode-toggle", className)}
          aria-label={label}
          value={value}
          onValueChange={setValue}
          options={ORDER.map((mode) => ({
            value: mode,
            icon: glyphs[mode],
            label: showLabels ? labels[mode] : undefined,
            "aria-label": showLabels ? undefined : labels[mode],
          }))}
          {...(props as Omit<HTMLAttributes<HTMLDivElement>, "defaultValue">)}
        />
      )

    const next = ORDER[(ORDER.indexOf(value) + 1) % ORDER.length] ?? "light"
    return (
      <IconButton
        ref={ref as Ref<HTMLButtonElement>}
        className={cx("kg-mode-toggle", className)}
        data-variant="cycle"
        data-mode={value}
        label={`${label}: ${labels[value]}`}
        title={`Switch to ${labels[next]}`}
        onClick={() => setValue(next)}
        icon={
          <span
            key={value}
            className={cx(
              "kg-mode-toggle__glyph inline-grid size-[55%] place-items-center [--_icon-size:100%] text-[1.125rem] motion-reduce:animate-none",
              value === "dark"
                ? "animate-[kg-mode-toggle-turn-back_var(--kg-duration-spring)_var(--kg-ease-spring)]"
                : "animate-[kg-mode-toggle-turn_var(--kg-duration-spring)_var(--kg-ease-spring)]",
            )}
            aria-hidden="true"
          >
            {glyphs[value]}
          </span>
        }
        {...(props as HTMLAttributes<HTMLButtonElement>)}
      />
    )
  },
)

ModeToggle.displayName = "ModeToggle"
