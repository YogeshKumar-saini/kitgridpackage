"use client"

import { type SetStateAction, useCallback, useRef, useState } from "react"
import { useEventCallback } from "./use-event-callback.js"

export interface ControllableStateOptions<T> {
  value?: T | undefined
  defaultValue: T
  onChange?: ((value: T) => void) | undefined
}

/** State that is owned by the parent when `value` is defined and by the component otherwise. */
export const useControllableState = <T>({
  value,
  defaultValue,
  onChange,
}: ControllableStateOptions<T>): readonly [T, (next: SetStateAction<T>) => void] => {
  const [internal, setInternal] = useState(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : internal
  const latest = useRef(current)
  latest.current = current
  const emit = useEventCallback(onChange)

  const setValue = useCallback(
    (next: SetStateAction<T>) => {
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(latest.current) : next
      if (Object.is(resolved, latest.current)) return
      latest.current = resolved
      if (!controlled) setInternal(resolved)
      emit(resolved)
    },
    [controlled, emit],
  )

  return [current, setValue] as const
}
