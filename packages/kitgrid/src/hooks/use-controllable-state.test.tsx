import { act, renderHook } from "@testing-library/react"
import { useControllableState } from "./use-controllable-state.js"

describe("useControllableState", () => {
  it("owns state when uncontrolled", () => {
    const onChange = jest.fn()
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: 1, onChange }),
    )
    act(() => result.current[1]((value) => value + 1))
    expect(result.current[0]).toBe(2)
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it("defers to the parent when controlled", () => {
    const onChange = jest.fn()
    const { result } = renderHook(() =>
      useControllableState({ value: 5, defaultValue: 0, onChange }),
    )
    act(() => result.current[1](6))
    expect(result.current[0]).toBe(5)
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it("skips onChange when the value does not change", () => {
    const onChange = jest.fn()
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: "a", onChange }),
    )
    act(() => result.current[1]("a"))
    expect(onChange).not.toHaveBeenCalled()
  })
})
