import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { KanbanBoard, type KanbanBoardCard } from "./kanban-board.js"

const columns = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "Doing", limit: 1 },
  { id: "done", title: "Done" },
]
const cards: KanbanBoardCard[] = [
  { id: "a", column: "todo", title: "Write brief" },
  { id: "b", column: "todo", title: "Pick fonts" },
  { id: "c", column: "doing", title: "Ship v2" },
]

const titlesIn = (name: string) =>
  within(screen.getByRole("region", { name }))
    .queryAllByRole("button")
    .map((b) => b.textContent)

describe("KanbanBoard", () => {
  it("renders labelled columns with counts and limits", () => {
    render(<KanbanBoard columns={columns} defaultCards={cards} label="Sprint" />)
    expect(screen.getByRole("region", { name: "Sprint" })).toBeInTheDocument()
    expect(titlesIn("To do")).toEqual(["Write brief", "Pick fonts"])
    expect(screen.getByText("1/1")).not.toHaveAttribute("data-over")
    expect(screen.getAllByRole("button")[0]).toHaveAttribute(
      "aria-roledescription",
      "draggable card",
    )
  })

  it("moves a card with the keyboard and commits on drop", async () => {
    const user = userEvent.setup()
    const onCardsChange = jest.fn()
    render(<KanbanBoard columns={columns} defaultCards={cards} onCardsChange={onCardsChange} />)
    screen.getByRole("button", { name: "Write brief" }).focus()
    await user.keyboard(" ")
    expect(screen.getByRole("status")).toHaveTextContent("Picked up Write brief. To do, position 1 of 2.")
    await user.keyboard("{ArrowDown}")
    expect(titlesIn("To do")).toEqual(["Pick fonts", "Write brief"])
    await user.keyboard("{ArrowRight}")
    expect(titlesIn("Doing")).toContain("Write brief")
    expect(screen.getByRole("button", { name: "Write brief" })).toHaveFocus()
    expect(onCardsChange).not.toHaveBeenCalled()
    await user.keyboard(" ")
    expect(onCardsChange).toHaveBeenCalledTimes(1)
    const moved = onCardsChange.mock.calls[0]?.[0] as KanbanBoardCard[]
    expect(moved.find((c) => c.id === "a")?.column).toBe("doing")
    expect(screen.getByRole("status")).toHaveTextContent("Dropped Write brief in Doing")
    expect(screen.getByText("2/1")).toHaveAttribute("data-over", "true")
  })

  it("restores the original order on Escape", async () => {
    const user = userEvent.setup()
    render(<KanbanBoard columns={columns} defaultCards={cards} />)
    screen.getByRole("button", { name: "Pick fonts" }).focus()
    await user.keyboard(" {ArrowRight}{ArrowRight}")
    expect(titlesIn("Done")).toEqual(["Pick fonts"])
    await user.keyboard("{Escape}")
    expect(titlesIn("To do")).toEqual(["Write brief", "Pick fonts"])
    expect(screen.getByRole("status")).toHaveTextContent("Move cancelled")
  })
})
