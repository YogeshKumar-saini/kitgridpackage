"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { FieldContext, useField } from "../field/field.js"
import { Switch, type SwitchSize } from "../switch/switch.js"

export interface SwitchGroupOption {
  value: string
  label: ReactNode
  description?: ReactNode
  /** Decorative, shown before the text. */
  icon?: ReactNode
  disabled?: boolean
}

export interface SwitchGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  options: readonly SwitchGroupOption[]
  /** Values of the switches that are on. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** Names the group for assistive tech. */
  label?: string
  size?: SwitchSize
  disabled?: boolean
  /** Submits every value that is on under this name. */
  name?: string
}

/** A settings list: one labelled switch per row, on a single card, reporting what is on. */
export const SwitchGroup = forwardRef<HTMLDivElement, SwitchGroupProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue = [],
      onValueChange,
      label,
      size = "md",
      disabled,
      name,
      className,
      ...props
    },
    ref,
  ) => {
    const field = useField()
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const baseId = useId()
    const isDisabled = disabled ?? field?.disabled ?? false

    return (
      <div
        ref={ref}
        role="group"
        aria-label={label}
        aria-labelledby={label ? undefined : field?.labelId}
        aria-describedby={field?.describedBy}
        className={cx(
          "kg-switch-group grid w-full overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface shadow-kg-sm",
          "divide-y-2 divide-kg-border",
          className,
        )}
        data-size={size}
        {...props}
      >
        {/* Each switch takes its own id instead of the surrounding Field's. */}
        <FieldContext.Provider value={null}>
          {options.map((option) => (
            <div
              key={option.value}
              className={cx(
                "kg-switch-group__row group/row flex items-center gap-3 px-4 py-3.5",
                "transition-[background-color] duration-(--kg-duration-fast) ease-kg-out",
                "hover:not-data-disabled:bg-kg-muted/55",
              )}
              data-disabled={option.disabled || isDisabled || undefined}
            >
              {option.icon != null && (
                <span
                  className={cx(
                    "kg-switch-group__icon inline-grid place-items-center shrink-0 size-8 rounded-kg-md",
                    "bg-kg-muted text-kg-fg-muted [&_svg]:size-4",
                    "transition-[background-color,color] duration-(--kg-duration-base) ease-kg-out",
                    "group-has-checked/row:bg-kg-accent group-has-checked/row:text-kg-accent-fg",
                  )}
                  aria-hidden="true"
                >
                  {option.icon}
                </span>
              )}
              <Switch
                id={`${baseId}-${option.value}`}
                size={size}
                labelPosition="start"
                label={option.label}
                description={option.description}
                name={name}
                value={option.value}
                disabled={option.disabled || isDisabled}
                checked={value.includes(option.value)}
                onCheckedChange={(on) =>
                  setValue(
                    on
                      ? [...value, option.value]
                      : value.filter((v) => v !== option.value),
                  )
                }
                className="kg-switch-group__switch flex-1 min-w-0"
              />
            </div>
          ))}
        </FieldContext.Provider>
      </div>
    )
  },
)

SwitchGroup.displayName = "SwitchGroup"
