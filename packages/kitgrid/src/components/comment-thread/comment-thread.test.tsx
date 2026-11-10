import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CommentThread, type CommentThreadComment } from "./comment-thread.js"

const comments: CommentThreadComment[] = [
  {
    id: "c1",
    author: "Priya Raman",
    time: "2h",
    body: "Can we split revenue by region?",
    replies: [{ id: "c2", author: "Mateo Alvarez", time: "1h", body: "Done, check the second tab." }],
  },
]

describe("CommentThread", () => {
  it("nests replies under their parent and collapses them", async () => {
    const user = userEvent.setup()
    render(<CommentThread comments={comments} />)
    const parent = screen.getByRole("article", { name: "Priya Raman" })
    expect(parent).toBeInTheDocument()
    const reply = screen.getByRole("article", { name: "Mateo Alvarez" })
    const toggle = screen.getByRole("button", { name: "Hide 1 reply" })
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    await user.click(toggle)
    expect(reply).not.toBeVisible()
    expect(screen.getByRole("button", { name: "Show 1 reply" })).toHaveAttribute("aria-expanded", "false")
  })

  it("opens an inline composer and submits with the parent id", async () => {
    const user = userEvent.setup()
    const onReply = jest.fn()
    render(<CommentThread comments={comments} onReply={onReply} />)
    const parent = screen.getByRole("article", { name: "Priya Raman" })
    const replyButton = within(parent).getByRole("button", { name: "Reply" })
    await user.click(replyButton)
    const box = screen.getByRole("textbox", { name: "Reply to Priya Raman" })
    expect(box).toHaveFocus()
    await user.type(box, "Looks great")
    await user.click(within(parent).getByRole("button", { name: "Send" }))
    expect(onReply).toHaveBeenCalledWith("c1", "Looks great")
  })

  it("cancels on Escape and returns focus", async () => {
    const user = userEvent.setup()
    render(<CommentThread comments={comments} onReply={() => {}} />)
    const parent = screen.getByRole("article", { name: "Priya Raman" })
    const replyButton = within(parent).getByRole("button", { name: "Reply" })
    await user.click(replyButton)
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(replyButton).toHaveFocus()
  })
})
