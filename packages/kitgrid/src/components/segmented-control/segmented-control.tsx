"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useId,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"
import { resolveFieldControl, useField } from "../field/field.js"

export type SegmentedControlSize = "sm" | "md" | "lg"
export type SegmentedControlVariant = "default" | "pill" | "underline"

export interface SegmentedControlOption<T extends string = string> {
  value: T
  label?: ReactNode
  icon?: ReactNode
  disabled?: boolean
  /** Required when the option shows only an icon. */
  "aria-label"?: string
}

export interface SegmentedControlProps<T extends string = string> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  options: readonly SegmentedControlOption<T>[]
  value?: T
  /** Defaults to the first enabled option. */
  defaultValue?: T
  onValueChange?: (value: T) => void
  size?: SegmentedControlSize
  variant?: SegmentedControlVariant
  /** Stretch to the container, splitting the width evenly between options. */
  fullWidth?: boolean
  disabled?: boolean
  /** Native radio `name`, to submit the value with a form. Generated when omitted. */
  name?: string
}

/*
 * Paper Layers: a white tray with an ink edge; the thumb is an ink fill clipped to the chosen
 * item, which reads in mint. Underline drops the tray and slides an ink bar instead.
 */
export const segmentedControlVariants = variants({
  base: [
    "kg-segmented-control relative isolate items-stretch max-w-full h-(--_h) p-(--_pad)",
    "text-(length:--_text) text-kg-fg-muted select-none [-webkit-tap-highlight-color:transparent]",
    "data-disabled:opacity-50",
  ],
  variants: {
    variant: {
      default: "gap-[2px] bg-kg-surface border-2 border-kg-ink rounded-(--_radius)",
      pill: "gap-[2px] bg-kg-surface border-2 border-kg-ink rounded-(--_radius)",
      underline: "gap-1 bg-transparent shadow-[inset_0_-2px_0_var(--kg-border)]",
    },
    size: {
      sm: "[--_h:var(--kg-control-sm)] [--_text:var(--kg-text-xs)] [--_item-px:calc(var(--kg-space)*2.5)]",
      md: "[--_h:var(--kg-control-md)] [--_text:var(--kg-text-sm)] [--_item-px:calc(var(--kg-space)*3.5)]",
      lg: "[--_h:var(--kg-control-lg)] [--_text:var(--kg-text-base)] [--_item-px:calc(var(--kg-space)*4.5)]",
    },
    fullWidth: {
      true: "flex w-full",
      false: "inline-flex",
    },
  },
  defaults: { variant: "default", size: "md", fullWidth: false },
})

const PAD: Record<SegmentedControlSize, number> = { sm: 3, md: 3, lg: 4 }
const RADIUS: Record<SegmentedControlSize, string> = {
  sm: "var(--kg-radius-sm)",
  md: "var(--kg-radius-md)",
  lg: "var(--kg-radius-md)",
}

/** Tray padding and radii; an item's corner is the tray's, less its edge and padding. */
const geometry = (variant: SegmentedControlVariant, size: SegmentedControlSize) => {
  if (variant === "underline") return { "--_pad": "0px", "--_item-radius": "0px" }
  const pad = PAD[size]
  const radius = variant === "pill" ? "9999px" : RADIUS[size]
  return {
    "--_pad": `${pad}px`,
    "--_radius": radius,
    "--_item-radius": `max(0px, calc(${radius} - ${pad + 2}px))`,
  }
}

const SegmentedControlImpl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  (
    {
      options,
      value: valueProp,
      defaultValue,
      onValueChange,
      size = "md",
      variant = "default",
      fullWidth = false,
      disabled: disabledProp,
      name,
      className,
      style,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    forwardedRef,
  ) => {
    const field = useField()
    const control = resolveFieldControl(field, {
      disabled: disabledProp,
      "aria-describedby": ariaDescribedBy,
    })
    const generatedName = useId()
    const [value, setValue] = useControllableState<string>({
      value: valueProp,
      defaultValue:
        defaultValue ?? options.find((option) => !option.disabled)?.value ?? "",
      onChange: onValueChange,
    })
    const underline = variant === "underline"
    const root = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(root, forwardedRef)

    // The thumb is one layer clipped to the selected item's box. Animating `clip-path` keeps
    // the corner radius true at every width, which a scaled element can't do.
    useIsomorphicLayoutEffect(() => {
      const node = root.current
      if (!node) return
      let frame = 0
      const place = () => {
        const item = node.querySelector<HTMLElement>('[data-state="checked"]')
        if (!item) {
          node.style.removeProperty("--_clip")
          return
        }
        const top = item.offsetTop
        const left = item.offsetLeft
        const right = node.clientWidth - left - item.offsetWidth
        const bottom = node.clientHeight - top - item.offsetHeight
        node.style.setProperty(
          "--_clip",
          `inset(${top}px ${right}px ${bottom}px ${left}px round var(--_item-radius))`,
        )
      }
      place()
      // Enable the transition only after the first placement, so it never slides in on load.
      if (!("ready" in node.dataset)) {
        frame = requestAnimationFrame(() => {
          node.dataset.ready = ""
        })
      }
      const observer = new ResizeObserver(place)
      observer.observe(node)
      for (const item of node.querySelectorAll(".kg-segmented-control__item")) {
        observer.observe(item)
      }
      return () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
      }
    }, [value, options])

    return (
      <div
        ref={ref}
        role="radiogroup"
        id={control.id}
        className={segmentedControlVariants({ variant, size, fullWidth, className })}
        style={{ ...geometry(variant, size), ...style } as CSSProperties}
        data-size={size}
        data-variant={variant}
        data-full-width={fullWidth || undefined}
        data-disabled={control.disabled || undefined}
        aria-labelledby={ariaLabelledBy ?? control.labelId}
        aria-describedby={control.describedBy}
        aria-disabled={control.disabled || undefined}
        {...props}
      >
        <span
          className="kg-segmented-control__indicator absolute inset-0 -z-1 pointer-events-none"
          aria-hidden="true"
        >
          <span
            className={cx(
              "kg-segmented-control__thumb absolute inset-0 opacity-0 [clip-path:var(--_clip,inset(50%_round_0))]",
              underline ? "shadow-[inset_0_-2px_0_var(--kg-ink)]" : "bg-kg-accent",
              "[.kg-segmented-control[data-ready]_&]:opacity-100",
              "[.kg-segmented-control[data-ready]_&]:transition-[clip-path,opacity]",
              "duration-(--kg-duration-slow) ease-kg-out",
            )}
          />
        </span>
        {options.map((option) => {
          const checked = option.value === value
          const disabled = control.disabled || Boolean(option.disabled)
          return (
            <label
              key={option.value}
              className={cx(
                "kg-segmented-control__item relative inline-flex items-center justify-center gap-1.5 min-w-0 px-(--_item-px)",
                "font-[550] leading-none whitespace-nowrap rounded-(--_item-radius) cursor-pointer",
                "transition-[color,background-color] duration-(--kg-duration-fast) ease-kg-out",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-kg-ring",
                "data-disabled:cursor-not-allowed data-disabled:opacity-50",
                "[&>:not(input)]:transition-[scale] [&>:not(input)]:duration-(--kg-duration-fast) [&>:not(input)]:ease-kg-out",
                "not-data-disabled:active:[&>:not(input)]:scale-94",
                fullWidth && "flex-[1_1_0]",
                checked
                  ? cx(
                      underline ? "text-kg-fg" : "text-kg-accent-fg",
                      underline
                        ? "[.kg-segmented-control:not([data-ready])>&]:shadow-[inset_0_-2px_0_var(--kg-ink)]"
                        : "[.kg-segmented-control:not([data-ready])>&]:bg-kg-accent",
                    )
                  : cx(
                      "not-data-disabled:hover:text-kg-fg",
                      variant === "pill" && "not-data-disabled:hover:bg-kg-muted",
                    ),
              )}
              data-state={checked ? "checked" : "unchecked"}
              data-disabled={disabled || undefined}
            >
              <input
                type="radio"
                className="kg-segmented-control__input absolute inset-0 size-full m-0 opacity-0 cursor-[inherit]"
                name={name ?? generatedName}
                value={option.value}
                checked={checked}
                disabled={disabled}
                aria-label={option["aria-label"]}
                onChange={(event) => {
                  if (event.currentTarget.checked) setValue(option.value)
                }}
              />
              {option.icon != null && (
                <span className="kg-segmented-control__icon inline-flex [&_svg]:size-[1.15em]" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              {option.label != null && (
                <span className="kg-segmented-control__label overflow-hidden text-ellipsis">{option.label}</span>
              )}
            </label>
          )
        })}
      </div>
    )
  },
)

SegmentedControlImpl.displayName = "SegmentedControl"

/**
 * A single-choice radiogroup with a thumb that springs between options. Built on native radios,
 * so arrow keys select and the value submits with a form.
 */
export const SegmentedControl = SegmentedControlImpl as unknown as (<
  T extends string = string,
>(
  props: SegmentedControlProps<T> & RefAttributes<HTMLDivElement>,
) => ReactElement | null) & { displayName?: string }
