export type VariantPickerValue = string | number

/** One purchasable combination (a SKU), e.g. `{ options: { color: "sage", size: "M" }, quantity: 3 }`. */
export interface VariantCombination {
  /** Option name → value. */
  options: Readonly<Record<string, VariantPickerValue>>
  /** Explicit stock flag. When omitted, `quantity > 0` decides, and no quantity means in stock. */
  available?: boolean
  quantity?: number
}

/** The shopper's current choice per option name; `null`/missing means not chosen yet. */
export type VariantSelection = Readonly<
  Record<string, VariantPickerValue | null | undefined>
>

/** Option name → stringified value → whether choosing it can still lead to an in-stock SKU. */
export type VariantAvailability = Record<string, Record<string, boolean>>

const inStock = (variant: VariantCombination): boolean =>
  variant.available ?? (variant.quantity === undefined || variant.quantity > 0)

const same = (
  a: VariantPickerValue | null | undefined,
  b: VariantPickerValue | undefined,
) => a != null && b !== undefined && String(a) === String(b)

/**
 * For every option value, whether some in-stock variant has that value **and** agrees with what
 * is selected for every other option. Each option ignores its own selection, so a shopper can
 * always switch color without first clearing size. Values that appear in no variant are absent;
 * treat a missing entry as unavailable.
 */
export const resolveVariantAvailability = (
  selected: VariantSelection,
  variants: readonly VariantCombination[],
): VariantAvailability => {
  const result: VariantAvailability = {}
  const chosen = Object.entries(selected).filter(([, value]) => value != null)

  for (const variant of variants) {
    const stocked = inStock(variant)
    for (const [name, value] of Object.entries(variant.options)) {
      const bucket = (result[name] ??= {})
      const key = String(value)
      if (bucket[key]) continue
      bucket[key] =
        stocked &&
        chosen.every(
          ([other, choice]) => other === name || same(choice, variant.options[other]),
        )
    }
  }
  return result
}

/** The variant whose every option matches the selection, once the shopper has chosen them all. */
export const findVariant = <T extends VariantCombination>(
  selected: VariantSelection,
  variants: readonly T[],
): T | undefined =>
  variants.find((variant) =>
    Object.entries(variant.options).every(([name, value]) =>
      same(selected[name], value),
    ),
  )

/**
 * Merges one option's availability (`resolveVariantAvailability(...)[name]`) into picker
 * options. Options already marked unavailable stay unavailable.
 */
export const withVariantAvailability = <
  O extends { value: VariantPickerValue; available?: boolean },
>(
  options: readonly O[],
  availability: Readonly<Record<string, boolean>> | undefined,
): O[] =>
  availability === undefined
    ? [...options]
    : options.map((option) => ({
        ...option,
        available:
          option.available !== false && availability[String(option.value)] === true,
      }))
