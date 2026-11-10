import { type MutableRefObject, type Ref, type RefCallback, useCallback } from "react"

type PossibleRef<T> = Ref<T> | undefined

const assignRef = <T>(ref: PossibleRef<T>, value: T | null) => {
  if (typeof ref === "function") ref(value)
  else if (ref) (ref as MutableRefObject<T | null>).current = value
}

export const composeRefs =
  <T>(...refs: PossibleRef<T>[]): RefCallback<T> =>
  (node) => {
    for (const ref of refs) assignRef(ref, node)
  }

export const useComposedRefs = <T>(...refs: PossibleRef<T>[]): RefCallback<T> =>
  useCallback(composeRefs(...refs), refs)
