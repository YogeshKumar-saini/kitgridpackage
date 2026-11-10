"use client"

import {
  type ButtonHTMLAttributes,
  forwardRef,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

const buttonClass = [
  "kg-back-to-top group/top relative grid size-[3rem] place-items-center p-0 cursor-pointer",
  "text-kg-fg bg-kg-surface border-0 rounded-full shadow-kg-sm",
  "transition-[opacity,translate,scale] duration-(--kg-duration-base) ease-kg-out",
  "data-[placement^=bottom]:fixed data-[placement^=bottom]:z-40 data-[placement^=bottom]:bottom-[max(calc(var(--kg-space)*6),env(safe-area-inset-bottom))]",
  "data-[placement=bottom-end]:end-6 data-[placement=bottom-start]:start-6",
  "data-[state=hidden]:pointer-events-none data-[state=hidden]:translate-y-[12px] data-[state=hidden]:scale-90 data-[state=hidden]:opacity-0",
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-kg-ring",
]

export type BackToTopPlacement = "bottom-end" | "bottom-start" | "static"

export interface BackToTopProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Scroll distance before the button appears, in px. */
  threshold?: number
  /** Scrolling container. Defaults to the window. */
  root?: RefObject<HTMLElement | null>
  placement?: BackToTopPlacement
  /** Accessible name. */
  label?: string
}

/** Appears after scrolling, rings its edge with reading progress, and returns to the top. */
export const BackToTop = forwardRef<HTMLButtonElement, BackToTopProps>(
  (
    {
      threshold = 400,
      root,
      placement = "bottom-end",
      label = "Back to top",
      className,
      onClick,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLButtonElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const [visible, setVisible] = useState(false)
    const reduced = useReducedMotion()

    useEffect(() => {
      const container = root?.current ?? null
      const target: HTMLElement | Window = container ?? window
      let frame = 0
      const update = () => {
        const top = container ? container.scrollTop : window.scrollY
        const max = container
          ? container.scrollHeight - container.clientHeight
          : document.documentElement.scrollHeight - window.innerHeight
        const progress = max > 0 ? Math.min(1, top / max) : 0
        local.current?.style.setProperty("--_progress", String(progress))
        local.current?.style.setProperty("--_dashoffset", String(100 - progress * 100))
        setVisible(top > threshold)
      }
      const schedule = () => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(update)
      }
      update()
      target.addEventListener("scroll", schedule, { passive: true })
      return () => {
        cancelAnimationFrame(frame)
        target.removeEventListener("scroll", schedule)
      }
    }, [root, threshold])

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cx(buttonClass, className)}
        data-placement={placement}
        data-state={visible ? "visible" : "hidden"}
        tabIndex={visible ? undefined : -1}
        aria-hidden={visible ? undefined : true}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented) return
          const container = root?.current
          const behavior: ScrollBehavior = reduced ? "auto" : "smooth"
          if (container) container.scrollTo?.({ top: 0, behavior })
          else window.scrollTo?.({ top: 0, behavior })
          // Hand focus to the top of the page rather than leaving it on a vanishing button.
          const first = (container ?? document.body).querySelector<HTMLElement>(
            "h1, [tabindex='-1'], main",
          )
          first?.focus?.({ preventScroll: true })
        }}
        {...props}
      >
        <svg className="kg-back-to-top__ring absolute inset-0 size-full -rotate-90 fill-none stroke-[2.5]" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="22" pathLength={100} className="kg-back-to-top__track stroke-kg-border" />
          <circle cx="24" cy="24" r="22" pathLength={100} className="kg-back-to-top__value stroke-kg-ink [stroke-dasharray:100] [stroke-dashoffset:var(--_dashoffset,100)] [stroke-linecap:round]" />
        </svg>
        <svg
          className="kg-back-to-top__arrow size-[1.125rem] transition-transform duration-(--kg-duration-base) ease-kg-out group-hover/top:-translate-y-[2px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    )
  },
)

BackToTop.displayName = "BackToTop"
