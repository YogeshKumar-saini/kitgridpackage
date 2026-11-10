"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId, useRef, useState } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { variants } from "../../utils/variants.js"
import { Button } from "../button/button.js"
import { Switch } from "../switch/switch.js"

export interface CookieBannerCategory {
  id: string
  label: string
  /** One short line. */
  description?: string
  /** Strictly necessary: always on and not switchable. */
  required?: boolean
}

/*
 * Paper Layers: a white sheet with an ink edge and a large offset shadow, fixed to the viewport
 * or in flow. It tips up into place on entry.
 */
export const cookieBannerVariants = variants({
  base: [
    "kg-cookie-banner grid gap-4 w-[min(100%-2rem,34rem)] p-5 z-kg-toast",
    "rounded-kg-xl border-2 border-kg-ink bg-kg-surface text-kg-fg shadow-kg-lg",
    "animate-[kg-cookie-enter_var(--kg-duration-spring)_var(--kg-ease-out)]",
  ],
  variants: {
    position: {
      bottom: "fixed bottom-4 left-1/2 -translate-x-1/2",
      "bottom-start": "fixed bottom-4 start-4",
      inline: "relative",
    },
  },
  defaults: { position: "bottom" },
})

const choice = "kg-cookie-banner__choice flex grow-0 shrink basis-[8.5rem]"

export type CookieBannerConsent = Record<string, boolean>
export type CookieBannerPosition = "bottom" | "bottom-start" | "inline"

export interface CookieBannerLabels {
  title?: string
  acceptAll?: string
  rejectAll?: string
  customize?: string
  save?: string
  back?: string
  alwaysOn?: string
}

export interface CookieBannerProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  categories: readonly CookieBannerCategory[]
  /** Called with every category's choice, whichever button was used. */
  onConsent: (consent: CookieBannerConsent) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Initial switch positions in the preferences view. Optional categories default to off. */
  defaultConsent?: CookieBannerConsent
  /** `inline` renders in flow instead of fixed to the viewport. */
  position?: CookieBannerPosition
  /** One short sentence; link your policy here. */
  children?: ReactNode
  labels?: CookieBannerLabels
}

const defaultLabels: Required<CookieBannerLabels> = {
  title: "Cookies",
  acceptAll: "Accept all",
  rejectAll: "Reject all",
  customize: "Customize",
  save: "Save choices",
  back: "Back",
  alwaysOn: "Always on",
}

/**
 * Consent banner with Accept and Reject given equal weight on the first layer, as EU regulators
 * expect, and a preferences view with one switch per category.
 */
export const CookieBanner = forwardRef<HTMLElement, CookieBannerProps>(
  (
    {
      categories,
      onConsent,
      open: openProp,
      defaultOpen = true,
      onOpenChange,
      defaultConsent,
      position = "bottom",
      children,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const id = useId()
    const listRef = useRef<HTMLUListElement>(null)
    const customizeRef = useRef<HTMLButtonElement>(null)
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const [view, setView] = useState<"summary" | "preferences">("summary")
    const [choices, setChoices] = useState<CookieBannerConsent>(() =>
      Object.fromEntries(
        categories.map((category) => [
          category.id,
          category.required ? true : (defaultConsent?.[category.id] ?? false),
        ]),
      ),
    )

    if (!open) return null

    const finish = (consent: CookieBannerConsent) => {
      onConsent(consent)
      setOpen(false)
    }

    const all = (value: boolean) =>
      Object.fromEntries(
        categories.map((category) => [category.id, category.required ? true : value]),
      )

    return (
      <section
        ref={ref}
        aria-labelledby={`${id}-title`}
        className={cookieBannerVariants({ position, className })}
        data-position={position}
        data-view={view}
        {...props}
      >
        <div className="kg-cookie-banner__body grid gap-2">
          <h2 id={`${id}-title`} className="kg-cookie-banner__title m-0 text-kg-md font-[650]">
            {text.title}
          </h2>
          {view === "summary" && children != null && (
            <div className="kg-cookie-banner__text text-kg-sm text-kg-fg-muted [&_p]:m-0 [&_a]:text-kg-accent-strong [&_a]:underline-offset-3">{children}</div>
          )}
          {view === "preferences" && (
            <ul
              className="kg-cookie-banner__list grid m-0 p-0 list-none animate-[kg-pop-in_var(--kg-duration-slow)_var(--kg-ease-out)]"
              ref={listRef}
            >
              {categories.map((category) => (
                <li key={category.id} className="kg-cookie-banner__category py-3 [&+&]:border-t [&+&]:border-kg-border">
                  <Switch
                    size="sm"
                    labelPosition="start"
                    label={category.label}
                    description={
                      category.required
                        ? [category.description, text.alwaysOn].filter(Boolean).join(". ")
                        : category.description
                    }
                    checked={choices[category.id] ?? false}
                    disabled={category.required}
                    onCheckedChange={(checked) =>
                      setChoices((current) => ({ ...current, [category.id]: checked }))
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="kg-cookie-banner__actions flex flex-wrap justify-end gap-2">
          {view === "summary" ? (
            <>
              <Button
                ref={customizeRef}
                variant="ghost"
                size="sm"
                className="kg-cookie-banner__customize me-auto"
                onClick={() => {
                  setView("preferences")
                  requestAnimationFrame(() =>
                    listRef.current
                      ?.querySelector<HTMLInputElement>("input:not(:disabled)")
                      ?.focus(),
                  )
                }}
              >
                {text.customize}
              </Button>
              <span className={choice}>
                <Button variant="outline" size="sm" fullWidth onClick={() => finish(all(false))}>
                  {text.rejectAll}
                </Button>
              </span>
              <span className={choice}>
                <Button variant="outline" size="sm" fullWidth onClick={() => finish(all(true))}>
                  {text.acceptAll}
                </Button>
              </span>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="kg-cookie-banner__customize me-auto"
                onClick={() => {
                  setView("summary")
                  requestAnimationFrame(() => customizeRef.current?.focus())
                }}
              >
                {text.back}
              </Button>
              <span className={choice}>
                <Button variant="outline" size="sm" fullWidth onClick={() => finish(all(false))}>
                  {text.rejectAll}
                </Button>
              </span>
              <span className={choice}>
                <Button variant="solid" size="sm" fullWidth onClick={() => finish(choices)}>
                  {text.save}
                </Button>
              </span>
            </>
          )}
        </div>
      </section>
    )
  },
)

CookieBanner.displayName = "CookieBanner"
