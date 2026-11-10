import { act, fireEvent, render, screen } from "@testing-library/react"
import { SearchField } from "./search-field.js"

describe("SearchField", () => {
  afterEach(() => jest.useRealTimers())

  it("is a labelled searchbox that reports every keystroke", () => {
    const onValueChange = jest.fn()
    render(<SearchField label="Search products" onValueChange={onValueChange} />)
    const box = screen.getByRole("searchbox", { name: "Search products" })
    fireEvent.change(box, { target: { value: "lin" } })
    expect(onValueChange).toHaveBeenCalledWith("lin")
  })

  it("debounces onSearch and flushes a clear at once", () => {
    jest.useFakeTimers()
    const onSearch = jest.fn()
    render(<SearchField debounce={250} onSearch={onSearch} />)
    const box = screen.getByRole("searchbox")
    fireEvent.change(box, { target: { value: "l" } })
    fireEvent.change(box, { target: { value: "li" } })
    act(() => jest.advanceTimersByTime(200))
    expect(onSearch).not.toHaveBeenCalled()
    act(() => jest.advanceTimersByTime(60))
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith("li")
    act(() => {
      screen.getByRole("button", { name: "Clear search" }).click()
    })
    expect(onSearch).toHaveBeenLastCalledWith("")
  })

  it("empties on Escape without letting the key reach a surrounding dialog", () => {
    const outer = jest.fn()
    render(
      <div onKeyDown={outer}>
        <SearchField defaultValue="linen" />
      </div>,
    )
    const box = screen.getByRole("searchbox") as HTMLInputElement
    fireEvent.keyDown(box, { key: "Escape" })
    expect(box.value).toBe("")
    expect(outer).not.toHaveBeenCalled()
    fireEvent.keyDown(box, { key: "Escape" })
    expect(outer).toHaveBeenCalledTimes(1)
  })

  it("shows its shortcut and focuses on it from anywhere", () => {
    render(<SearchField shortcut={["/"]} />)
    const box = screen.getByRole("searchbox")
    expect(document.querySelector(".kg-search-field__kbd")).toHaveTextContent("/")
    fireEvent.keyDown(document.body, { key: "/" })
    expect(box).toHaveFocus()
  })
})
