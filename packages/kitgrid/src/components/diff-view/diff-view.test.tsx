import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { diffLines } from "./diff.js"
import { DiffView } from "./diff-view.js"

describe("diffLines", () => {
  it("finds the shortest line edit script", () => {
    const result = diffLines("a\nb\nc\nd", "a\nc\nd\ne")
    expect(result.map((l) => `${l.type[0]}${l.text}`)).toEqual(["ea", "rb", "ec", "ed", "ae"])
    expect(result[2]).toMatchObject({ oldNumber: 3, newNumber: 2 })
  })

  it("handles empty sides", () => {
    expect(diffLines("", "")).toEqual([])
    expect(diffLines("", "x\ny").every((l) => l.type === "add")).toBe(true)
    expect(diffLines("x", "").map((l) => l.type)).toEqual(["remove"])
  })

  it("round-trips: equal + add rebuild the new text", () => {
    const before = "one\ntwo\nthree\nfour\nfive"
    const after = "zero\none\nthree\n4\nfive\nsix"
    const result = diffLines(before, after)
    expect(result.filter((l) => l.type !== "remove").map((l) => l.text).join("\n")).toBe(after)
    expect(result.filter((l) => l.type !== "add").map((l) => l.text).join("\n")).toBe(before)
  })
})

describe("DiffView", () => {
  const before = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join("\n")
  const after = before.replace("line 6", "line six")

  it("labels changed lines in words and counts them", () => {
    render(<DiffView before={before} after={after} title="notes.txt" />)
    expect(screen.getByRole("table", { name: "Changes" })).toBeInTheDocument()
    expect(screen.getByText("added")).toBeInTheDocument()
    expect(screen.getByText("removed")).toBeInTheDocument()
    expect(screen.getByText("+1")).toBeInTheDocument()
  })

  it("folds unchanged lines and expands them on demand", async () => {
    const user = userEvent.setup()
    render(<DiffView before={before} after={after} context={1} />)
    expect(screen.queryByText("line 1")).toBeNull()
    await user.click(screen.getByRole("button", { name: "4 unchanged lines" }))
    expect(screen.getByText("line 1")).toBeInTheDocument()
  })

  it("aligns removals and additions side by side in split mode", () => {
    const { container } = render(<DiffView before={"a\nb"} after={"a\nc"} mode="split" />)
    const rows = container.querySelectorAll("tbody tr")
    expect(rows).toHaveLength(2)
    expect(rows[1]?.querySelectorAll('[data-type="remove"]').length).toBeGreaterThan(0)
    expect(rows[1]?.querySelectorAll('[data-type="add"]').length).toBeGreaterThan(0)
  })
})
