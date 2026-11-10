"use client"

import {
  type FieldsetHTMLAttributes,
  forwardRef,
  type ReactNode,
  type Ref,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { Field } from "../field/field.js"
import { Input, type InputProps } from "../input/input.js"
import { Select } from "../select/select.js"

export type AddressFormField =
  | "name"
  | "line1"
  | "line2"
  | "city"
  | "region"
  | "postalCode"
  | "phone"

export interface AddressFormValue {
  /** ISO 3166-1 alpha-2 code. */
  country: string
  name: string
  line1: string
  line2: string
  city: string
  region: string
  postalCode: string
  phone: string
}

export interface AddressFormCountry {
  code: string
  label: string
}

/** How a country labels and orders its address. Unknown countries use `DEFAULT`. */
export interface AddressFormFormat {
  region?: string | null
  regionOptional?: boolean
  postalCode?: string | null
  /** Postal code before the city, as in Germany and France. */
  postalFirst?: boolean
  /** Postal codes are digits only, so mobile shows a number pad. */
  numericPostal?: boolean
}

export const addressFormats: Record<string, AddressFormFormat> = {
  DEFAULT: { region: "Region", regionOptional: true, postalCode: "Postal code" },
  US: { region: "State", postalCode: "ZIP code", numericPostal: true },
  CA: { region: "Province", postalCode: "Postal code" },
  GB: { region: "County", regionOptional: true, postalCode: "Postcode" },
  AU: { region: "State or territory", postalCode: "Postcode", numericPostal: true },
  IN: { region: "State", postalCode: "PIN code", numericPostal: true },
  DE: { region: null, postalCode: "Postal code", postalFirst: true, numericPostal: true },
  FR: { region: null, postalCode: "Postal code", postalFirst: true, numericPostal: true },
  NL: { region: null, postalCode: "Postal code", postalFirst: true },
  JP: { region: "Prefecture", postalCode: "Postal code", postalFirst: true },
  SG: { region: null, postalCode: "Postal code", numericPostal: true },
  AE: { region: "Emirate", postalCode: null },
}

const defaultCountries: AddressFormCountry[] = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "IN", label: "India" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
  { code: "JP", label: "Japan" },
  { code: "SG", label: "Singapore" },
  { code: "AE", label: "United Arab Emirates" },
]

export interface AddressFormLabels {
  legend?: string
  country?: string
  name?: string
  line1?: string
  line2?: string
  addLine2?: string
  city?: string
  phone?: string
  optional?: string
}

const defaultLabels: Required<AddressFormLabels> = {
  legend: "Shipping address",
  country: "Country or region",
  name: "Full name",
  line1: "Address",
  line2: "Apartment, suite, etc.",
  addLine2: "Add apartment, suite, etc.",
  city: "City",
  phone: "Phone",
  optional: "optional",
}

export const emptyAddress = (country = "US"): AddressFormValue => ({
  country,
  name: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  phone: "",
})

export interface AddressFormProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  "defaultValue" | "onChange"
> {
  value?: AddressFormValue
  defaultValue?: AddressFormValue
  onValueChange?: (value: AddressFormValue) => void
  countries?: readonly AddressFormCountry[]
  /** Error message per field, e.g. from server validation. */
  errors?: Partial<Record<AddressFormField, ReactNode>>
  /** Ask for a phone number (for the courier). */
  withPhone?: boolean
  /** Prefix for input names, so two forms can submit together: "shipping" gives "shipping-city". */
  namePrefix?: string
  /** `billing` switches autocomplete tokens to the billing section. */
  section?: "shipping" | "billing"
  /** Show the legend visibly. */
  showLegend?: boolean
  labels?: AddressFormLabels
}

/**
 * Address fields that relabel and reorder for the chosen country (ZIP, postcode or PIN code,
 * state or county, postal code before city), with full autocomplete tokens and the second
 * address line tucked behind a link.
 */
export const AddressForm = forwardRef<HTMLFieldSetElement, AddressFormProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      countries = defaultCountries,
      errors = {},
      withPhone = false,
      namePrefix,
      section = "shipping",
      showLegend = false,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const [value, setValue] = useControllableState<AddressFormValue>({
      value: valueProp,
      defaultValue: defaultValue ?? emptyAddress(countries[0]?.code),
      onChange: onValueChange,
    })
    const [showLine2, setShowLine2] = useState(() => Boolean(value.line2))
    const line2Ref = useRef<HTMLInputElement>(null)
    const format = addressFormats[value.country] ?? addressFormats.DEFAULT ?? {}

    const set = (field: keyof AddressFormValue) => (next: string) =>
      setValue((current) => ({ ...current, [field]: next }))
    const auto = (token: string) => `${section} ${token}`
    const named = (field: string) => (namePrefix ? `${namePrefix}-${field}` : field)
    const optional = (label: string) => `${label} (${text.optional})`

    const input = (
      field: AddressFormField,
      label: string,
      token: string,
      extra: InputProps & { ref?: Ref<HTMLInputElement> } = {},
      required = true,
    ) => (
      <Field
        key={field}
        label={required ? label : optional(label)}
        error={errors[field]}
        required={required}
        className={cx(
          `kg-address-form__field kg-address-form__field--${field}`,
          field === "city" && count === 3 && "max-[30rem]:col-span-full",
        )}
      >
        <Input
          name={named(field)}
          autoComplete={auto(token)}
          value={value[field]}
          onChange={(event) => set(field)(event.target.value)}
          {...extra}
        />
      </Field>
    )

    const count =
      1 + (format.postalCode != null ? 1 : 0) + (format.region != null ? 1 : 0)
    const city = input("city", text.city, "address-level2")
    const postal =
      format.postalCode != null
        ? input("postalCode", format.postalCode, "postal-code", {
            inputMode: format.numericPostal ? "numeric" : "text",
            autoCapitalize: "characters",
          })
        : null
    const region =
      format.region != null
        ? input("region", format.region, "address-level1", {}, !format.regionOptional)
        : null

    return (
      <fieldset
        ref={ref}
        className={cx(
          "kg-address-form grid gap-3.5 min-w-0 m-0 p-0 border-0 text-kg-fg",
          className,
        )}
        data-country={value.country}
        {...props}
      >
        <legend
          className={
            showLegend
              ? "kg-address-form__legend p-0 mb-3.5 text-kg-md font-[650]"
              : "kg-address-form__legend kg-visually-hidden"
          }
        >
          {text.legend}
        </legend>
        <Field label={text.country} className="kg-address-form__field kg-address-form__field--country">
          <Select
            name={named("country")}
            value={value.country}
            onValueChange={set("country")}
            options={countries.map((country) => ({ value: country.code, label: country.label }))}
          />
        </Field>
        {input("name", text.name, "name")}
        {input("line1", text.line1, "address-line1")}
        {showLine2 ? (
          input("line2", text.line2, "address-line2", { ref: line2Ref }, false)
        ) : (
          <button
            type="button"
            className={cx(
              "kg-address-form__add justify-self-start -mt-1.5 p-0 border-0 rounded-kg-xs bg-transparent",
              "[font-family:inherit] text-kg-sm font-[550] text-kg-accent-strong cursor-pointer",
              "underline-offset-3 hover:underline",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            )}
            onClick={() => {
              setShowLine2(true)
              requestAnimationFrame(() => line2Ref.current?.focus())
            }}
          >
            + {text.addLine2}
          </button>
        )}
        <div
          className={cx(
            "kg-address-form__row grid gap-3",
            count === 3 && "grid-cols-3 max-[30rem]:grid-cols-2",
            count === 2 && "grid-cols-2 max-[30rem]:grid-cols-1",
            count === 1 && "grid-cols-1",
          )}
          data-count={count}
        >
          {format.postalFirst ? [postal, city, region] : [city, region, postal]}
        </div>
        {withPhone && input("phone", text.phone, "tel", { type: "tel", inputMode: "tel" }, false)}
      </fieldset>
    )
  },
)

AddressForm.displayName = "AddressForm"
