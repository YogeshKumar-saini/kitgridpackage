"use client"

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

/*
 * @internal Lets nested modal surfaces know how many layers sit on top of them, so a parent can
 * recede (scale back, dim) while a child is open. Shared by ModalStack and NestedDrawer.
 */

interface StackLevelValue {
  depth: number
  /** Number of open layers stacked above this one. */
  above: number
  setChildAbove: (count: number) => void
}

const StackLevelContext = createContext<StackLevelValue | null>(null)

export const useStackLevel = (): StackLevelValue => {
  const context = useContext(StackLevelContext)
  if (!context) throw new Error("Stacked surfaces must be rendered inside their stack root.")
  return context
}

export const StackLevel = ({ open, children }: { open: boolean; children?: ReactNode }) => {
  const parent = useContext(StackLevelContext)
  const [above, setChildAbove] = useState(0)
  const depth = parent ? parent.depth + 1 : 0

  useEffect(() => {
    if (!parent) return
    parent.setChildAbove(open ? above + 1 : 0)
    return () => parent.setChildAbove(0)
  }, [open, above])

  const value = useMemo(() => ({ depth, above, setChildAbove }), [depth, above])
  return <StackLevelContext.Provider value={value}>{children}</StackLevelContext.Provider>
}
