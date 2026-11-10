import {
  Children,
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  version,
} from "react"
import { composeRefs } from "../utils/compose-refs.js"
import { mergeProps } from "../utils/merge-props.js"

const major = Number.parseInt(version, 10)

// React 19 moved `ref` onto props; reading `element.ref` there logs a deprecation warning.
const getElementRef = (element: ReactElement): Ref<unknown> | undefined =>
  major >= 19
    ? (element.props as { ref?: Ref<unknown> }).ref
    : (element as unknown as { ref?: Ref<unknown> }).ref

export interface SlotProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode
}

/** Renders its only child with the slot's props merged in. Powers every `asChild` prop. */
export const Slot = forwardRef<HTMLElement, SlotProps>(
  ({ children, ...props }, ref) => {
    const child = Children.only(children)
    if (!isValidElement(child)) return null
    return cloneElement(child, {
      ...mergeProps(props, child.props as Record<string, unknown>),
      ref: composeRefs(ref, getElementRef(child)),
    } as Record<string, unknown>)
  },
)

Slot.displayName = "Slot"
