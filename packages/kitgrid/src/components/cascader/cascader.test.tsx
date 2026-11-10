import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Cascader, type CascaderOption } from "./cascader.js"

beforeAll(() => {
  const style = document.createElement("style")
  style.textContent = "[popover] { display: block !important; }"
  document.head.append(style)
})

const regions: CascaderOption[] = [
  {
    value: "jp",
    label: "Japan",
    children: [
      { value: "tokyo", label: "Tokyo", children: [{ value: "shibuya", label: "Shibuya" }] },
      { value: "osaka", label: "Osaka" },
    ],
  },
  { value: "pt", label: "Portugal", children: [{ value: "porto", label: "Porto" }] },
]

describe("Cascader", () => {
  it("opens the first column with focus on its first option", async () => {
    render(<Cascader aria-label="Region" options={regions} />)
    await userEvent.click(screen.getByRole("button", { name: /^Region/ }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Japan" })).toHaveFocus()
    expect(screen.getAllByRole("listbox")).toHaveLength(1)
  })

  it("drills in with ArrowRight, back with ArrowLeft and picks with Enter", async () => {
    const onValueChange = jest.fn()
    render(<Cascader aria-label="Region" options={regions} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("button"))
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getAllByRole("listbox")).toHaveLength(2)
    expect(screen.getByRole("option", { name: "Tokyo" })).toHaveFocus()
    await userEvent.keyboard("{ArrowLeft}")
    expect(screen.getByRole("option", { name: "Japan" })).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}{ArrowDown}{Enter}")
    expect(onValueChange).toHaveBeenCalledWith(["jp", "osaka"])
    expect(screen.getByRole("button", { name: /^Region/ })).toHaveTextContent("Japan / Osaka")
    expect(screen.getByRole("button", { name: /^Region/ })).toHaveFocus()
  })

  it("opens branches on click and picks a leaf", async () => {
    const onValueChange = jest.fn()
    render(<Cascader aria-label="Region" options={regions} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("button"))
    await userEvent.click(screen.getByRole("option", { name: "Portugal" }))
    await userEvent.click(screen.getByRole("option", { name: "Porto" }))
    expect(onValueChange).toHaveBeenCalledWith(["pt", "porto"])
  })

  it("can pick a branch when allowed", async () => {
    const onValueChange = jest.fn()
    render(
      <Cascader aria-label="Region" options={regions} selectBranches onValueChange={onValueChange} />,
    )
    await userEvent.click(screen.getByRole("button"))
    await userEvent.keyboard("{Enter}")
    expect(onValueChange).toHaveBeenCalledWith(["jp"])
  })
})
