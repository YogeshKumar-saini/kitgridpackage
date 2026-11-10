"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useState } from "react"
import { cx } from "../../utils/cx.js"
import { Switch } from "../switch/switch.js"

export interface FeatureFlagListFlag {
  id: string
  name: string
  /** The code key, e.g. `new-billing-page`. */
  flagKey?: string
  /** On or off per environment id. */
  enabled: Readonly<Record<string, boolean>>
  /** Rollout percentage for the current environment, shown beside the switch. */
  rollout?: number
}

export interface FeatureFlagListEnvironment {
  id: string
  label: string
}

export interface FeatureFlagListProps
  extends Omit<HTMLAttributes<HTMLUListElement>, "onToggle"> {
  flags: readonly FeatureFlagListFlag[]
  environments: readonly FeatureFlagListEnvironment[]
  /** The environment the switches control. The tags show every environment. */
  environment: string
  onToggle?: (flagId: string, environment: string, enabled: boolean) => void
  /** Shown when the list is empty. */
  empty?: ReactNode
  onLabel?: string
  offLabel?: string
}

/**
 * Feature flags with one switch for the environment in view and a tag per environment, so
 * drift between staging and production is visible at a glance.
 */
export const FeatureFlagList = forwardRef<HTMLUListElement, FeatureFlagListProps>(
  (
    {
      flags,
      environments,
      environment,
      onToggle,
      empty,
      onLabel = "on",
      offLabel = "off",
      className,
      ...props
    },
    ref,
  ) => {
    const [overrides, setOverrides] = useState<Record<string, boolean>>({})
    const stateOf = (flag: FeatureFlagListFlag, env: string) =>
      overrides[`${flag.id}:${env}`] ?? flag.enabled[env] ?? false
    const envLabel = environments.find((env) => env.id === environment)?.label ?? environment

    if (flags.length === 0 && empty != null)
      return (
        <div className="kg-feature-flag-list__empty py-8 text-center text-kg-fg-muted">{empty}</div>
      )

    return (
      <ul
        ref={ref}
        className={cx("kg-feature-flag-list @container m-0 grid min-w-0 list-none p-0", className)}
        {...props}
      >
        {flags.map((flag) => {
          const on = stateOf(flag, environment)
          return (
            <li
              key={flag.id}
              className={cx(
                "kg-feature-flag-list__item grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-4 border-b border-kg-border px-2 py-3 last:border-b-0",
                "[&>.kg-feature-flag-list__switch]:col-start-4",
                "@max-[34rem]:grid-cols-[minmax(0,1fr)_auto] @max-[34rem]:gap-y-2",
                "@max-[34rem]:[&>.kg-feature-flag-list__switch]:col-start-2 @max-[34rem]:[&>.kg-feature-flag-list__switch]:row-[1/span_2]",
              )}
              data-enabled={on || undefined}
            >
              <div className="kg-feature-flag-list__who grid min-w-0 gap-[0.125rem]">
                <span className="kg-feature-flag-list__name truncate text-kg-sm font-[560] text-kg-fg">
                  {flag.name}
                </span>
                {flag.flagKey && (
                  <code className="kg-feature-flag-list__key truncate rounded-none bg-transparent p-0 font-kg-mono text-kg-xs text-kg-fg-faint">
                    {flag.flagKey}
                  </code>
                )}
              </div>
              <ul
                className="kg-feature-flag-list__envs m-0 flex list-none gap-1 p-0 @max-[34rem]:col-start-1 @max-[34rem]:row-start-2 @max-[34rem]:flex-wrap"
                aria-label={`${flag.name} by environment`}
              >
                {environments.map((env) => {
                  const envOn = stateOf(flag, env.id)
                  const current = env.id === environment
                  return (
                    <li
                      key={env.id}
                      className={cx(
                        "kg-feature-flag-list__env inline-flex h-[1.375rem] items-center gap-1.25 rounded-full border-2 px-2",
                        "text-[0.6875rem] font-[540] whitespace-nowrap transition-[color,background-color] duration-(--kg-duration-fast) ease-kg-out",
                        envOn
                          ? "border-kg-ink bg-kg-paper-sage text-kg-fg"
                          : "border-dashed border-kg-border-strong bg-transparent text-kg-fg-faint",
                        current && "shadow-kg-xs",
                      )}
                      data-on={envOn || undefined}
                      data-current={current || undefined}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          "kg-feature-flag-list__env-dot size-[0.375rem] rounded-full border-[1.5px]",
                          "transition-[scale] duration-[var(--kg-duration-spring)] ease-kg-out",
                          envOn ? "scale-115 border-kg-ink bg-kg-success" : "border-current",
                        )}
                      />
                      {env.label}
                      <span className="kg-visually-hidden">: {envOn ? onLabel : offLabel}</span>
                    </li>
                  )
                })}
              </ul>
              {flag.rollout != null && on && (
                <span className="kg-feature-flag-list__rollout text-kg-xs font-semibold tabular-nums text-kg-fg-muted @max-[34rem]:hidden">
                  {flag.rollout}%
                </span>
              )}
              <Switch
                className="kg-feature-flag-list__switch"
                size="sm"
                checked={on}
                aria-label={`${flag.name} in ${envLabel}`}
                onCheckedChange={(next) => {
                  setOverrides((prev) => ({ ...prev, [`${flag.id}:${environment}`]: next }))
                  onToggle?.(flag.id, environment, next)
                }}
              />
            </li>
          )
        })}
      </ul>
    )
  },
)

FeatureFlagList.displayName = "FeatureFlagList"
