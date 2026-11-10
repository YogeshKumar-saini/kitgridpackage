"use client"

import { useCallback, useRef } from "react"
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js"

/** A stable function identity that always calls the latest `callback`. */
export const useEventCallback = <Args extends unknown[], Result>(
  callback: ((...args: Args) => Result) | undefined,
): ((...args: Args) => Result | undefined) => {
  const ref = useRef(callback)
  useIsomorphicLayoutEffect(() => {
    ref.current = callback
  })
  return useCallback((...args: Args) => ref.current?.(...args), [])
}
