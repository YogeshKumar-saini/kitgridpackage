"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  version,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useDismiss } from "../../hooks/use-dismiss.js"
import { ROVING_ITEM_SELECTOR, useRovingFocus } from "../../hooks/use-roving-focus.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import type { FloatingActionButtonPlacement } from "../floating-action-button/floating-action-button.js"

// React 18 only renders `inert` as a string attribute; React 19 expects a boolean.
const inertProps = (
  Number.parseInt(version, 10) >= 19 ? { inert: true } : { inert: "" }
) as HTMLAttributes<HTMLElement>

export type SpeedDialLayout = "radial" | "up" | "left"

export interface SpeedDialAction {
  label: string
  icon: ReactNode
  onSelect?: () => void
  disabled?: boolean
}

export interface SpeedDialProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  actions: SpeedDialAction[]
  /** Accessible name of the main button. */
  label?: string
  /** Main button glyph. Rotates 45° when open, so a plus becomes a close cross. */
  icon?: ReactNode
  /** `radial` fans the actions on an arc; `up` and `left` stack them. */
  layout?: SpeedDialLayout
  placement?: FloatingActionButtonPlacement
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const RADIUS = 5.25
const GAP = 3.5

/* Where each action lands, in rem from the main button: on an arc, or stacked up or left. */
const actionOffset = (
  layout: SpeedDialLayout,
  placement: FloatingActionButtonPlacement,
  index: number,
  count: number,
) => {
  if (layout === "up") return { x: 0, y: -GAP * (index + 1) }
  if (layout === "left") return { x: -GAP * (index + 1), y: 0 }
  const from = placement === "bottom-start" ? 270 : 180
  const sweep = placement === "bottom-center" ? 180 : 90
  const angle = ((from + (sweep * index) / Math.max(count - 1, 1)) * Math.PI) / 180
  return { x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS }
}

const rootClass = [
  "kg-speed-dial group/dial relative inline-grid size-[3.5rem]",
  "data-[placement^=bottom]:fixed data-[placement^=bottom]:z-40 data-[placement^=bottom]:bottom-[max(calc(var(--kg-space)*6),env(safe-area-inset-bottom))]",
  "data-[placement=bottom-end]:end-6 data-[placement=bottom-start]:start-6",
  "data-[placement=bottom-center]:inset-x-0 data-[placement=bottom-center]:mx-auto",
]

const mainClass = [
  "kg-speed-dial__main relative z-1 grid size-[3.5rem] place-items-center p-0 cursor-pointer",
  "text-kg-accent-fg bg-kg-accent border-2 border-kg-ink rounded-full shadow-[4px_4px_0_var(--kg-paper-sage)]",
  "transition-[translate,box-shadow] duration-(--kg-duration-base) ease-kg-out",
  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-kg-ring",
]

/* The dashed ring the radial actions sit on, drawn only while open. */
const ringClass = [
  "before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:size-[10.5rem] before:content-['']",
  "before:-translate-1/2 before:scale-30 before:rounded-full before:border before:border-dashed before:border-kg-border-strong before:opacity-0",
  "before:transition-[scale,opacity] before:duration-(--kg-duration-slow) before:ease-kg-out",
  "group-data-[state=open]/dial:before:scale-100 group-data-[state=open]/dial:before:opacity-60",
]

const actionClass = [
  "kg-speed-dial__action group/action absolute top-[0.375rem] left-[0.375rem] grid size-[2.75rem] place-items-center p-0 cursor-pointer",
  "text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-full shadow-kg-sm opacity-0",
  "[transform:scale(0.4)_rotate(-90deg)]",
  "[transition:transform_var(--kg-duration-base)_var(--kg-ease-in),opacity_var(--kg-duration-fast)_var(--kg-ease-in),background-color_var(--kg-duration-fast)_var(--kg-ease-out)]",
  "hover:bg-kg-paper-sage focus-visible:bg-kg-paper-sage disabled:cursor-not-allowed disabled:text-kg-fg-faint",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
  "group-data-[state=open]/dial:opacity-100 group-data-[state=open]/dial:[transform:translate(var(--_x),var(--_y))]",
  "group-data-[state=open]/dial:[transition:transform_var(--kg-duration-slow)_var(--kg-ease-out)_calc(var(--_i)*40ms),opacity_var(--kg-duration-base)_var(--kg-ease-out)_calc(var(--_i)*40ms),background-color_var(--kg-duration-fast)_var(--kg-ease-out)]",
]

const tipClass = [
  "kg-speed-dial__tip pointer-events-none absolute px-2 py-1 text-kg-xs font-medium whitespace-nowrap",
  "text-kg-surface bg-kg-fg rounded-kg-sm opacity-0 transition-[opacity,translate] duration-(--kg-duration-fast) ease-kg-out",
  "group-hover/action:translate-0 group-hover/action:opacity-100 group-focus-visible/action:translate-0 group-focus-visible/action:opacity-100",
]

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
)

/** A floating action button that expands into a few related actions. */
export const SpeedDial = forwardRef<HTMLDivElement, SpeedDialProps>(
  (
    {
      actions,
      label = "Quick actions",
      icon,
      layout = "radial",
      placement = "bottom-end",
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const root = useRef<HTMLDivElement>(null)
    const main = useRef<HTMLButtonElement>(null)
    const list = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(root, forwardedRef)
    const id = useId()
    const rove = useRovingFocus({
      orientation: layout === "left" ? "horizontal" : "both",
      loop: true,
    })
    const focusOnOpen = useRef(false)

    useDismiss({
      enabled: open,
      refs: [root],
      onDismiss: (reason) => {
        setOpen(false)
        if (reason === "escape") main.current?.focus()
      },
    })

    useEffect(() => {
      if (!open || !focusOnOpen.current) return
      focusOnOpen.current = false
      list.current?.querySelector<HTMLElement>(ROVING_ITEM_SELECTOR)?.focus()
    }, [open])

    return (
      <div
        ref={ref}
        className={cx(rootClass, className)}
        data-layout={layout}
        data-placement={placement}
        data-state={open ? "open" : "closed"}
        style={{ "--_n": actions.length } as CSSProperties}
        {...props}
      >
        <div
          ref={list}
          id={`${id}-actions`}
          role="group"
          aria-label={label}
          className={cx("kg-speed-dial__actions absolute inset-0", layout === "radial" && ringClass)}
          {...(open ? null : inertProps)}
          onKeyDown={rove}
        >
          {actions.map((action, index) => {
            const offset = actionOffset(layout, placement, index, actions.length)
            return (
            <button
              key={action.label}
              type="button"
              className={cx(actionClass)}
              aria-label={action.label}
              disabled={action.disabled}
              data-kg-item=""
              style={
                {
                  "--_i": index,
                  "--_x": `${offset.x.toFixed(3)}rem`,
                  "--_y": `${offset.y.toFixed(3)}rem`,
                } as CSSProperties
              }
              onClick={() => {
                action.onSelect?.()
                setOpen(false)
                main.current?.focus()
              }}
            >
              <span className="kg-speed-dial__glyph grid size-[1.125rem] [&_svg]:size-full" aria-hidden="true">
                {action.icon}
              </span>
              <span
                className={cx(
                  tipClass,
                  layout === "left"
                    ? "bottom-[calc(100%+var(--kg-space)*2)] translate-y-[4px]"
                    : "right-[calc(100%+var(--kg-space)*2)] translate-x-[4px]",
                )}
                aria-hidden="true"
              >
                {action.label}
              </span>
            </button>
            )
          })}
        </div>
        <button
          ref={main}
          type="button"
          className={cx(mainClass)}
          aria-label={label}
          aria-expanded={open}
          aria-controls={`${id}-actions`}
          onClick={(event) => {
            focusOnOpen.current = !open && event.detail === 0
            setOpen(!open)
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
              event.preventDefault()
              focusOnOpen.current = true
              if (open) list.current?.querySelector<HTMLElement>(ROVING_ITEM_SELECTOR)?.focus()
              else setOpen(true)
            }
          }}
        >
          <span
            className="kg-speed-dial__main-icon grid size-[1.5rem] transition-[rotate] duration-(--kg-duration-slow) ease-kg-out group-data-[state=open]/dial:rotate-135 [&_svg]:size-full"
            aria-hidden="true"
          >
            {icon ?? <PlusIcon />}
          </span>
        </button>
      </div>
    )
  },
)

SpeedDial.displayName = "SpeedDial"
