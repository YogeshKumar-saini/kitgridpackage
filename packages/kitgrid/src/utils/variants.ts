import { type ClassValue, cx } from "./cx.js"

type VariantMap = Record<string, Record<string, ClassValue>>

type OptionKey<T> = T extends "true" | "false" ? boolean | T : T

export type VariantChoices<V extends VariantMap> = {
  [K in keyof V]?: OptionKey<keyof V[K] & string>
}

export interface VariantsConfig<V extends VariantMap> {
  base?: ClassValue
  variants: V
  defaults?: VariantChoices<V>
  /** Extra classes when every listed variant matches. */
  compound?: (VariantChoices<V> & { class: ClassValue })[]
}

export type VariantFn<V extends VariantMap> = (
  props?: VariantChoices<V> & { className?: ClassValue },
) => string

/** The props a `variants()` function accepts, for a component's prop interface. */
export type VariantProps<F> = F extends VariantFn<infer V> ? VariantChoices<V> : never

/**
 * Typed class recipes without a runtime dependency: option names are inferred from the
 * config, so `button({ size: "xl" })` is a type error when `xl` isn't defined.
 */
export const variants =
  <V extends VariantMap>(config: VariantsConfig<V>): VariantFn<V> =>
  (props = {}) => {
    const picked: Record<string, string | undefined> = {}
    for (const key of Object.keys(config.variants)) {
      const value = props[key] ?? config.defaults?.[key]
      picked[key] = value === undefined ? undefined : String(value)
    }
    const classes: ClassValue[] = [config.base]
    for (const [key, value] of Object.entries(picked)) {
      if (value !== undefined) classes.push(config.variants[key]?.[value])
    }
    for (const { class: extra, ...when } of config.compound ?? []) {
      const matches = Object.entries(when).every(
        ([key, value]) => picked[key] === String(value),
      )
      if (matches) classes.push(extra)
    }
    classes.push(props.className)
    return cx(...classes)
  }
